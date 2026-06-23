from __future__ import annotations

import hashlib
import heapq
import math
import os
import time
from typing import Any

import httpx
from fastapi import HTTPException
from pydantic import BaseModel


OSRM_DRIVING_BASE_URL = os.getenv("OSRM_DRIVING_BASE_URL", "http://router.project-osrm.org")
OSRM_HIKING_BASE_URL = os.getenv("OSRM_HIKING_BASE_URL")
OSRM_TIMEOUT_SECONDS = 30
TRAIL_CACHE_TTL_SECONDS = 900
TRAIL_MAX_BBOX_AREA_DEGREES = 0.5
HIKING_ROUTE_MAX_BBOX_AREA_DEGREES = 0.75
HIKING_ROUTE_SNAP_LIMIT_METERS = 1_500
TRAIL_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
TRAIL_ERROR_CACHE: dict[str, tuple[float, str]] = {}


class CoordinateRequest(BaseModel):
    lat: float
    lon: float


class RouteBuildRequest(BaseModel):
    points: list[CoordinateRequest]
    profile: str = "driving"


class TrailRequest(BaseModel):
    south: float
    west: float
    north: float
    east: float


def validate_coordinate(point: CoordinateRequest) -> None:
    if not -90 <= point.lat <= 90 or not -180 <= point.lon <= 180:
        raise HTTPException(status_code=400, detail="Ogiltig koordinat.")


def osrm_profile(profile: str) -> tuple[str, str, str]:
    if profile == "driving":
        return OSRM_DRIVING_BASE_URL, "driving", "OSRM driving"
    if profile == "hiking":
        if not OSRM_HIKING_BASE_URL:
            raise HTTPException(
                status_code=503,
                detail="Hiking OSRM är inte konfigurerad; använd OSM trail fallback i stället.",
            )
        return OSRM_HIKING_BASE_URL, "foot", "OSRM foot/hiking"
    raise HTTPException(status_code=400, detail="Okänd routingprofil.")


async def route_between_points(
    payload: RouteBuildRequest,
    overpass_urls: list[str] | None = None,
    headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    if len(payload.points) < 2:
        raise HTTPException(status_code=400, detail="Minst två punkter krävs för routing.")
    if len(payload.points) > 25:
        raise HTTPException(status_code=400, detail="Max 25 punkter kan routas åt gången.")

    for point in payload.points:
        validate_coordinate(point)

    if payload.profile == "hiking" and not OSRM_HIKING_BASE_URL:
        return await route_hiking_with_overpass(payload, overpass_urls or [], headers or {})

    base_url, profile, source = osrm_profile(payload.profile)
    coordinates = ";".join(f"{point.lon:.6f},{point.lat:.6f}" for point in payload.points)
    url = (
        f"{base_url.rstrip('/')}/route/v1/{profile}/{coordinates}"
        "?overview=full&geometries=geojson&steps=false&alternatives=false"
    )

    try:
        async with httpx.AsyncClient(timeout=OSRM_TIMEOUT_SECONDS) as client:
            response = await client.get(url)
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=502, detail="Routingmotorn hann inte svara.") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Kunde inte ansluta till routingmotorn.") from exc

    if response.status_code >= 400:
        detail = osrm_error_detail(response, payload.profile)
        raise HTTPException(status_code=502, detail=detail)

    data = response.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        message = data.get("message") or data.get("code") or "Ingen rutt hittades."
        raise HTTPException(status_code=502, detail=f"Routing misslyckades: {message}")

    route = data["routes"][0]
    geometry = route.get("geometry", {}).get("coordinates", [])
    if len(geometry) < 2:
        raise HTTPException(status_code=502, detail="Routingmotorn returnerade ingen användbar linje.")

    return {
        "profile": payload.profile,
        "source": source,
        "coordinates": [[lat, lon] for lon, lat in geometry],
        "distanceMeters": round(float(route.get("distance", 0))),
        "durationSeconds": round(float(route.get("duration", 0))),
    }


def osrm_error_detail(response: httpx.Response, requested_profile: str) -> str:
    try:
        payload = response.json()
    except ValueError:
        payload = {}

    message = payload.get("message") or payload.get("code") or response.text[:160]
    if requested_profile == "hiking":
        return (
            "Vandringsrouting är inte tillgänglig från vald OSRM-server. "
            "Konfigurera OSRM_HIKING_BASE_URL med en foot/hiking-profil. "
            f"Tekniskt fel: {message}"
        )
    return f"Routingmotorn svarade med HTTP {response.status_code}: {message}"


async def route_hiking_with_overpass(
    payload: RouteBuildRequest,
    overpass_urls: list[str],
    headers: dict[str, str],
) -> dict[str, Any]:
    bbox = route_points_bbox(payload.points, padding_degrees=0.025)
    if bbox_area(bbox) > HIKING_ROUTE_MAX_BBOX_AREA_DEGREES:
        raise HTTPException(
            status_code=400,
            detail="Hikingsegmentet är för långt för lokal led-routing. Lägg fler waypoints närmare varandra.",
        )

    try:
        elements = await fetch_hiking_route_elements(bbox, overpass_urls, headers)
    except HTTPException as exc:
        return provisional_hiking_route(
            payload.points[0],
            payload.points[-1],
            "Trail network sync timed out; using provisional straight hiking segment.",
        )

    graph = build_trail_graph(elements)
    if not graph["nodes"]:
        return provisional_hiking_route(
            payload.points[0],
            payload.points[-1],
            "No routable hiking trail was found nearby; using provisional straight hiking segment.",
        )

    start = [payload.points[0].lat, payload.points[0].lon]
    end = [payload.points[-1].lat, payload.points[-1].lon]
    start_key, start_snap = nearest_graph_node(start, graph["nodes"])
    end_key, end_snap = nearest_graph_node(end, graph["nodes"])
    if start_snap > HIKING_ROUTE_SNAP_LIMIT_METERS or end_snap > HIKING_ROUTE_SNAP_LIMIT_METERS:
        return provisional_hiking_route(
            payload.points[0],
            payload.points[-1],
            "Could not snap points to a hiking trail; using provisional straight hiking segment.",
        )

    route_keys, distance_meters = shortest_path(start_key, end_key, graph["edges"])
    if not route_keys:
        return provisional_hiking_route(
            payload.points[0],
            payload.points[-1],
            "No connected hiking trail was found between the points; using provisional straight hiking segment.",
        )

    coordinates = [start] + [graph["nodes"][key] for key in route_keys] + [end]
    coordinates = dedupe_coordinates(coordinates)
    snap_distance = start_snap + end_snap
    total_distance = distance_meters + snap_distance

    return {
        "profile": "hiking",
        "source": "OpenStreetMap trail network fallback",
        "coordinates": coordinates,
        "distanceMeters": round(total_distance),
        "durationSeconds": round(total_distance / 1.25),
        "warning": "Hiking route uses OSM trail/path fallback.",
    }


async def fetch_hiking_route_elements(
    bbox: dict[str, float],
    overpass_urls: list[str],
    headers: dict[str, str],
) -> list[dict[str, Any]]:
    if not overpass_urls:
        raise HTTPException(status_code=502, detail="Overpass API är inte konfigurerat för hiking-routing.")

    query = build_hiking_route_query(bbox)
    errors: list[str] = []
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        for url in overpass_urls:
            try:
                response = await client.post(url, data={"data": query})
                if response.status_code >= 400:
                    errors.append(f"{url} HTTP {response.status_code}: {response.text[:160]}")
                    continue
                return response.json().get("elements", [])
            except (httpx.HTTPError, ValueError) as exc:
                errors.append(f"{url}: {type(exc).__name__}: {exc}")
                continue

    detail = "Kunde inte hämta lednät för hiking-routing från Overpass API."
    if errors:
        detail = f"{detail} {' | '.join(errors[:2])}"
    raise HTTPException(status_code=502, detail=detail)


def build_hiking_route_query(bbox: dict[str, float]) -> str:
    area = f"({bbox['south']:.6f},{bbox['west']:.6f},{bbox['north']:.6f},{bbox['east']:.6f})"
    return f"""
    [out:json][timeout:25];
    (
      way["route"~"^(hiking|foot)$"]{area};
      way["osmc:symbol"]{area};
      way["sac_scale"]{area};
      way["trail_visibility"]{area};
    );
    out tags geom;
    """


def provisional_hiking_route(
    start: CoordinateRequest,
    end: CoordinateRequest,
    warning: str,
) -> dict[str, Any]:
    coordinates = [[start.lat, start.lon], [end.lat, end.lon]]
    distance = haversine_distance_meters(coordinates[0], coordinates[1])
    return {
        "profile": "hiking",
        "source": "Provisional hiking fallback",
        "coordinates": coordinates,
        "distanceMeters": round(distance),
        "durationSeconds": round(distance / 1.25),
        "warning": warning,
    }


def build_trail_graph(elements: list[dict[str, Any]]) -> dict[str, Any]:
    nodes: dict[str, list[float]] = {}
    edges: dict[str, list[tuple[str, float]]] = {}

    for element in elements:
        for coordinates in trail_geometries(element):
            previous_key: str | None = None
            previous_coordinate: list[float] | None = None
            for coordinate in coordinates:
                key = graph_node_key(coordinate)
                nodes[key] = coordinate
                edges.setdefault(key, [])
                if previous_key and previous_coordinate:
                    distance = haversine_distance_meters(previous_coordinate, coordinate)
                    edges[previous_key].append((key, distance))
                    edges[key].append((previous_key, distance))
                previous_key = key
                previous_coordinate = coordinate

    return {"nodes": nodes, "edges": edges}


def nearest_graph_node(point: list[float], nodes: dict[str, list[float]]) -> tuple[str, float]:
    nearest_key = ""
    nearest_distance = math.inf
    for key, coordinate in nodes.items():
        distance = haversine_distance_meters(point, coordinate)
        if distance < nearest_distance:
            nearest_key = key
            nearest_distance = distance
    return nearest_key, nearest_distance


def shortest_path(
    start_key: str,
    end_key: str,
    edges: dict[str, list[tuple[str, float]]],
) -> tuple[list[str], float]:
    queue: list[tuple[float, str]] = [(0, start_key)]
    distances: dict[str, float] = {start_key: 0}
    previous: dict[str, str] = {}
    visited: set[str] = set()

    while queue:
        distance, key = heapq.heappop(queue)
        if key in visited:
            continue
        visited.add(key)
        if key == end_key:
            break
        for next_key, edge_distance in edges.get(key, []):
            next_distance = distance + edge_distance
            if next_distance < distances.get(next_key, math.inf):
                distances[next_key] = next_distance
                previous[next_key] = key
                heapq.heappush(queue, (next_distance, next_key))

    if end_key not in distances:
        return [], 0

    path = [end_key]
    while path[-1] != start_key:
        path.append(previous[path[-1]])
    path.reverse()
    return path, distances[end_key]


def route_points_bbox(points: list[CoordinateRequest], padding_degrees: float) -> dict[str, float]:
    south = min(point.lat for point in points) - padding_degrees
    north = max(point.lat for point in points) + padding_degrees
    west = min(point.lon for point in points) - padding_degrees
    east = max(point.lon for point in points) + padding_degrees
    return {
        "south": max(south, -90),
        "west": max(west, -180),
        "north": min(north, 90),
        "east": min(east, 180),
    }


def graph_node_key(coordinate: list[float]) -> str:
    return f"{coordinate[0]:.6f},{coordinate[1]:.6f}"


def dedupe_coordinates(coordinates: list[list[float]]) -> list[list[float]]:
    deduped: list[list[float]] = []
    for coordinate in coordinates:
        if deduped and coordinate_distance_is_zero(deduped[-1], coordinate):
            continue
        deduped.append(coordinate)
    return deduped


def coordinate_distance_is_zero(a: list[float], b: list[float]) -> bool:
    return abs(a[0] - b[0]) < 0.0000001 and abs(a[1] - b[1]) < 0.0000001


async def fetch_hiking_trails(payload: TrailRequest, overpass_urls: list[str], headers: dict[str, str]) -> dict[str, Any]:
    bbox = normalize_bbox(payload)
    area = bbox_area(bbox)
    if area > TRAIL_MAX_BBOX_AREA_DEGREES:
        return {
            "trails": [],
            "source": "OpenStreetMap Overpass",
            "cached": False,
            "status": "skipped",
            "warning": "Zooma in för att visa vandringsleder.",
        }

    cache_key = trail_cache_key(bbox)
    cached = TRAIL_CACHE.get(cache_key)
    now = time.monotonic()
    if cached and now - cached[0] < TRAIL_CACHE_TTL_SECONDS:
        return {"trails": cached[1], "source": "OpenStreetMap Overpass", "cached": True, "status": "ok"}
    cached_error = TRAIL_ERROR_CACHE.get(cache_key)
    if cached_error and now - cached_error[0] < 60:
        return {
            "trails": [],
            "source": "OpenStreetMap Overpass",
            "cached": True,
            "status": "unavailable",
            "warning": cached_error[1],
        }

    query = build_trail_query(bbox)
    errors: list[str] = []
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        for url in overpass_urls:
            try:
                response = await client.post(url, data={"data": query})
                if response.status_code >= 400:
                    errors.append(f"{url} HTTP {response.status_code}: {response.text[:160]}")
                    continue
                payload_data = response.json()
                trails = parse_trail_elements(payload_data.get("elements", []))
                TRAIL_CACHE[cache_key] = (now, trails)
                return {
                    "trails": trails,
                    "source": "OpenStreetMap Overpass",
                    "cached": False,
                    "status": "ok",
                }
            except (httpx.HTTPError, ValueError) as exc:
                errors.append(f"{url}: {type(exc).__name__}: {exc}")
                continue

    warning = "Kunde inte hämta vandringsleder från Overpass API."
    if errors:
        warning = f"{warning} {' | '.join(errors[:2])}"
    TRAIL_ERROR_CACHE[cache_key] = (now, warning)
    return {
        "trails": [],
        "source": "OpenStreetMap Overpass",
        "cached": False,
        "status": "unavailable",
        "warning": warning,
    }


def normalize_bbox(payload: TrailRequest) -> dict[str, float]:
    south = max(min(payload.south, payload.north), -90)
    north = min(max(payload.south, payload.north), 90)
    west = max(min(payload.west, payload.east), -180)
    east = min(max(payload.west, payload.east), 180)
    if south == north or west == east:
        raise HTTPException(status_code=400, detail="Ogiltigt kartutsnitt.")

    return {"south": south, "west": west, "north": north, "east": east}


def build_trail_query(bbox: dict[str, float]) -> str:
    area = f"({bbox['south']:.6f},{bbox['west']:.6f},{bbox['north']:.6f},{bbox['east']:.6f})"
    return f"""
    [out:json][timeout:25];
    (
      relation["route"~"^(hiking|foot)$"]{area};
      way["route"~"^(hiking|foot)$"]{area};
      way["osmc:symbol"]{area};
      way["sac_scale"]{area};
      way["trail_visibility"]{area};
    );
    out tags geom;
    """


def parse_trail_elements(elements: list[dict[str, Any]]) -> list[dict[str, Any]]:
    trails: list[dict[str, Any]] = []
    seen: set[str] = set()
    for element in elements:
        tags = element.get("tags", {})
        trail_id = f"{element.get('type', 'way')}-{element.get('id')}"
        for index, coordinates in enumerate(trail_geometries(element)):
            if len(coordinates) < 2:
                continue
            segment_id = f"{trail_id}-{index}"
            if segment_id in seen:
                continue
            seen.add(segment_id)
            trails.append(
                {
                    "id": segment_id,
                    "name": tags.get("name") or tags.get("ref") or "Vandringsled",
                    "coordinates": coordinates,
                    "tags": {
                        key: tags[key]
                        for key in ("name", "ref", "operator", "network", "route", "highway", "sac_scale", "trail_visibility")
                        if key in tags
                    },
                }
            )
    return trails[:250]


def bbox_area(bbox: dict[str, float]) -> float:
    return abs(bbox["north"] - bbox["south"]) * abs(bbox["east"] - bbox["west"])


def trail_geometries(element: dict[str, Any]) -> list[list[list[float]]]:
    geometries: list[list[list[float]]] = []
    if element.get("geometry"):
        geometries.append(coordinates_from_geometry(element["geometry"]))

    for member in element.get("members", []) or []:
        if member.get("geometry"):
            geometries.append(coordinates_from_geometry(member["geometry"]))

    return [coordinates for coordinates in geometries if len(coordinates) >= 2]


def coordinates_from_geometry(geometry: list[dict[str, Any]]) -> list[list[float]]:
    return [
        [float(point["lat"]), float(point["lon"])]
        for point in geometry
        if "lat" in point and "lon" in point
    ]


def trail_cache_key(bbox: dict[str, float]) -> str:
    rounded = ",".join(f"{bbox[key]:.4f}" for key in ("south", "west", "north", "east"))
    return hashlib.sha256(rounded.encode("utf-8")).hexdigest()


def haversine_distance_meters(a: list[float], b: list[float]) -> float:
    radius = 6_371_000
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    d_lat = lat2 - lat1
    d_lon = lon2 - lon1
    value = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))
