const form = document.querySelector("#upload-form");
const fileInput = document.querySelector("#gpx-file");
const statusBox = document.querySelector("#status");
const segmentStatus = document.querySelector("#segment-status");
const segmentHelp = document.querySelector("#segment-help");
const nextSegmentButton = document.querySelector("#next-segment");
const nearbySearchButton = document.querySelector("#nearby-search");
const nearbyRadiusInput = document.querySelector("#nearby-radius-km");
const nearbyDescription = document.querySelector("#nearby-description");
const placesList = document.querySelector("#places-list");
const resultsTitle = document.querySelector("#results-title");
const resultsCount = document.querySelector("#results-count");
const stagesPanel = document.querySelector(".stages-panel");
const stagesList = document.querySelector("#stages-list");
const stagesCount = document.querySelector("#stages-count");
const radiusInput = document.querySelector("#radius-km");
const stageInput = document.querySelector("#stage-km");
const languageInput = document.querySelector("#language-select");
const filterInputs = Array.from(document.querySelectorAll(".filters input"));
const mapPanel = document.querySelector(".map-panel");
const mapElement = document.querySelector("#map");
const builderProfileInput = document.querySelector("#builder-profile");
const builderStatus = document.querySelector("#builder-status");
const builderSummary = document.querySelector("#builder-summary");
const downloadGpxButton = document.querySelector("#download-gpx");
const clearBuiltRouteButton = document.querySelector("#clear-built-route");
const trailSyncIndicator = document.querySelector("#trail-sync-indicator");
const trailSyncText = document.querySelector("#trail-sync-text");
const summaryDistance = document.querySelector("#summary-distance");
const summaryElevation = document.querySelector("#summary-elevation");
const summaryRideTime = document.querySelector("#summary-ride-time");
const summaryTrailSegments = document.querySelector("#summary-trail-segments");
const summaryGpx = document.querySelector("#summary-gpx");
const TRAIL_MIN_ZOOM = 11;
const TRAIL_MAX_VIEW_AREA = 0.5;

const translations = {
  en: {
    analyzeFailed: "Analysis failed.",
    analyzeRoute: "Analyze route",
    analyzingRoute: "Analyzing the route and fetching OSM data...",
    analyzingSegment: (distance) => `Analyzing the next route segment from about ${distance}...`,
    camping: "Camping",
    campgrounds: "Campgrounds",
    currentSegment: (start, end, total) => `Showing ${start}-${end} of ${total}.`,
    dailyStage: "Daily stage",
    dailyStages: "Daily stages",
    day: "day",
    days: "days",
    dayTitle: (day, distance) => `Day ${day} - about ${distance}`,
    distanceFromStart: (distance) => `About ${distance} from start`,
    distanceFromStartLabel: (distance) => `Distance from start: about ${distance}`,
    distanceFromPosition: (distance) => `About ${distance} from your position`,
    endOfStage: (label) => `Stage end: ${label}`,
    filtersLabel: "Filters",
    food: "Food",
    fuel: "Fuel",
    fuelNearStage: (count) => `Fuel near stage: ${count}`,
    fuelStations: "Fuel stations",
    gpxFile: "GPX file",
    hotel: "Hotel/lodging",
    initialStatus: "Choose a GPX file to begin.",
    installAndroid: "Android: Open in Chrome -> Install app / Add to Home screen.",
    installIos: "iPhone: Open in Safari -> Share -> Add to Home Screen.",
    installSummary: "Install this app",
    language: "Language",
    layerPoi: "POI markers",
    layerSatellite: "Satellite imagery",
    layerStages: "Stage ends",
    layerStandard: "Standard map",
    layerLocation: "Your position",
    layerBuiltRoute: "Planned route",
    layerHikingTrails: "Hiking trails",
    lodging: "Lodging",
    lodgingNearStage: (count) => `Lodging/camping near stage end: ${count}`,
    mapLabel: "Map",
    matchesAlongRoute: "Matches along the route",
    matchesNearby: "Matches near you",
    near: (name) => `near ${name}`,
    nearbySearchFailed: "Could not search near your position.",
    nearbySummary: (count, radius) =>
      `${count} ${count === 1 ? "place" : "places"} found within ${radius} km of your position.`,
    noFile: "Choose a GPX file.",
    noGeolocation: "Location is not available in this browser.",
    noneNearStageEnd: "none near stage end",
    noPlacesForFilters: "No places match the active filters.",
    openInGoogleMaps: "Open in Google Maps",
    coordinates: "Coordinates",
    elevation: "Elevation",
    elevationUnknown: "Elevation unavailable",
    notes: "Notes",
    place: "place",
    places: "places",
    placeFallback: "Place",
    routeHitSummary: (count, radius, routeLength) =>
      `${count} ${count === 1 ? "place" : "places"} found within ${radius} km in the current segment. The full route is ${routeLength}.`,
    routeBuilderLabel: "Route builder",
    routeBuilderTitle: "Route builder",
    routeBuilderHelp:
      "Click the map to add waypoints. Trail data syncs automatically when the map is zoomed or moved.",
    routeBuilderInitial: "Click the map to start a new route.",
    routeSummaryLabel: "Route summary",
    routingProfile: "Routing profile",
    profileDriving: "Driving / road",
    profileHiking: "Hiking / trails",
    downloadGpx: "Download GPX",
    clearRoute: "Clear route",
    routeBuilding: "Routing segment...",
    routeReady: (waypoints, distance) => `${waypoints} waypoints, planned route ${distance}.`,
    routeCleared: "Route cleared. Click the map to start again.",
    routeNeedsTwoPoints: "Add at least two routed waypoints before downloading GPX.",
    routeDownloadReady: "GPX file downloaded.",
    routeProfileChanged: "Routing profile changed. Existing planned route was cleared.",
    routeFailed: "Routing failed.",
    trailsUnavailable: "Could not load hiking trails for this map view.",
    trailsUnavailableWarning: "Hiking trail overlay unavailable right now.",
    trailsLoaded: (count) => `${count} hiking trail segments loaded in this map view.`,
    trailsZoomIn: "Zoom in to load hiking trails.",
    trailSyncIdle: "Trail sync idle",
    trailSyncing: "Syncing trail network for current map scale...",
    trailSyncUpdating: "Live trails updating",
    trailSynced: "Trail data synced",
    trailSyncSkipped: "Zoom in to sync trails",
    trailSyncError: "Trail sync delayed",
    summaryDistance: "Distance",
    summaryElevation: "Elevation",
    summaryRideTime: "Est. ride time",
    summaryTrailSegments: "Trail segments",
    summaryGpx: "GPX export",
    gpxReady: "Ready",
    gpxNotReady: "Not ready",
    elevationUnavailable: "—",
    waypointsSummary: (count) => `${count} ${count === 1 ? "waypoint" : "waypoints"}`,
    searchNearby: "Use my location",
    searchNearbyDescription: (radius) =>
      `Search for fuel, lodging, campgrounds, shelters and food within ${radius} km of your current GPS position.`,
    nearbyRadius: "Radius from my position",
    searchingNearby: (radius) => `Getting your position and searching within ${radius} km...`,
    searchNextSegment: "Search next segment",
    searchOn: (start, end) => `Search onward: ${start}-${end}`,
    searchRadius: "Search radius",
    segmentHelp:
      "Route searches are limited to 350 km at a time because longer routes can contain too much map data. Use Search onward to analyze the next segment.",
    showStageEndInGoogleMaps: "Show stage end in Google Maps",
    sidebarLabel: "Route analysis",
    stageEnd: "Stage end",
    stops: "stops",
    stop: "stop",
    tagline: "Find fuel, lodging, camping and food along a GPX route or near your current position.",
    typeCamping: "Camping",
    typeCampground: "Campground",
    typeFood: "Restaurant",
    typeFuel: "Fuel station",
    typeHotel: "Hotel/lodging",
    typeShelter: "Shelter",
    withinRoute: (type, distance) => `${type} - ${distance} from the route`,
    shelters: "Shelters",
  },
  sv: {
    analyzeFailed: "Analysen misslyckades.",
    analyzeRoute: "Analysera rutt",
    analyzingRoute: "Analyserar rutten och hämtar OSM-data...",
    analyzingSegment: (distance) => `Analyserar nästa ruttsegment från ca ${distance}...`,
    camping: "Camping",
    campgrounds: "Campingplatser",
    currentSegment: (start, end, total) => `Visar ${start}-${end} av ${total}.`,
    dailyStage: "Dagsetapp",
    dailyStages: "Dagsetapper",
    day: "dag",
    days: "dagar",
    dayTitle: (day, distance) => `Dag ${day} - ca ${distance}`,
    distanceFromStart: (distance) => `Ca ${distance} från start`,
    distanceFromStartLabel: (distance) => `Avstånd från start: ca ${distance}`,
    distanceFromPosition: (distance) => `Ca ${distance} från din position`,
    endOfStage: (label) => `Etappslut: ${label}`,
    filtersLabel: "Filter",
    food: "Mat",
    fuel: "Bensin",
    fuelNearStage: (count) => `Bensin nära etappen: ${count}`,
    fuelStations: "Bensinstationer",
    gpxFile: "GPX-fil",
    hotel: "Hotell/boende",
    initialStatus: "Välj en GPX-fil för att börja.",
    installAndroid: "Android: Öppna i Chrome -> Installera app / Lägg till på startskärmen.",
    installIos: "iPhone: Öppna i Safari -> Dela -> Lägg till på hemskärmen.",
    installSummary: "Installera appen",
    language: "Språk",
    layerPoi: "POI-markörer",
    layerSatellite: "Satellitfoto",
    layerStages: "Etappslut",
    layerStandard: "Standardkarta",
    layerLocation: "Din position",
    layerBuiltRoute: "Planerad rutt",
    layerHikingTrails: "Vandringsleder",
    lodging: "Boende",
    lodgingNearStage: (count) => `Boende/camping nära etappslut: ${count}`,
    mapLabel: "Karta",
    matchesAlongRoute: "Träffar längs rutten",
    matchesNearby: "Träffar nära dig",
    near: (name) => `nära ${name}`,
    nearbySearchFailed: "Kunde inte söka nära din position.",
    nearbySummary: (count, radius) =>
      `${count} ${count === 1 ? "plats" : "platser"} hittades inom ${radius} km från din position.`,
    noFile: "Välj en GPX-fil.",
    noGeolocation: "Position är inte tillgängligt i den här webbläsaren.",
    noneNearStageEnd: "inga nära etappslut",
    noPlacesForFilters: "Inga platser matchar aktiva filter.",
    openInGoogleMaps: "Öppna i Google Maps",
    coordinates: "Koordinater",
    elevation: "Höjd",
    elevationUnknown: "Höjd saknas",
    notes: "Anteckningar",
    place: "plats",
    places: "platser",
    placeFallback: "Plats",
    routeHitSummary: (count, radius, routeLength) =>
      `${count} platser hittades inom ${radius} km i aktuellt segment. Hela rutten är ${routeLength}.`,
    routeBuilderLabel: "Ruttbyggare",
    routeBuilderTitle: "Ruttbyggare",
    routeBuilderHelp:
      "Klicka i kartan för att lägga till waypoints. Leddata synkas automatiskt när kartan zoomas eller flyttas.",
    routeBuilderInitial: "Klicka i kartan för att börja en ny rutt.",
    routeSummaryLabel: "Ruttsammanfattning",
    routingProfile: "Routingprofil",
    profileDriving: "Bil / väg",
    profileHiking: "Vandring / leder",
    downloadGpx: "Ladda ner GPX",
    clearRoute: "Rensa rutt",
    routeBuilding: "Beräknar ruttsegment...",
    routeReady: (waypoints, distance) => `${waypoints} waypoints, planerad rutt ${distance}.`,
    routeCleared: "Rutten rensad. Klicka i kartan för att börja igen.",
    routeNeedsTwoPoints: "Lägg till minst två routade waypoints innan du laddar ner GPX.",
    routeDownloadReady: "GPX-fil nedladdad.",
    routeProfileChanged: "Routingprofilen ändrades. Befintlig planerad rutt rensades.",
    routeFailed: "Routing misslyckades.",
    trailsUnavailable: "Kunde inte ladda vandringsleder för kartvyn.",
    trailsUnavailableWarning: "Led-overlay är inte tillgänglig just nu.",
    trailsLoaded: (count) => `${count} ledsegment laddade i kartvyn.`,
    trailsZoomIn: "Zooma in för att ladda vandringsleder.",
    trailSyncIdle: "Led-synk väntar",
    trailSyncing: "Synkar lednät för aktuell kartskala...",
    trailSyncUpdating: "Live-leder uppdateras",
    trailSynced: "Leddata synkad",
    trailSyncSkipped: "Zooma in för att synka leder",
    trailSyncError: "Led-synk fördröjd",
    summaryDistance: "Distans",
    summaryElevation: "Höjd",
    summaryRideTime: "Beräknad körtid",
    summaryTrailSegments: "Ledsegment",
    summaryGpx: "GPX-export",
    gpxReady: "Redo",
    gpxNotReady: "Inte redo",
    elevationUnavailable: "—",
    waypointsSummary: (count) => `${count} ${count === 1 ? "waypoint" : "waypoints"}`,
    searchNearby: "Använd min position",
    searchNearbyDescription: (radius) =>
      `Sök efter bensin, boende, campingplatser, vindskydd och mat inom ${radius} km från din aktuella GPS-position.`,
    nearbyRadius: "Radie från min position",
    searchingNearby: (radius) => `Hämtar din position och söker inom ${radius} km...`,
    searchNextSegment: "Sök nästa segment",
    searchOn: (start, end) => `Sök vidare: ${start}-${end}`,
    searchRadius: "Sökradie",
    segmentHelp:
      "Ruttsökningar är begränsade till 350 km åt gången eftersom längre rutter kan innehålla för mycket kartdata. Klicka på Sök vidare för att analysera nästa segment.",
    showStageEndInGoogleMaps: "Visa etappslut i Google Maps",
    sidebarLabel: "Ruttanalys",
    stageEnd: "Etappslut",
    stops: "stopp",
    stop: "stopp",
    tagline: "Hitta bensin, boende, camping och mat längs en GPX-rutt eller nära din aktuella position.",
    typeCamping: "Camping",
    typeCampground: "Campingplats",
    typeFood: "Restaurang",
    typeFuel: "Bensinstation",
    typeHotel: "Hotell/boende",
    typeShelter: "Vindskydd",
    withinRoute: (type, distance) => `${type} - ${distance} från rutten`,
    shelters: "Vindskydd",
  },
};

let currentLanguage = languageInput?.value || "en";

const map = L.map("map", { preferCanvas: true }).setView([62, 15], 5);
const standardLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});
const satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution:
      "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  },
);

standardLayer.addTo(map);

let routeLayer = null;
let builtRouteLayer = null;
let markerLayer = L.layerGroup().addTo(map);
let stageLayer = L.layerGroup().addTo(map);
let locationLayer = L.layerGroup().addTo(map);
let waypointLayer = L.layerGroup().addTo(map);
let trailLayer = L.layerGroup();
let places = [];
let stages = [];
let builtWaypoints = [];
let builtSegments = [];
let builtCoordinates = [];
let builtSegmentStats = [];
let trailSegmentCount = 0;
let resizeFrame = null;
let currentFile = null;
let nextStartKm = null;
let layerControl = null;
let searchMode = "route";
let isRoutingSegment = false;
let trailLoadTimer = null;
let trailLoadRequestId = 0;
let currentTrailSyncState = "idle";

const markerStyles = {
  fuel: { color: "#c2410c", symbol: "⛽" },
  hotel: { color: "#2563eb", symbol: "🛏" },
  campground: { color: "#15803d", symbol: "⛺" },
  shelter: { color: "#92400e", symbol: "⌂" },
  food: { color: "#9333ea", symbol: "🍴" },
};

renderLayerControl();

window.addEventListener("load", () => scheduleMapResize({ repeat: true }));
window.addEventListener("resize", () => scheduleMapResize({ repeat: true }));
window.addEventListener("orientationchange", () => scheduleMapResize({ repeat: true }));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    scheduleMapResize({ repeat: true });
  }
});

if ("ResizeObserver" in window) {
  const mapResizeObserver = new ResizeObserver(() => scheduleMapResize());
  mapResizeObserver.observe(mapPanel);
  mapResizeObserver.observe(mapElement);
}

map.whenReady(() => {
  scheduleMapResize({ repeat: true });
  scheduleTrailLoad({ background: true });
});
setTimeout(() => scheduleMapResize({ repeat: true }), 100);

map.on("click", handleMapRouteClick);
map.on("moveend", () => {
  scheduleTrailLoad({ background: currentBuilderProfile() !== "hiking" });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = fileInput.files[0];
  if (!file) {
    setStatus(t("noFile"), true);
    return;
  }

  currentFile = file;
  searchMode = "route";
  await analyzeSegment(0);
});

nextSegmentButton.addEventListener("click", async () => {
  if (!currentFile || nextStartKm === null) {
    return;
  }

  await analyzeSegment(nextStartKm);
});

filterInputs.forEach((input) => input.addEventListener("change", renderPlaces));

nearbySearchButton.addEventListener("click", searchNearbyServices);
nearbyRadiusInput.addEventListener("change", updateNearbyDescription);
downloadGpxButton.addEventListener("click", downloadBuiltRouteGpx);
clearBuiltRouteButton.addEventListener("click", () => clearBuiltRoute(t("routeCleared")));
builderProfileInput.addEventListener("change", () => {
  clearBuiltRoute(t("routeProfileChanged"));
  updateTrailLayerVisibility();
});

languageInput?.addEventListener("change", () => {
  currentLanguage = languageInput.value;
  applyLanguage();
});

applyLanguage();
updateBuilderControls();
setTrailSyncState("idle", t("trailSyncIdle"));
updateTrailLayerVisibility();

async function analyzeSegment(startKm) {
  const submitButton = form.querySelector("button");
  const isContinuation = startKm > 0;
  submitButton.disabled = true;
  nextSegmentButton.disabled = true;
  setStatus(
    isContinuation
      ? t("analyzingSegment", formatDistance(startKm * 1000))
      : t("analyzingRoute"),
  );

  try {
    const payload = await requestAnalysis(startKm);

    renderRoute(payload.route);
    locationLayer.clearLayers();
    places = payload.places;
    stages = payload.stages || [];
    renderPlaces();
    renderStages();
    updateSegmentControls(payload.segment, payload.routeLengthMeters);
    setStatus(
      t("routeHitSummary", places.length, payload.radiusMeters / 1000, formatDistance(payload.routeLengthMeters)),
    );
  } catch (error) {
    setStatus(userFacingError(error), true);
  } finally {
    submitButton.disabled = false;
    nextSegmentButton.disabled = false;
  }
}

async function searchNearbyServices() {
  if (!("geolocation" in navigator)) {
    setStatus(t("noGeolocation"), true);
    return;
  }

  nearbySearchButton.disabled = true;
  const radiusKm = Number(nearbyRadiusInput.value);
  setStatus(t("searchingNearby", radiusKm));

  try {
    const position = await currentPosition();
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const payload = await requestNearbyServices(lat, lon, radiusKm);

    searchMode = "nearby";
    currentFile = null;
    nextStartKm = null;
    nextSegmentButton.hidden = true;
    segmentStatus.hidden = true;
    segmentHelp.hidden = true;

    if (routeLayer) {
      routeLayer.remove();
      routeLayer = null;
    }
    stageLayer.clearLayers();
    locationLayer.clearLayers();

    places = payload.places || [];
    stages = [];
    renderStages();
    renderPlaces();
    renderLocation(lat, lon, payload.radiusMeters);
    map.setView([lat, lon], 12);
    scheduleMapResize({ repeat: true });
    setStatus(t("nearbySummary", places.length, payload.radiusMeters / 1000));
  } catch (error) {
    setStatus(userFacingError(error) || t("nearbySearchFailed"), true);
  } finally {
    nearbySearchButton.disabled = false;
  }
}

async function handleMapRouteClick(event) {
  if (isRoutingSegment) {
    return;
  }

  const waypoint = { lat: event.latlng.lat, lon: event.latlng.lng };
  builtWaypoints.push(waypoint);
  renderBuiltWaypoints();
  updateBuilderControls();

  if (builtWaypoints.length < 2) {
    setBuilderStatus(t("routeBuilderInitial"));
    return;
  }

  const previous = builtWaypoints[builtWaypoints.length - 2];
  const latest = builtWaypoints[builtWaypoints.length - 1];

  isRoutingSegment = true;
  updateBuilderControls();
  setBuilderStatus(t("routeBuilding"));

  try {
    const segment = await requestBuiltRouteSegment(previous, latest, currentBuilderProfile());
    builtSegments.push(segment.coordinates);
    builtSegmentStats.push({
      distanceMeters: Number(segment.distanceMeters) || 0,
      durationSeconds: Number(segment.durationSeconds) || 0,
    });
    builtCoordinates = RoutePlannerUtils.mergeRouteSegments(builtSegments);
    renderBuiltRoute();
    const readyMessage = t("routeReady", builtWaypoints.length, formatDistance(RoutePlannerUtils.routeDistanceMeters(builtCoordinates)));
    setBuilderStatus(segment.warning ? `${readyMessage} ${segment.warning}` : readyMessage, Boolean(segment.warning));
  } catch (error) {
    builtWaypoints.pop();
    renderBuiltWaypoints();
    setBuilderStatus(`${t("routeFailed")} ${userFacingError(error)}`, true);
  } finally {
    isRoutingSegment = false;
    updateBuilderControls();
  }
}

async function requestBuiltRouteSegment(start, end, profile) {
  const response = await fetch("/api/route", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      profile,
      points: [start, end],
    }),
  });

  return responsePayload(response);
}

function renderBuiltWaypoints() {
  waypointLayer.clearLayers();
  builtWaypoints.forEach((point, index) => {
    L.marker([point.lat, point.lon], {
      icon: waypointIcon(index + 1),
      title: `Waypoint ${index + 1}`,
    })
      .bindPopup(`<p class="popup-title">Waypoint ${index + 1}</p><p class="popup-meta">${escapeHtml(compactCoordinate(point.lat, point.lon))}</p>`)
      .addTo(waypointLayer);
  });
}

function renderBuiltRoute() {
  if (builtRouteLayer) {
    builtRouteLayer.remove();
    builtRouteLayer = null;
  }
  if (builtCoordinates.length < 2) {
    return;
  }

  builtRouteLayer = L.polyline(builtCoordinates, {
    color: currentBuilderProfile() === "hiking" ? "#7c3aed" : "#111827",
    weight: 5,
    opacity: 0.9,
  }).addTo(map);
  builtRouteLayer.bringToFront();
}

function clearBuiltRoute(message) {
  builtWaypoints = [];
  builtSegments = [];
  builtCoordinates = [];
  builtSegmentStats = [];
  waypointLayer.clearLayers();
  if (builtRouteLayer) {
    builtRouteLayer.remove();
    builtRouteLayer = null;
  }
  setBuilderStatus(message || t("routeBuilderInitial"));
  updateBuilderControls();
}

function downloadBuiltRouteGpx() {
  try {
    if (builtCoordinates.length < 2) {
      setBuilderStatus(t("routeNeedsTwoPoints"), true);
      return;
    }
    const gpx = RoutePlannerUtils.buildGpxDocument(builtCoordinates, {
      name: currentBuilderProfile() === "hiking" ? "Planned hiking route" : "Planned road route",
    });
    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `planned-${currentBuilderProfile()}-route.gpx`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    setBuilderStatus(t("routeDownloadReady"));
  } catch (error) {
    setBuilderStatus(userFacingError(error), true);
  }
}

function updateBuilderControls() {
  const hasWaypoints = builtWaypoints.length > 0;
  downloadGpxButton.disabled = builtCoordinates.length < 2 || isRoutingSegment;
  clearBuiltRouteButton.disabled = !hasWaypoints || isRoutingSegment;
  builderProfileInput.disabled = isRoutingSegment;
  builderSummary.textContent = t("waypointsSummary", builtWaypoints.length);
  updateRouteBuilderSummary();
}

function updateRouteBuilderSummary() {
  const routedDistance = builtSegmentStats.reduce((total, segment) => total + segment.distanceMeters, 0);
  const fallbackDistance = builtCoordinates.length >= 2 ? RoutePlannerUtils.routeDistanceMeters(builtCoordinates) : 0;
  const distance = routedDistance || fallbackDistance;
  const durationSeconds = builtSegmentStats.reduce((total, segment) => total + segment.durationSeconds, 0);

  summaryDistance.textContent = distance > 0 ? formatDistance(distance) : "—";
  summaryElevation.textContent = t("elevationUnavailable");
  summaryRideTime.textContent = durationSeconds > 0 ? formatDuration(durationSeconds) : "—";
  summaryTrailSegments.textContent = String(trailSegmentCount);
  summaryGpx.textContent = builtCoordinates.length >= 2 ? t("gpxReady") : t("gpxNotReady");
}

function setBuilderStatus(message, isError = false) {
  builderStatus.textContent = message;
  builderStatus.classList.toggle("error", isError);
}

function setTrailSyncState(state, message) {
  currentTrailSyncState = state;
  trailSyncIndicator.dataset.state = state;
  trailSyncText.textContent = message || trailSyncMessageForState(state);
}

function trailSyncMessageForState(state) {
  return {
    idle: t("trailSyncIdle"),
    syncing: t("trailSyncing"),
    synced: t("trailSynced"),
    skipped: t("trailSyncSkipped"),
    error: t("trailSyncError"),
  }[state] || t("trailSyncIdle");
}

function currentBuilderProfile() {
  return builderProfileInput.value || "driving";
}

function waypointIcon(number) {
  return L.divIcon({
    className: "waypoint-marker",
    html: `<span>${number}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

function updateTrailLayerVisibility() {
  if (currentBuilderProfile() === "hiking") {
    if (!map.hasLayer(trailLayer)) {
      trailLayer.addTo(map);
    }
    scheduleTrailLoad();
  } else if (map.hasLayer(trailLayer)) {
    map.removeLayer(trailLayer);
  }
  renderLayerControl();
}

function scheduleTrailLoad(options = {}) {
  if (trailLoadTimer !== null) {
    clearTimeout(trailLoadTimer);
  }
  trailLoadTimer = setTimeout(() => loadVisibleHikingTrails(options), options.background ? 900 : 350);
}

async function loadVisibleHikingTrails(options = {}) {
  const background = Boolean(options.background);
  if (currentBuilderProfile() !== "hiking" && !background) {
    return;
  }
  const bounds = map.getBounds();
  if (!shouldLoadTrailsForBounds(bounds)) {
    setTrailSyncState("skipped", t("trailSyncSkipped"));
    if (!background && currentBuilderProfile() === "hiking") {
      setBuilderStatus(t("trailsZoomIn"));
    }
    return;
  }

  const requestId = ++trailLoadRequestId;
  setTrailSyncState("syncing", background ? t("trailSyncUpdating") : t("trailSyncing"));
  try {
    const response = await fetch("/api/trails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      }),
    });
    const payload = await responsePayload(response);
    if (requestId !== trailLoadRequestId) {
      return;
    }
    if (payload.status !== "unavailable") {
      renderHikingTrails(payload.trails || []);
    }
    if (background && currentBuilderProfile() !== "hiking") {
      setTrailSyncState(payload.status === "unavailable" ? "error" : "synced", payload.status === "unavailable" ? t("trailSyncError") : t("trailSynced"));
      return;
    }
    if (payload.status === "skipped") {
      setTrailSyncState("skipped", t("trailSyncSkipped"));
      setBuilderStatus(t("trailsZoomIn"));
    } else if (payload.status === "unavailable") {
      setTrailSyncState("error", t("trailSyncError"));
      setBuilderStatus(`${t("trailsUnavailableWarning")} ${payload.warning || ""}`.trim());
    } else {
      setTrailSyncState("synced", t("trailSynced"));
      setBuilderStatus(t("trailsLoaded", (payload.trails || []).length));
    }
  } catch (error) {
    if (requestId !== trailLoadRequestId) {
      return;
    }
    setTrailSyncState("error", t("trailSyncError"));
    if (!background) {
      setBuilderStatus(`${t("trailsUnavailable")} ${userFacingError(error)}`, true);
    }
  }
}

function shouldLoadTrailsForBounds(bounds) {
  const area = Math.abs(bounds.getNorth() - bounds.getSouth()) * Math.abs(bounds.getEast() - bounds.getWest());
  return map.getZoom() >= TRAIL_MIN_ZOOM && area <= TRAIL_MAX_VIEW_AREA;
}

function renderHikingTrails(trails) {
  trailLayer.clearLayers();
  trailSegmentCount = trails.length;
  updateRouteBuilderSummary();
  for (const trail of trails) {
    L.polyline(trail.coordinates, {
      color: "#7c3aed",
      weight: 3,
      opacity: 0.55,
      dashArray: "6 6",
    })
      .bindPopup(`<p class="popup-title">${escapeHtml(trail.name)}</p>`)
      .addTo(trailLayer);
  }
}

function currentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    });
  });
}

async function requestNearbyServices(lat, lon, radiusKm) {
  const response = await fetch("/api/nearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lat, lon, radiusKm }),
  });

  return responsePayload(response);
}

function renderLocation(lat, lon, radiusMeters) {
  L.circle([lat, lon], {
    radius: radiusMeters,
    color: "#0f766e",
    weight: 2,
    opacity: 0.8,
    fillColor: "#0f766e",
    fillOpacity: 0.08,
  }).addTo(locationLayer);

  L.marker([lat, lon], {
    title: t("searchNearby"),
  }).addTo(locationLayer);
}

async function requestAnalysis(startKm) {
  if (shouldPreferJsonUpload()) {
    return requestJsonAnalysis(startKm);
  }

  try {
    return await requestMultipartAnalysis(startKm);
  } catch (error) {
    if (!isBrowserPatternError(error)) {
      throw error;
    }
    return requestJsonAnalysis(startKm);
  }
}

async function requestMultipartAnalysis(startKm) {
  const data = new FormData();
  data.append("file", currentFile, safeGpxFilename(currentFile));
  data.append("radiusKm", radiusInput.value);
  data.append("stageKm", stageInput.value);
  data.append("startKm", startKm);

  const response = await fetch("/api/analyze", {
    method: "POST",
    body: data,
  });

  return responsePayload(response);
}

async function requestJsonAnalysis(startKm) {
  const response = await fetch("/api/analyze-json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      gpxText: await readFileText(currentFile),
      radiusKm: Number(radiusInput.value),
      stageKm: Number(stageInput.value),
      startKm,
    }),
  });

  return responsePayload(response);
}

async function responsePayload(response) {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { detail: await response.text() };
  if (!response.ok) {
    throw new Error(localizeServerError(payload.detail) || t("analyzeFailed"));
  }
  return payload;
}

function renderRoute(route) {
  if (routeLayer) {
    routeLayer.remove();
  }

  routeLayer = L.polyline(route, {
    color: "#0f766e",
    weight: 5,
    opacity: 0.9,
  }).addTo(map);

  scheduleMapResize({ repeat: true });
  requestAnimationFrame(() => {
    map.fitBounds(routeLayer.getBounds(), { padding: [28, 28] });
    scheduleMapResize({ repeat: true });
  });
}

function updateSegmentControls(segment, totalRouteMeters) {
  if (!segment) {
    segmentStatus.hidden = true;
    segmentHelp.hidden = true;
    nextSegmentButton.hidden = true;
    nextStartKm = null;
    return;
  }

  segmentStatus.hidden = false;
  segmentHelp.hidden = false;
  segmentStatus.textContent = t(
    "currentSegment",
    formatDistance(segment.startMeters),
    formatDistance(segment.endMeters),
    formatDistance(totalRouteMeters),
  );

  nextStartKm = segment.nextStartKm;
  nextSegmentButton.hidden = !segment.hasMore;
  if (segment.hasMore) {
    const nextEndMeters = Math.min(segment.endMeters + segment.maxLengthMeters, totalRouteMeters);
    nextSegmentButton.textContent = t(
      "searchOn",
      formatDistance(segment.endMeters),
      formatDistance(nextEndMeters),
    );
  }
}

function renderPlaces() {
  const visibleTypes = new Set(filterInputs.filter((input) => input.checked).map((input) => input.value));
  const visiblePlaces = places.filter((place) => visibleTypes.has(place.type));

  markerLayer.clearLayers();
  placesList.innerHTML = "";
  updateResultTitle();
  resultsCount.textContent = placeCountLabel(visiblePlaces.length);

  for (const place of visiblePlaces) {
    const marker = L.marker([place.lat, place.lon], {
      icon: placeIcon(place.type),
      title: place.name,
    });

    marker.bindPopup(popupHtml(place));
    marker.addTo(markerLayer);
    placesList.appendChild(placeListItem(place, marker));
  }

  if (visiblePlaces.length === 0 && places.length > 0) {
    const empty = document.createElement("li");
    empty.className = "place";
    empty.textContent = t("noPlacesForFilters");
    placesList.appendChild(empty);
  }
}

function renderStages() {
  stageLayer.clearLayers();
  stagesList.innerHTML = "";
  stagesPanel.hidden = searchMode === "nearby";
  stagesCount.textContent = dayCountLabel(stages.length);

  for (const stage of stages) {
    L.marker([stage.endLat, stage.endLon], {
      icon: stageIcon(stage.day),
      title: t("stageEnd"),
    })
      .bindPopup(stagePopupHtml(stage))
      .addTo(stageLayer);

    stagesList.appendChild(stageListItem(stage));
  }
}

function placeListItem(place, marker) {
  const item = document.createElement("li");
  item.className = "place";
  item.dataset.type = place.type;
  item.tabIndex = 0;

  const name = document.createElement("strong");
  name.textContent = place.name;

  const meta = document.createElement("span");
  meta.textContent =
    searchMode === "nearby"
      ? `${typeLabel(place.type)} - ${t("distanceFromPosition", formatDistance(place.distanceMeters))}`
      : t("withinRoute", typeLabel(place.type), formatDistance(place.distanceMeters));

  const routeDistance = document.createElement("span");
  routeDistance.textContent =
    searchMode === "nearby"
      ? t("distanceFromPosition", formatDistance(place.distanceMeters))
      : t("distanceFromStart", formatDistance(place.routeDistanceMeters));

  const details = document.createElement("span");
  details.textContent = place.tags.brand || place.tags.operator || place.tags["addr:city"] || "";

  const actions = document.createElement("div");
  actions.className = "place-actions";

  const mapLink = document.createElement("a");
  mapLink.href = place.googleMapsUrl;
  mapLink.target = "_blank";
  mapLink.rel = "noopener noreferrer";
  mapLink.textContent = "Google Maps";
  actions.append(mapLink);

  item.append(name, meta, routeDistance);
  if (details.textContent) {
    item.append(details);
  }
  item.append(actions);

  item.addEventListener("click", () => {
    map.setView([place.lat, place.lon], Math.max(map.getZoom(), 14));
    marker.openPopup();
  });

  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      item.click();
    }
  });

  return item;
}

function stageListItem(stage) {
  const item = document.createElement("li");
  item.className = "stage";

  const title = document.createElement("strong");
  title.textContent = t("dayTitle", stage.day, formatDistance(stage.endRouteDistanceMeters));

  const endPoint = document.createElement("span");
  endPoint.textContent = t("endOfStage", stageEndLabel(stage));

  const fuel = document.createElement("span");
  fuel.textContent = t("fuelNearStage", stopCountLabel(stage.fuelStops));

  const lodging = document.createElement("span");
  lodging.textContent = t("lodgingNearStage", placeCountLabel(stage.lodging ? stage.lodging.length : 0));

  const actions = document.createElement("div");
  actions.className = "place-actions";

  const mapLink = document.createElement("a");
  mapLink.href = `https://www.google.com/maps/search/?api=1&query=${stage.endLat},${stage.endLon}`;
  mapLink.target = "_blank";
  mapLink.rel = "noopener noreferrer";
  mapLink.textContent = t("showStageEndInGoogleMaps");
  actions.append(mapLink);

  item.append(title, endPoint, fuel, lodging, actions);
  item.addEventListener("click", () => {
    map.setView([stage.endLat, stage.endLon], Math.max(map.getZoom(), 12));
  });

  return item;
}

function popupHtml(place) {
  const detail = place.tags.brand || place.tags.operator || place.tags.website || "";
  const distanceLabel =
    searchMode === "nearby"
      ? t("distanceFromPosition", formatDistance(place.distanceMeters))
      : t("withinRoute", typeLabel(place.type), formatDistance(place.distanceMeters));
  return `
    <p class="popup-title">${escapeHtml(place.name)}</p>
    <p class="popup-meta">${escapeHtml(distanceLabel)}</p>
    ${searchMode === "nearby" ? "" : `<p class="popup-meta">${escapeHtml(t("distanceFromStart", formatDistance(place.routeDistanceMeters)))}</p>`}
    <p class="popup-meta">${escapeHtml(t("coordinates"))}: ${escapeHtml(compactCoordinate(place.lat, place.lon))}</p>
    <p class="popup-meta">${escapeHtml(t("elevation"))}: ${escapeHtml(place.elevation === null || place.elevation === undefined ? t("elevationUnknown") : `${place.elevation} m`)}</p>
    ${place.notes ? `<p class="popup-meta">${escapeHtml(t("notes"))}: ${escapeHtml(place.notes)}</p>` : ""}
    ${detail ? `<p class="popup-meta">${escapeHtml(detail)}</p>` : ""}
    <p class="popup-link"><a href="${escapeHtml(place.googleMapsUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("openInGoogleMaps"))}</a></p>
  `;
}

function stagePopupHtml(stage) {
  return `
    <p class="popup-title">${escapeHtml(`${capitalize(t("day"))} ${stage.day}`)}</p>
    <p class="popup-meta">${escapeHtml(t("endOfStage", stageEndLabel(stage)))}</p>
    <p class="popup-meta">${escapeHtml(t("distanceFromStartLabel", formatDistance(stage.endRouteDistanceMeters)))}</p>
    <p class="popup-meta">${escapeHtml(t("fuel"))}: ${escapeHtml(suggestionNames(stage.fuelStops))}</p>
    <p class="popup-meta">${escapeHtml(t("lodging"))}/${escapeHtml(t("campgrounds").toLowerCase())}: ${escapeHtml(suggestionNames(stage.lodging))}</p>
  `;
}

function placeIcon(type) {
  const style = markerStyles[type] || markerStyles.food;
  return L.divIcon({
    className: `poi-marker poi-marker-${type}`,
    html: `<span style="background:${style.color}">${style.symbol}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

function stageIcon(day) {
  return L.divIcon({
    className: "stage-marker",
    html: `<span>${day}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function suggestionNames(items) {
  if (!items || items.length === 0) {
    return t("noneNearStageEnd");
  }
  return items
    .slice(0, 3)
    .map((item) => `${item.name} (${formatDistance(item.distanceFromStageEndMeters)})`)
    .join(", ");
}

function stageEndLabel(stage) {
  const nearby = [...(stage.lodging || []), ...(stage.fuelStops || [])].sort(
    (a, b) => a.distanceFromStageEndMeters - b.distanceFromStageEndMeters,
  );

  if (nearby.length > 0 && nearby[0].distanceFromStageEndMeters <= 5000) {
    return t("near", nearby[0].name);
  }

  return compactCoordinate(stage.endLat, stage.endLon);
}

function compactCoordinate(lat, lon) {
  return `${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`;
}

function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("error", isError);
}

function updateNearbyDescription() {
  nearbyDescription.textContent = t("searchNearbyDescription", Number(nearbyRadiusInput.value));
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    for (const pair of element.dataset.i18nAttr.split(",")) {
      const [attribute, key] = pair.split(":");
      element.setAttribute(attribute, t(key));
    }
  });

  if (!currentFile && places.length === 0 && stages.length === 0) {
    setStatus(t("initialStatus"), false);
  }

  renderLayerControl();
  updateNearbyDescription();
  updateResultTitle();
  updateRouteBuilderSummary();
  setTrailSyncState(currentTrailSyncState);
  renderPlaces();
  renderStages();
  if (nextStartKm !== null) {
    nextSegmentButton.textContent = t("searchNextSegment");
  }
}

function updateResultTitle() {
  resultsTitle.textContent = searchMode === "nearby" ? t("matchesNearby") : t("matchesAlongRoute");
}

function renderLayerControl() {
  if (layerControl) {
    layerControl.remove();
  }

  layerControl = L.control
    .layers(
      {
        [t("layerStandard")]: standardLayer,
        [t("layerSatellite")]: satelliteLayer,
      },
      {
        [t("layerPoi")]: markerLayer,
        [t("layerStages")]: stageLayer,
        [t("layerLocation")]: locationLayer,
        [t("layerBuiltRoute")]: waypointLayer,
        [t("layerHikingTrails")]: trailLayer,
      },
      {
        position: "topright",
        collapsed: false,
      },
    )
    .addTo(map);
}

function scheduleMapResize(options = {}) {
  const repeat = Boolean(options.repeat);
  if (resizeFrame !== null) {
    cancelAnimationFrame(resizeFrame);
  }

  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = null;
    map.invalidateSize({ animate: false, pan: false });

    if (repeat) {
      setTimeout(() => map.invalidateSize({ animate: false, pan: false }), 120);
      setTimeout(() => map.invalidateSize({ animate: false, pan: false }), 350);
      setTimeout(() => map.invalidateSize({ animate: false, pan: false }), 800);
    }
  });
}

function typeLabel(type) {
  return {
    fuel: t("typeFuel"),
    hotel: t("typeHotel"),
    camping: t("typeCamping"),
    campground: t("typeCampground"),
    shelter: t("typeShelter"),
    food: t("typeFood"),
  }[type] || t("placeFallback");
}

function formatDistance(meters) {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) {
    return `${remainingMinutes} min`;
  }
  return `${hours} h ${remainingMinutes.toString().padStart(2, "0")} min`;
}

function safeGpxFilename(file) {
  const name = file && file.name ? file.name : "route.gpx";
  const safeName = name.replace(/[^A-Za-z0-9._-]/g, "_");
  return safeName.toLowerCase().endsWith(".gpx") ? safeName : "route.gpx";
}

function shouldPreferJsonUpload() {
  return window.location.protocol === "https:" || window.location.hostname.endsWith("onrender.com");
}

async function readFileText(file) {
  if (typeof file.text === "function") {
    return file.text();
  }

  if (typeof file.arrayBuffer === "function" && "TextDecoder" in window) {
    const content = await file.arrayBuffer();
    return new TextDecoder("utf-8").decode(content);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error(t("analyzeFailed"))));
    reader.readAsText(file);
  });
}

function placeCountLabel(count) {
  return `${count} ${count === 1 ? t("place") : t("places")}`;
}

function dayCountLabel(count) {
  return `${count} ${count === 1 ? t("day") : t("days")}`;
}

function stopCountLabel(items) {
  const count = items ? items.length : 0;
  return `${count} ${count === 1 ? t("stop") : t("stops")}`;
}

function t(key, ...args) {
  const dictionary = translations[currentLanguage] || translations.en;
  const value = dictionary[key] || translations.en[key] || key;
  return typeof value === "function" ? value(...args) : value;
}

function localizeServerError(message) {
  if (!message || currentLanguage === "sv") {
    return message;
  }

  const serverErrors = {
    "Välj sökradie 0.5, 1, 2, 5 eller 10 km.": "Choose search radius 0.5, 1, 2, 5 or 10 km.",
    "Dagsetapp måste vara mellan 50 och 1000 km.": "Daily stage must be between 50 and 1000 km.",
    "GPX-filen är tom.": "The GPX file is empty.",
    "Det finns ingen återstående rutt att analysera.": "There is no remaining route to analyze.",
    "Kunde inte läsa GPX-filen.": "Could not read the GPX file.",
    "GPX-filen måste innehålla minst två punkter.": "The GPX file must contain at least two points.",
    "Kunde inte ansluta till OpenStreetMap Overpass API. Kontrollera internetanslutningen och försök igen.":
      "Could not connect to the OpenStreetMap Overpass API. Check the internet connection and try again.",
    "Alla Overpass-servrar är tillfälligt upptagna. Försök igen om en stund eller testa en kortare rutt.":
      "All Overpass servers are temporarily busy. Try again later or use a shorter route.",
    "Kunde inte ansluta till någon Overpass-server. Kontrollera internetanslutningen och försök igen.":
      "Could not connect to any Overpass server. Check the internet connection and try again.",
    "Minst två punkter krävs för routing.": "At least two points are required for routing.",
    "Ogiltig koordinat.": "Invalid coordinate.",
    "Okänd routingprofil.": "Unknown routing profile.",
    "Routingmotorn hann inte svara.": "The routing engine timed out.",
    "Kunde inte ansluta till routingmotorn.": "Could not connect to the routing engine.",
    "Routingmotorn returnerade ingen användbar linje.": "The routing engine did not return a usable line.",
    "Zooma in för att visa vandringsleder.": "Zoom in to show hiking trails.",
    "Kunde inte hämta vandringsleder från Overpass API.": "Could not fetch hiking trails from Overpass API.",
    "Hikingsegmentet är för långt för lokal led-routing. Lägg fler waypoints närmare varandra.":
      "The hiking segment is too long for local trail routing. Add more waypoints closer together.",
    "Ingen routbar vandringsled hittades nära punkterna.":
      "No routable hiking trail was found near the points.",
    "Kunde inte snappa punkterna till en vandringsled. Klicka närmare en markerad led.":
      "Could not snap the points to a hiking trail. Click closer to a marked trail.",
    "Ingen sammanhängande vandringsled hittades mellan punkterna. Lägg en mellanpunkt längs leden.":
      "No connected hiking trail was found between the points. Add an intermediate point along the trail.",
    "Overpass API är inte konfigurerat för hiking-routing.":
      "Overpass API is not configured for hiking routing.",
  };

  if (serverErrors[message]) {
    return serverErrors[message];
  }

  return message
    .replace("Overpass API svarade med HTTP", "Overpass API responded with HTTP")
    .replace("Försök igen eller använd en kortare rutt.", "Try again or use a shorter route.")
    .replace("Overpass API är tillfälligt otillgängligt", "Overpass API is temporarily unavailable")
    .replace("Försök igen om en stund.", "Try again later.")
    .replace("Rutten är för lång för MVP-sökningen. Använd en rutt på högst cirka", "The route is too long for the MVP search. Use a route of at most about");
}

function userFacingError(error) {
  const message = String(error && error.message ? error.message : error || "");
  if (error && typeof error.code === "number" && "GeolocationPositionError" in window) {
    if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
      return currentLanguage === "sv"
        ? "Ge platsåtkomst i webbläsaren och försök igen."
        : "Allow location access in the browser and try again.";
    }
    if (error.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
      return currentLanguage === "sv"
        ? "Din position kunde inte hämtas just nu."
        : "Your position is not available right now.";
    }
    if (error.code === GeolocationPositionError.TIMEOUT) {
      return currentLanguage === "sv"
        ? "Det tog för lång tid att hämta positionen."
        : "Getting your position took too long.";
    }
  }
  if (isBrowserPatternError(error)) {
    return currentLanguage === "sv"
      ? "Webbläsaren blockerade uppladdningen. Prova att flytta GPX-filen till Filer/Hämtade filer och välj den igen."
      : "The browser blocked the upload. Try moving the GPX file to Files/Downloads and choose it again.";
  }
  return message || t("analyzeFailed");
}

function isBrowserPatternError(error) {
  const message = String(error && error.message ? error.message : error || "");
  return message.includes("string did not match the expected pattern");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char];
  });
}
