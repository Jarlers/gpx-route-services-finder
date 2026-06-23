from __future__ import annotations

import hashlib
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
                detail=(
                    "Vandringsrouting kräver OSRM_HIKING_BASE_URL med en foot/hiking-profil. "
                    "Led-overlay kan fortfarande visas, men automatisk routing längs led kräver en konfigurerad hikingmotor."
                ),
            )
        return OSRM_HIKING_BASE_URL, "foot", "OSRM foot/hiking"
    raise HTTPException(status_code=400, detail="Okänd routingprofil.")


async def route_between_points(payload: RouteBuildRequest) -> dict[str, Any]:
    if len(payload.points) < 2:
        raise HTTPException(status_code=400, detail="Minst två punkter krävs för routing.")
    if len(payload.points) > 25:
        raise HTTPException(status_code=400, detail="Max 25 punkter kan routas åt gången.")

    for point in payload.points:
        validate_coordinate(point)

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


async def fetch_hiking_trails(payload: TrailRequest, overpass_urls: list[str], headers: dict[str, str]) -> dict[str, Any]:
    bbox = normalize_bbox(payload)
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

    area = abs(north - south) * abs(east - west)
    if area > 2.5:
        raise HTTPException(status_code=400, detail="Zooma in för att visa vandringsleder.")

    return {"south": south, "west": west, "north": north, "east": east}


def build_trail_query(bbox: dict[str, float]) -> str:
    area = f"({bbox['south']:.6f},{bbox['west']:.6f},{bbox['north']:.6f},{bbox['east']:.6f})"
    return f"""
    [out:json][timeout:25];
    (
      relation["route"~"^(hiking|foot)$"]{area};
      way(r);
      way["highway"~"^(path|footway|track|steps|bridleway)$"]["osmc:symbol"]{area};
      way["highway"~"^(path|footway|track)$"]["sac_scale"]{area};
      way["highway"~"^(path|footway|track)$"]["trail_visibility"]{area};
      way["highway"~"^(path|footway|track)$"]["name"]{area};
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
