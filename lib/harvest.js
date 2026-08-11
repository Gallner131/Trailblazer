/**
 * Trailblazer: Segment harvesting
 * OpenStreetMap Overpass API, feature processing
 */

const Harvest = {};

// Build Overpass QL query for a bounding box
// bbox = [south, west, north, east] or {minLat, minLng, maxLat, maxLng}
Harvest.buildOverpassQuery = (bbox) => {
  const [minLat, minLng, maxLat, maxLng] = Array.isArray(bbox)
    ? bbox
    : [bbox.minLat, bbox.minLng, bbox.maxLat, bbox.maxLng];

  // Query for ways tagged as roads/paths/trails, 100-1000m long
  return `
    [out:json][timeout:30];
    (
      way["highway"~"^(primary|secondary|tertiary|unclassified|residential|service|track|path|footway|cycleway)$"](${minLat},${minLng},${maxLat},${maxLng});
    );
    out center geom;
  `.trim();
};

// Query Overpass API
Harvest.queryOverpass = async (bbox) => {
  const query = Harvest.buildOverpassQuery(bbox);
  const url = window.AppConstants.OVERPASS_API;

  console.log('Harvest: querying Overpass at', url);
  console.log('Query:', query.substring(0, 100) + '...');

  const promise = fetch(url, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
    .then(r => {
      if (!r.ok) throw new Error(`Overpass query failed: ${r.status} ${r.statusText}`);
      return r.json();
    });

  try {
    const data = await window.AppAPI.withTimeout(promise, window.AppConstants.TIMEOUTS.overpass);
    console.log('Harvest: Overpass query succeeded, got', data.elements?.length || 0, 'elements');
    return { data };
  } catch (error) {
    console.error('Harvest: Overpass query failed', {
      name: error.name,
      message: error.message,
      isAbortError: error.name === 'AbortError'
    });
    return { error };
  }
};

// Compute segment bounds and centre
function computeSegmentBounds(coords) {
  // coords = [[lat, lng], ...]
  let minLat = coords[0][0], maxLat = coords[0][0];
  let minLng = coords[0][1], maxLng = coords[0][1];

  for (const [lat, lng] of coords) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  return {
    start_lat: coords[0][0],
    start_lng: coords[0][1],
    end_lat: coords[coords.length - 1][0],
    end_lng: coords[coords.length - 1][1],
    centre_lat: (minLat + maxLat) / 2,
    centre_lng: (minLng + maxLng) / 2,
    minLat, maxLat, minLng, maxLng
  };
}

// Compute segment length in metres
function computeLength(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += window.AppUtils.haversine(
      coords[i - 1][0], coords[i - 1][1],
      coords[i][0], coords[i][1]
    );
  }
  return Math.round(total);
}

// Compute cell (lat/lng to 2dp, ~1.1 km grid)
function computeCell(lat, lng) {
  return (Math.round(lat * 100) / 100) + ',' + (Math.round(lng * 100) / 100);
}

// Process Overpass features into segment rows
// Filters by length (100-1000m), dedupes by cell
Harvest.processSegments = (features) => {
  const segments = [];
  const seenCells = new Set();

  for (const feature of features) {
    if (feature.geometry.type !== 'LineString') continue;
    if (!feature.properties.name && !feature.tags.name) continue;

    const coords = feature.geometry.coordinates
      .map(([lng, lat]) => [lat, lng]);  // Flip to [lat, lng]

    const length_m = computeLength(coords);
    if (length_m < 100 || length_m > 1000) continue;

    const bounds = computeSegmentBounds(coords);
    const cell = computeCell(bounds.centre_lat, bounds.centre_lng);

    // Dedupe by cell (one segment per ~1.1km grid)
    if (seenCells.has(cell)) continue;
    seenCells.add(cell);

    segments.push({
      id: feature.id,  // OSM way ID
      name: feature.tags.name || feature.tags.ref || 'Unnamed',
      highway: feature.tags.highway || 'unknown',
      surface: feature.tags.surface || null,
      length_m: length_m,
      geom: JSON.stringify(coords),  // Store as JSON
      start_lat: bounds.start_lat,
      start_lng: bounds.start_lng,
      end_lat: bounds.end_lat,
      end_lng: bounds.end_lng,
      centre_lat: bounds.centre_lat,
      centre_lng: bounds.centre_lng,
      cell: cell,
      climb_m: null,  // Will be filled by elevation service (section 6)
      net_grade: null,
      elevation: null,
      approved: true
    });
  }

  return segments;
};

// Full harvest: query Overpass, process, insert
Harvest.harvestArea = async (lat, lng, radiusKm = 2) => {
  // Rough bbox (1 degree ~111 km)
  const delta = radiusKm / 111;
  const bbox = {
    minLat: lat - delta,
    minLng: lng - delta,
    maxLat: lat + delta,
    maxLng: lng + delta
  };

  // Query Overpass
  const { data: features, error: queryErr } = await Harvest.queryOverpass(bbox);
  if (queryErr) {
    return { error: queryErr };
  }

  if (!features || !features.elements) {
    return { error: new Error('Invalid Overpass response') };
  }

  // Process features
  const segments = Harvest.processSegments(features.elements);
  if (segments.length === 0) {
    return { count: 0, inserted: 0, error: null };
  }

  // Insert into Supabase (ignore duplicates by id)
  const { error: insertErr } = await window.AppAPI.insertSegments(segments);
  if (insertErr) {
    return { error: insertErr };
  }

  return { count: features.elements.length, inserted: segments.length, error: null };
};

// Export to window
window.AppHarvest = Harvest;
