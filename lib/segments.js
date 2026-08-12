/**
 * Trailblazer: Segment Harvesting
 * OpenStreetMap harvesting with quality scoring and elevation caching
 * per §6 segment pool architecture
 */

(function () {
  // Overpass API mirrors with fallback
  const OVERPASS_MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.osm.ch/api/interpreter'
  ];

  // Elevation cache: { 'lat,lng': elevation }
  const elevationCache = new Map();

  // Reject specific highway types (highways are motorways, trunk, primary, secondary, tertiary)
  const REJECTED_HIGHWAYS = new Set([
    'motorway', 'trunk', 'primary', 'secondary', 'tertiary'
  ]);

  // Segment length constraints per spec
  const MIN_LEN_M = 300;
  const MAX_LEN_M = 1000;

  /**
   * Build Overpass query for paths and roads within radius
   * @param {number} lat
   * @param {number} lng
   * @param {number} radius - in metres
   * @returns {string} Overpass QL query
   */
  function buildOverpassQuery(lat, lng, radius) {
    return `[out:json][timeout:60];
way["highway"~"^(footway|path|cycleway|pedestrian|residential|living_street|unclassified)$"]["name"]["foot"!="no"]["access"!="private"](around:${radius},${lat},${lng});
out geom;`;
  }

  /**
   * Fetch with timeout and abort controller
   * @param {string} url
   * @param {object} opts - fetch options
   * @param {number} ms - timeout in milliseconds
   * @returns {Promise<Response>}
   */
  function fetchTimeout(url, opts, ms) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    return fetch(url, Object.assign({}, opts, { signal: controller.signal }))
      .finally(() => clearTimeout(timeout));
  }

  /**
   * Query Overpass with 3-mirror fallback
   * @param {number} lat
   * @param {number} lng
   * @param {number} radius
   * @param {function} onProgress - optional progress callback
   * @returns {Promise<Array>} Overpass elements
   */
  async function queryOverpass(lat, lng, radius, onProgress) {
    const query = buildOverpassQuery(lat, lng, radius);
    let lastErr = null;

    for (let i = 0; i < OVERPASS_MIRRORS.length; i++) {
      const url = OVERPASS_MIRRORS[i];
      try {
        if (onProgress) {
          onProgress(`Querying OpenStreetMap (mirror ${i + 1}/${OVERPASS_MIRRORS.length})…`);
        }

        const response = await fetchTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(query)
          },
          35000 // 35s timeout (server is 30s, client must be longer)
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data.elements) {
          throw new Error('No elements in response');
        }

        if (onProgress) {
          onProgress(`Found ${data.elements.length} ways from ${new URL(url).host}`);
        }

        return data.elements;
      } catch (e) {
        const host = new URL(url).hostname;
        lastErr = new Error(`${host}: ${e.message || 'unknown error'}`);
        if (onProgress) {
          onProgress(`${host} failed, trying next mirror…`);
        }
      }
    }

    // All mirrors failed
    throw lastErr || new Error('All Overpass mirrors failed');
  }

  /**
   * Merge segments by name, keeping best quality
   * @param {Array} segments - raw segment objects
   * @returns {Array} merged segments, deduplicated by name
   */
  function mergeByName(segments) {
    const byName = new Map();

    for (const seg of segments) {
      const key = seg.name.toLowerCase().trim();

      if (!byName.has(key)) {
        byName.set(key, seg);
      } else {
        const existing = byName.get(key);
        // Keep the longer one (better quality data typically)
        if (seg.length_m > existing.length_m) {
          byName.set(key, seg);
        }
      }
    }

    return Array.from(byName.values());
  }

  /**
   * Score segment quality 0-100
   * Based on: surface type, geometry completeness, length within ideal range
   * @param {object} segment
   * @returns {number} quality score 0-100
   */
  function scoreQuality(segment) {
    let score = 50; // baseline

    // Surface type quality (0-25 points)
    const surface = (segment.surface || '').toLowerCase();
    if (surface === 'asphalt' || surface === 'concrete') {
      score += 25;
    } else if (surface === 'paved' || surface === 'gravel') {
      score += 15;
    } else if (surface === 'dirt' || surface === 'grass') {
      score += 5;
    } else if (!segment.surface) {
      score += 10; // unknown surface, slight penalty
    }

    // Length in ideal range (0-15 points)
    const ideal_min = 400;
    const ideal_max = 800;
    if (segment.length_m >= ideal_min && segment.length_m <= ideal_max) {
      score += 15;
    } else if (segment.length_m >= MIN_LEN_M && segment.length_m <= MAX_LEN_M) {
      score += 8; // still valid but not ideal
    }

    // Geometry completeness (0-10 points)
    if (segment.geom && segment.geom.length >= 10) {
      score += 10; // well-defined geometry
    } else if (segment.geom && segment.geom.length >= 5) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate path length using haversine distance
   * @param {Array} coords - [[lat,lng], ...]
   * @returns {number} length in metres
   */
  function pathLength(coords) {
    const R = 6371000; // Earth radius in metres
    const rad = d => d * Math.PI / 180;
    const haversine = (a, b) => {
      const dLat = rad(b[0] - a[0]);
      const dLng = rad(b[1] - a[1]);
      const s = Math.sin(dLat / 2) ** 2 +
                Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(s));
    };

    let distance = 0;
    for (let i = 1; i < coords.length; i++) {
      distance += haversine(coords[i - 1], coords[i]);
    }
    return distance;
  }

  /**
   * Smooth elevation profile with 3-point moving average
   * per CLAUDE.md: "Elevation must be smoothed with a 3-point moving average before differencing"
   * @param {Array} elevations - [el0, el1, el2, ...]
   * @returns {Array} smoothed elevations
   */
  function smoothElevation(elevations) {
    if (!elevations || elevations.length === 0) return [];
    if (elevations.length <= 2) return elevations;

    const smoothed = [];
    for (let i = 0; i < elevations.length; i++) {
      if (i === 0) {
        smoothed.push(elevations[0]);
      } else if (i === elevations.length - 1) {
        smoothed.push(elevations[i]);
      } else {
        const avg = (elevations[i - 1] + elevations[i] + elevations[i + 1]) / 3;
        smoothed.push(Math.round(avg * 10) / 10); // 1 decimal place
      }
    }
    return smoothed;
  }

  /**
   * Fetch elevation from opentopodata for a coordinate
   * Uses in-memory cache to avoid duplicate requests
   * @param {number} lat
   * @param {number} lng
   * @returns {Promise<number>} elevation in metres
   */
  async function fetchElevation(lat, lng) {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

    // Check cache
    if (elevationCache.has(cacheKey)) {
      return elevationCache.get(cacheKey);
    }

    try {
      const response = await fetchTimeout(
        `https://api.opentopodata.org/v1/srtm30m?locations=${lat},${lng}`,
        {},
        5000 // 5s timeout for elevation
      );

      if (!response.ok) {
        console.warn(`Elevation API HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const elevation = data.results[0].elevation;
        elevationCache.set(cacheKey, elevation);
        return elevation;
      }

      return null;
    } catch (e) {
      console.warn(`Elevation fetch error: ${e.message}`);
      return null;
    }
  }

  /**
   * Fetch elevation profile for entire segment
   * Samples every Nth point to avoid rate limiting
   * @param {Array} coords - [[lat,lng], ...]
   * @returns {Promise<{elevations: Array, climb_m: number, net_grade: number}>}
   */
  async function fetchElevationProfile(coords) {
    if (!coords || coords.length === 2) {
      return { elevations: null, climb_m: null, net_grade: null };
    }

    // Sample every Nth point to avoid rate limits (max ~50 points)
    const sampleRate = Math.max(1, Math.floor(coords.length / 50));
    const sampled = coords.filter((_, i) => i % sampleRate === 0);

    try {
      const locations = sampled.map(c => `${c[0]},${c[1]}`).join('|');
      const response = await fetchTimeout(
        `https://api.opentopodata.org/v1/srtm30m?locations=${locations}`,
        {},
        10000 // 10s for multi-point request
      );

      if (!response.ok) {
        return { elevations: null, climb_m: null, net_grade: null };
      }

      const data = await response.json();
      if (!data.results || data.results.length === 0) {
        return { elevations: null, climb_m: null, net_grade: null };
      }

      // Cache individual points
      data.results.forEach((result, idx) => {
        if (result.elevation !== null) {
          const coord = sampled[idx];
          const cacheKey = `${coord[0].toFixed(4)},${coord[1].toFixed(4)}`;
          elevationCache.set(cacheKey, result.elevation);
        }
      });

      // Extract elevations and smooth
      const elevations = data.results
        .map(r => r.elevation)
        .filter(e => e !== null);

      if (elevations.length < 2) {
        return { elevations: null, climb_m: null, net_grade: null };
      }

      const smoothed = smoothElevation(elevations);

      // Calculate climb and net grade
      let climb = 0;
      for (let i = 1; i < smoothed.length; i++) {
        const diff = smoothed[i] - smoothed[i - 1];
        if (diff > 0) climb += diff;
      }

      const totalAscent = smoothed[smoothed.length - 1] - smoothed[0];
      const distance = pathLength(coords);
      const netGrade = distance > 0 ? (totalAscent / distance * 100) : 0;

      return {
        elevations: smoothed,
        climb_m: Math.round(climb),
        net_grade: parseFloat(netGrade.toFixed(1))
      };
    } catch (e) {
      console.warn(`Elevation profile error: ${e.message}`);
      return { elevations: null, climb_m: null, net_grade: null };
    }
  }

  /**
   * Process raw Overpass elements into segment objects
   * Filter by length, reject highways, calculate quality
   * @param {Array} elements - Overpass elements
   * @param {function} onProgress - optional progress callback
   * @returns {Promise<Array>} processed segments
   */
  async function processSegments(elements, onProgress) {
    const candidates = [];

    // Filter and normalize
    for (const way of elements) {
      if (!way.geometry || way.geometry.length < 2) continue;
      if (!way.tags || !way.tags.name) continue;
      if (REJECTED_HIGHWAYS.has(way.tags.highway)) continue;

      const coords = way.geometry.map(p => [p.lat, p.lon]);
      const len = pathLength(coords);

      if (len < MIN_LEN_M || len > MAX_LEN_M) continue;

      const first = coords[0];
      const last = coords[coords.length - 1];
      const mid = coords[Math.floor(coords.length / 2)];

      candidates.push({
        id: way.id,
        name: way.tags.name,
        highway: way.tags.highway,
        surface: way.tags.surface || null,
        length_m: Math.round(len),
        geom: coords,
        start_lat: first[0],
        start_lng: first[1],
        end_lat: last[0],
        end_lng: last[1],
        centre_lat: mid[0],
        centre_lng: mid[1],
        cell: `${mid[0].toFixed(2)},${mid[1].toFixed(2)}`
      });
    }

    if (onProgress) {
      onProgress(`Merging ${candidates.length} candidates by name…`);
    }

    // Merge by name to remove duplicates
    const merged = mergeByName(candidates);

    // Score quality and fetch elevation
    const scored = [];
    for (let i = 0; i < merged.length; i++) {
      const seg = merged[i];
      const quality = scoreQuality(seg);

      if (onProgress) {
        onProgress(`Fetching elevation ${i + 1}/${merged.length}…`);
      }

      const { elevations, climb_m, net_grade } = await fetchElevationProfile(seg.geom);

      scored.push({
        ...seg,
        quality_score: quality,
        elevation: elevations,
        climb_m,
        net_grade
      });
    }

    return scored;
  }

  /**
   * Harvest segments from OpenStreetMap around a location
   * @param {number} lat
   * @param {number} lng
   * @param {number} radius - in metres, default 1500
   * @param {function} onProgress - optional progress callback(message)
   * @returns {Promise<{segments: Array, raw_count: number, errors: Array}>}
   */
  async function harvestSegments(lat, lng, radius = 1500, onProgress) {
    const errors = [];

    try {
      if (onProgress) onProgress('Starting segment harvest…');

      const elements = await queryOverpass(lat, lng, radius, onProgress);
      if (onProgress) onProgress(`Retrieved ${elements.length} elements`);

      if (elements.length === 0) {
        return { segments: [], raw_count: 0, errors: ['No ways found in this area'] };
      }

      if (onProgress) onProgress('Processing and scoring segments…');
      const segments = await processSegments(elements, onProgress);

      return {
        segments,
        raw_count: elements.length,
        errors: []
      };
    } catch (e) {
      const msg = e.message || String(e);
      if (onProgress) onProgress(`Error: ${msg}`);
      return {
        segments: [],
        raw_count: 0,
        errors: [msg]
      };
    }
  }

  /**
   * Clear elevation cache (e.g., when switching areas)
   */
  function clearElevationCache() {
    elevationCache.clear();
  }

  // Export public API
  window.AppSegments = {
    harvestSegments,
    queryOverpass,
    buildOverpassQuery,
    processSegments,
    fetchElevationProfile,
    scoreQuality,
    pathLength,
    smoothElevation,
    clearElevationCache,
    elevationCacheSize: () => elevationCache.size
  };
})();
