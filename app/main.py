from __future__ import annotations

import json
import logging
import math
import asyncio
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from shapely.geometry import LineString, Point
from shapely.ops import substring, transform


DEFAULT_SEARCH_RADIUS_METERS = 5_000
ALLOWED_SEARCH_RADII_KM = {2, 5, 10, 20}
DEFAULT_STAGE_LENGTH_KM = 250
MAX_ANALYSIS_SEGMENT_KM = 350
SEARCH_POINT_SPACING_METERS = 10_000
MAX_SEARCH_POINTS = 200
OVERPASS_BATCH_SIZE = 12
OVERPASS_CONCURRENCY = 1
OVERPASS_CACHE_TTL_SECONDS = 1_800
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
]
OVERPASS_HEADERS = {"User-Agent": "gpx-route-services/0.1 (local FastAPI app)"}
OVERPASS_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
logger = logging.getLogger("gpx-route-services")


app = FastAPI(title="GPX Route Services")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


class AnalyzeJsonRequest(BaseModel):
    gpxText: str
    radiusKm: int = 5
    stageKm: int = DEFAULT_STAGE_LENGTH_KM
    startKm: float = 0


@dataclass(frozen=True)
class RouteData:
    coordinates: list[tuple[float, float]]
    line_wgs84: LineString
    line_metric: LineString
    to_metric: "LocalProjection"
    to_wgs84: "LocalProjection"
    route_offset_meters: float = 0


@dataclass(frozen=True)
class LocalProjection:
    origin_lon: float
    origin_lat: float
    inverse: bool = False

    @property
    def meters_per_degree_lon(self) -> float:
        return 111_320 * max(math.cos(math.radians(self.origin_lat)), 0.1)

    def transform(self, x: float, y: float) -> tuple[float, float]:
        if not self.inverse:
            return (
                (x - self.origin_lon) * self.meters_per_degree_lon,
                (y - self.origin_lat) * 111_320,
            )
        return (
            self.origin_lon + x / self.meters_per_degree_lon,
            self.origin_lat + y / 111_320,
        )


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/analyze")
async def analyze_route(
    file: UploadFile = File(...),
    radiusKm: int = Form(5),
    stageKm: int = Form(DEFAULT_STAGE_LENGTH_KM),
    startKm: float = Form(0),
) -> dict[str, Any]:
    try:
        if not file.filename or not file.filename.lower().endswith(".gpx"):
            raise HTTPException(status_code=400, detail="Ladda upp en GPX-fil.")

        content = await file.read()
        return await analyze_gpx_content(content, radiusKm, stageKm, startKm)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Multipart GPX analysis failed")
        raise HTTPException(status_code=500, detail=f"Serverfel vid GPX-analys: {type(exc).__name__}: {exc}") from exc


@app.post("/api/analyze-json")
async def analyze_route_json(payload: AnalyzeJsonRequest) -> dict[str, Any]:
    try:
        return await analyze_gpx_content(
            payload.gpxText,
            payload.radiusKm,
            payload.stageKm,
            payload.startKm,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("JSON GPX analysis failed")
        raise HTTPException(status_code=500, detail=f"Serverfel vid GPX-analys: {type(exc).__name__}: {exc}") from exc


async def analyze_gpx_content(
    content: bytes | str,
    radius_km: int,
    stage_km: int,
    start_km: float,
) -> dict[str, Any]:
    if radius_km not in ALLOWED_SEARCH_RADII_KM:
        raise HTTPException(status_code=400, detail="Välj sökradie 2, 5, 10 eller 20 km.")
    if stage_km < 50 or stage_km > 1_000:
        raise HTTPException(status_code=400, detail="Dagsetapp måste vara mellan 50 och 1000 km.")
    if start_km < 0:
        raise HTTPException(status_code=400, detail="Startposition kan inte vara negativ.")
    if not content:
        raise HTTPException(status_code=400, detail="GPX-filen är tom.")

    radius_meters = radius_km * 1_000
    full_route = parse_gpx(content)
    total_length_meters = full_route.line_metric.length
    start_meters = start_km * 1_000
    if start_meters >= total_length_meters:
        raise HTTPException(status_code=400, detail="Det finns ingen återstående rutt att analysera.")

    segment_end_meters = min(start_meters + MAX_ANALYSIS_SEGMENT_KM * 1_000, total_length_meters)
    route = route_segment(full_route, start_meters, segment_end_meters)
    bbox = buffered_bbox(route.coordinates, radius_meters)
    osm_elements = await fetch_osm_elements(route, radius_meters)
    places = filter_places_near_route(osm_elements, route, radius_meters)
    stages = build_stage_suggestions(route, places, stage_km, radius_meters)
    has_more_segments = segment_end_meters < total_length_meters

    return {
        "route": [[lat, lon] for lon, lat in route.coordinates],
        "bounds": bbox,
        "radiusMeters": radius_meters,
        "stageKm": stage_km,
        "routeLengthMeters": round(total_length_meters),
        "segment": {
            "startMeters": round(start_meters),
            "endMeters": round(segment_end_meters),
            "lengthMeters": round(segment_end_meters - start_meters),
            "maxLengthMeters": MAX_ANALYSIS_SEGMENT_KM * 1_000,
            "hasMore": has_more_segments,
            "nextStartKm": round(segment_end_meters / 1_000, 3) if has_more_segments else None,
        },
        "places": places,
        "stages": stages,
    }


def parse_gpx(content: bytes | str) -> RouteData:
    try:
        if isinstance(content, bytes):
            raw_content = content
            text = content.decode("utf-8-sig")
        else:
            text = content.lstrip("\ufeff")
            raw_content = text.encode("utf-8")

        coordinates = parse_gpx_coordinates_with_elementtree(raw_content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Kunde inte läsa GPX-filen.") from exc

    return route_data_from_coordinates(coordinates)


def parse_gpx_coordinates_with_elementtree(content: bytes) -> list[tuple[float, float]]:
    root = ET.fromstring(content)
    coordinates: list[tuple[float, float]] = []

    for element in root.iter():
        tag_name = element.tag.rsplit("}", 1)[-1]
        if tag_name not in {"trkpt", "rtept"}:
            continue
        lat = element.attrib.get("lat")
        lon = element.attrib.get("lon")
        if lat is None or lon is None:
            continue
        coordinates.append((float(lon), float(lat)))

    if len(coordinates) < 2:
        raise HTTPException(status_code=400, detail="GPX-filen måste innehålla minst två punkter.")

    return coordinates


def route_data_from_coordinates(coordinates: list[tuple[float, float]]) -> RouteData:
    line_wgs84 = LineString(coordinates)
    to_metric = local_projection(coordinates)
    to_wgs84 = LocalProjection(
        origin_lon=to_metric.origin_lon,
        origin_lat=to_metric.origin_lat,
        inverse=True,
    )
    line_metric = transform(to_metric.transform, line_wgs84)

    return RouteData(
        coordinates=coordinates,
        line_wgs84=line_wgs84,
        line_metric=line_metric,
        to_metric=to_metric,
        to_wgs84=to_wgs84,
    )


def route_segment(route: RouteData, start_meters: float, end_meters: float) -> RouteData:
    segment_metric = substring(route.line_metric, start_meters, end_meters)
    if segment_metric.geom_type != "LineString" or len(segment_metric.coords) < 2:
        raise HTTPException(status_code=400, detail="Kunde inte skapa ruttsegmentet.")

    segment_wgs84 = transform(route.to_wgs84.transform, segment_metric)
    coordinates = [(lon, lat) for lon, lat in segment_wgs84.coords]

    return RouteData(
        coordinates=coordinates,
        line_wgs84=segment_wgs84,
        line_metric=segment_metric,
        to_metric=route.to_metric,
        to_wgs84=route.to_wgs84,
        route_offset_meters=start_meters,
    )


def local_projection(coordinates: list[tuple[float, float]]) -> LocalProjection:
    avg_lon = sum(lon for lon, _ in coordinates) / len(coordinates)
    avg_lat = sum(lat for _, lat in coordinates) / len(coordinates)
    return LocalProjection(origin_lon=avg_lon, origin_lat=avg_lat)


def buffered_bbox(
    coordinates: list[tuple[float, float]],
    radius_meters: int,
) -> dict[str, float]:
    lons = [lon for lon, _ in coordinates]
    lats = [lat for _, lat in coordinates]

    min_lat = min(lats)
    max_lat = max(lats)
    min_lon = min(lons)
    max_lon = max(lons)

    lat_padding = radius_meters / 111_320
    center_lat = (min_lat + max_lat) / 2
    lon_padding = radius_meters / (111_320 * max(math.cos(math.radians(center_lat)), 0.1))

    return {
        "south": max(min_lat - lat_padding, -90),
        "west": max(min_lon - lon_padding, -180),
        "north": min(max_lat + lat_padding, 90),
        "east": min(max_lon + lon_padding, 180),
    }


async def fetch_osm_elements(route: RouteData, radius_meters: int) -> list[dict[str, Any]]:
    search_points = route_search_points(route, radius_meters)
    elements_by_key: dict[tuple[str, int], dict[str, Any]] = {}

    try:
        async with httpx.AsyncClient(timeout=45, headers=OVERPASS_HEADERS) as client:
            semaphore = asyncio.Semaphore(OVERPASS_CONCURRENCY)
            queries = [
                build_overpass_query(batch, radius_meters)
                for batch in batched(search_points, OVERPASS_BATCH_SIZE)
            ]
            payloads = await asyncio.gather(
                *(fetch_overpass_payload(client, query, semaphore) for query in queries)
            )
            for payload in payloads:
                for element in payload.get("elements", []):
                    element_id = element.get("id")
                    if element_id is None:
                        continue
                    elements_by_key[(element.get("type", "unknown"), int(element_id))] = element
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=502,
            detail="Overpass API hann inte svara. Prova igen eller testa med en kortare GPX-rutt.",
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Kunde inte ansluta till OpenStreetMap Overpass API. Kontrollera internetanslutningen och försök igen.",
        ) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Overpass API gav ett ogiltigt svar.") from exc

    return list(elements_by_key.values())


async def fetch_overpass_payload(
    client: httpx.AsyncClient,
    query: str,
    semaphore: asyncio.Semaphore,
) -> dict[str, Any]:
    cached = OVERPASS_CACHE.get(query)
    now = time.monotonic()
    if cached and now - cached[0] < OVERPASS_CACHE_TTL_SECONDS:
        return {"elements": cached[1]}

    async with semaphore:
        response = await post_overpass_query(client, query)
        payload = response.json()

    elements = payload.get("elements", [])
    OVERPASS_CACHE[query] = (now, elements)
    return {"elements": elements}


async def post_overpass_query(client: httpx.AsyncClient, query: str) -> httpx.Response:
    last_status: int | None = None
    last_error: httpx.HTTPError | None = None
    retry_after_seconds = 0.0

    for attempt in range(3):
        for url in OVERPASS_URLS:
            try:
                response = await client.post(url, data={"data": query})
            except httpx.HTTPError as exc:
                last_error = exc
                continue

            if response.status_code in {429, 502, 503, 504}:
                last_status = response.status_code
                retry_after_seconds = max(retry_after_seconds, retry_after(response))
                continue

            if response.status_code >= 400:
                raise HTTPException(
                    status_code=502,
                    detail=f"Overpass API svarade med HTTP {response.status_code}. Försök igen eller använd en kortare rutt.",
                )

            return response

        if attempt < 2:
            await asyncio.sleep(max(retry_after_seconds, 2.5 + attempt * 2.5))

    if last_status == 429:
        raise HTTPException(
            status_code=502,
            detail="Alla Overpass-servrar är tillfälligt upptagna. Försök igen om en stund eller testa en kortare rutt.",
        )

    if last_status is not None:
        raise HTTPException(
            status_code=502,
            detail=f"Overpass API är tillfälligt otillgängligt (HTTP {last_status}). Försök igen om en stund.",
        )

    raise HTTPException(
        status_code=502,
        detail="Kunde inte ansluta till någon Overpass-server. Kontrollera internetanslutningen och försök igen.",
    ) from last_error


def retry_after(response: httpx.Response) -> float:
    header = response.headers.get("retry-after")
    if not header:
        return 0.0

    try:
        return min(float(header), 15.0)
    except ValueError:
        return 0.0


def route_search_points(route: RouteData, radius_meters: int) -> list[tuple[float, float]]:
    route_length = route.line_metric.length
    spacing_meters = search_point_spacing(radius_meters)
    distances = list(range(0, math.ceil(route_length), spacing_meters))
    if not distances or distances[-1] != math.ceil(route_length):
        distances.append(math.ceil(route_length))

    if len(distances) > MAX_SEARCH_POINTS:
        max_route_km = (MAX_SEARCH_POINTS - 1) * spacing_meters // 1000
        raise HTTPException(
            status_code=413,
            detail=f"Rutten är för lång för MVP-sökningen. Använd en rutt på högst cirka {max_route_km} km.",
        )

    points: list[tuple[float, float]] = []
    for distance in distances:
        metric_point = route.line_metric.interpolate(min(distance, route_length))
        lon, lat = route.to_wgs84.transform(metric_point.x, metric_point.y)
        points.append((lat, lon))

    return points


def search_point_spacing(radius_meters: int) -> int:
    if radius_meters <= 2_000:
        return 5_000
    return max(SEARCH_POINT_SPACING_METERS, min(radius_meters * 2, 25_000))


def build_overpass_query(points: list[tuple[float, float]], radius_meters: int) -> str:
    clauses: list[str] = []
    for lat, lon in points:
        bbox = point_bbox(lat, lon, radius_meters)
        area = f"({bbox['south']:.7f},{bbox['west']:.7f},{bbox['north']:.7f},{bbox['east']:.7f})"
        clauses.extend(
            [
                f'node["amenity"="fuel"]{area};',
                f'way["amenity"="fuel"]{area};',
                f'relation["amenity"="fuel"]{area};',
                f'node["amenity"="restaurant"]{area};',
                f'way["amenity"="restaurant"]{area};',
                f'relation["amenity"="restaurant"]{area};',
                f'node["tourism"~"^(hotel|guest_house|camp_site)$"]{area};',
                f'way["tourism"~"^(hotel|guest_house|camp_site)$"]{area};',
                f'relation["tourism"~"^(hotel|guest_house|camp_site)$"]{area};',
            ]
        )

    return f"""
    [out:json][timeout:30];
    (
      {" ".join(clauses)}
    );
    out center tags;
    """


def point_bbox(lat: float, lon: float, radius_meters: int) -> dict[str, float]:
    lat_padding = radius_meters / 111_320
    lon_padding = radius_meters / (111_320 * max(math.cos(math.radians(lat)), 0.1))
    return {
        "south": max(lat - lat_padding, -90),
        "west": max(lon - lon_padding, -180),
        "north": min(lat + lat_padding, 90),
        "east": min(lon + lon_padding, 180),
    }


def batched(items: list[tuple[float, float]], batch_size: int) -> list[list[tuple[float, float]]]:
    return [items[index : index + batch_size] for index in range(0, len(items), batch_size)]


def filter_places_near_route(
    elements: list[dict[str, Any]],
    route: RouteData,
    radius_meters: int,
) -> list[dict[str, Any]]:
    places: list[dict[str, Any]] = []
    seen: set[tuple[str, int]] = set()

    for element in elements:
        point = element_point(element)
        if point is None:
            continue

        lon, lat = point
        metric_point = transform(route.to_metric.transform, Point(lon, lat))
        distance = route.line_metric.distance(metric_point)
        if distance > radius_meters:
            continue
        route_distance = route.route_offset_meters + route.line_metric.project(metric_point)

        element_key = (element.get("type", "unknown"), int(element.get("id", 0)))
        if element_key in seen:
            continue
        seen.add(element_key)

        tags = element.get("tags", {})
        place_type = classify_place(tags)
        places.append(
            {
                "id": f"{element_key[0]}-{element_key[1]}",
                "name": tags.get("name") or label_for_type(place_type),
                "type": place_type,
                "lat": lat,
                "lon": lon,
                "distanceMeters": round(distance),
                "routeDistanceMeters": round(route_distance),
                "googleMapsUrl": f"https://www.google.com/maps/search/?api=1&query={lat},{lon}",
                "tags": {
                    key: tags[key]
                    for key in ("brand", "operator", "website", "phone", "addr:city", "addr:street")
                    if key in tags
                },
            }
        )

    return sorted(places, key=lambda item: (item["routeDistanceMeters"], item["distanceMeters"], item["name"].lower()))


def build_stage_suggestions(
    route: RouteData,
    places: list[dict[str, Any]],
    stage_km: int,
    radius_meters: int,
) -> list[dict[str, Any]]:
    stage_length_meters = stage_km * 1_000
    route_length = route.line_metric.length
    if route_length <= 0:
        return []

    stages: list[dict[str, Any]] = []
    day = 1
    end_distance = min(stage_length_meters, route_length)

    while end_distance <= route_length:
        end_point = route.line_metric.interpolate(end_distance)
        lon, lat = route.to_wgs84.transform(end_point.x, end_point.y)
        nearby = places_near_stage_end(places, route, end_point, radius_meters)

        stages.append(
            {
                "day": max(1, math.ceil((route.route_offset_meters + end_distance) / stage_length_meters)),
                "endLat": lat,
                "endLon": lon,
                "endRouteDistanceMeters": round(route.route_offset_meters + end_distance),
                "isFinalStage": math.isclose(end_distance, route_length) or end_distance >= route_length,
                "fuelStops": nearby["fuel"][:3],
                "lodging": nearby["lodging"][:5],
            }
        )

        if end_distance >= route_length:
            break
        day += 1
        end_distance = min(day * stage_length_meters, route_length)

    return stages


def places_near_stage_end(
    places: list[dict[str, Any]],
    route: RouteData,
    stage_point: Point,
    radius_meters: int,
) -> dict[str, list[dict[str, Any]]]:
    fuel: list[dict[str, Any]] = []
    lodging: list[dict[str, Any]] = []

    for place in places:
        metric_place = transform(route.to_metric.transform, Point(place["lon"], place["lat"]))
        stage_distance = round(stage_point.distance(metric_place))
        if stage_distance > radius_meters:
            continue

        suggestion = {
            "id": place["id"],
            "name": place["name"],
            "type": place["type"],
            "lat": place["lat"],
            "lon": place["lon"],
            "distanceFromStageEndMeters": stage_distance,
            "routeDistanceMeters": place["routeDistanceMeters"],
            "googleMapsUrl": place["googleMapsUrl"],
        }

        if place["type"] == "fuel":
            fuel.append(suggestion)
        elif place["type"] in {"hotel", "camping"}:
            lodging.append(suggestion)

    return {
        "fuel": sorted(fuel, key=lambda item: (item["distanceFromStageEndMeters"], item["name"].lower())),
        "lodging": sorted(lodging, key=lambda item: (item["distanceFromStageEndMeters"], item["name"].lower())),
    }


def element_point(element: dict[str, Any]) -> tuple[float, float] | None:
    if "lat" in element and "lon" in element:
        return float(element["lon"]), float(element["lat"])

    center = element.get("center")
    if center and "lat" in center and "lon" in center:
        return float(center["lon"]), float(center["lat"])

    return None


def classify_place(tags: dict[str, str]) -> str:
    if tags.get("amenity") == "fuel":
        return "fuel"
    if tags.get("amenity") == "restaurant":
        return "food"

    tourism = tags.get("tourism")
    if tourism == "camp_site":
        return "camping"

    return "hotel"


def label_for_type(place_type: str) -> str:
    labels = {
        "fuel": "Bensinstation",
        "hotel": "Boende",
        "camping": "Camping",
        "food": "Restaurang",
    }
    return labels.get(place_type, "Plats")
