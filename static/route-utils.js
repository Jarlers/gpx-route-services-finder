(function initRoutePlannerUtils(root) {
  function mergeRouteSegments(segments) {
    const merged = [];
    for (const segment of segments || []) {
      const coordinates = Array.isArray(segment) ? segment : [];
      for (const coordinate of coordinates) {
        if (!Array.isArray(coordinate) || coordinate.length < 2) {
          continue;
        }
        const point = [Number(coordinate[0]), Number(coordinate[1])];
        if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
          continue;
        }
        const previous = merged[merged.length - 1];
        if (previous && nearlyEqual(previous[0], point[0]) && nearlyEqual(previous[1], point[1])) {
          continue;
        }
        merged.push(point);
      }
    }
    return merged;
  }

  function buildGpxDocument(coordinates, options = {}) {
    const validCoordinates = mergeRouteSegments([coordinates]);
    if (validCoordinates.length < 2) {
      throw new Error("A GPX route needs at least two routed track points.");
    }

    const name = escapeXml(options.name || "Planned route");
    const time = escapeXml(options.time || new Date().toISOString());
    const points = validCoordinates
      .map(([lat, lon]) => `      <trkpt lat="${formatCoordinate(lat)}" lon="${formatCoordinate(lon)}"></trkpt>`)
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Route Services" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${name}</name>
    <time>${time}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
  }

  function routeDistanceMeters(coordinates) {
    const validCoordinates = mergeRouteSegments([coordinates]);
    let distance = 0;
    for (let index = 1; index < validCoordinates.length; index += 1) {
      distance += haversineMeters(validCoordinates[index - 1], validCoordinates[index]);
    }
    return Math.round(distance);
  }

  function haversineMeters(a, b) {
    const radius = 6371000;
    const lat1 = toRadians(a[0]);
    const lat2 = toRadians(b[0]);
    const dLat = toRadians(b[0] - a[0]);
    const dLon = toRadians(b[1] - a[1]);
    const value =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  function toRadians(value) {
    return (value * Math.PI) / 180;
  }

  function nearlyEqual(a, b) {
    return Math.abs(a - b) < 0.0000001;
  }

  function formatCoordinate(value) {
    return Number(value).toFixed(6);
  }

  function escapeXml(value) {
    return String(value).replace(/[<>&"']/g, (char) => {
      return {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      }[char];
    });
  }

  const api = {
    buildGpxDocument,
    mergeRouteSegments,
    routeDistanceMeters,
  };

  root.RoutePlannerUtils = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
