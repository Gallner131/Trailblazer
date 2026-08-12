(function () {
  const OVERPASS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.osm.ch/api/interpreter'
  ];
  const HIGHWAYS = 'footway|path|cycleway|pedestrian|residential|living_street|unclassified|tertiary';
  const MIN_LEN = 100, MAX_LEN = 1000;

  function buildOverpassQuery(lat, lng, radius) {
    return `[out:json][timeout:60];
way["highway"~"^(${HIGHWAYS})$"]["name"]["foot"!="no"]["access"!="private"](around:${radius},${lat},${lng});
out geom;`;
  }

  function fetchTimeout(url, opts, ms) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    return fetch(url, Object.assign({}, opts, { signal: c.signal }))
      .finally(() => clearTimeout(t));
  }

  async function queryOverpass(lat, lng, radius) {
    let lastErr = null;
    for (const url of OVERPASS) {
      try {
        const r = await fetchTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(buildOverpassQuery(lat, lng, radius))
        }, 90000);
        if (!r.ok) throw new Error('HTTP ' + r.status + ' from ' + new URL(url).host);
        const j = await r.json();
        if (!j.elements) throw new Error('No elements from ' + new URL(url).host);
        return j.elements;
      } catch (e) {
        lastErr = new Error(new URL(url).host + ': ' + (e.message || e));
      }
    }
    throw lastErr;
  }

  function processSegments(elements) {
    const seen = new Set(), out = [];
    for (const w of elements) {
      if (!w.geometry || w.geometry.length < 2 || !w.tags || !w.tags.name) continue;
      const coords = w.geometry.map(p => [p.lat, p.lon]);
      const len = window.AppUtils.pathLength(coords);
      if (len < MIN_LEN || len > MAX_LEN) continue;

      // dedupe by name + approximate length, NOT by grid cell.
      // deduping by cell leaves one segment per kilometre and the map is empty.
      const key = w.tags.name + '|' + Math.round(len / 25);
      if (seen.has(key)) continue;
      seen.add(key);

      const first = coords[0], last = coords[coords.length - 1];
      const mid = coords[Math.floor(coords.length / 2)];
      out.push({
        id: w.id,
        name: w.tags.name,
        highway: w.tags.highway,
        surface: w.tags.surface || null,
        length_m: Math.round(len),
        geom: coords,
        start_lat: first[0], start_lng: first[1],
        end_lat: last[0],  end_lng: last[1],
        centre_lat: mid[0], centre_lng: mid[1],
        cell: window.AppUtils.cellOf(mid[0], mid[1])
      });
    }
    return out;
  }

  async function harvestArea(lat, lng, radius = 1500, onProgress) {
    if (onProgress) onProgress('Searching OpenStreetMap…');
    const elements = await queryOverpass(lat, lng, radius);
    if (onProgress) onProgress(`Found ${elements.length} paths, filtering…`);
    const rows = processSegments(elements);
    if (!rows.length) return { inserted: 0, found: elements.length };

    // MUST use the signed-in browser client. RLS requires the user's JWT.
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await window.supabaseClient
        .from('segments').upsert(batch, { onConflict: 'id' });
      if (error) throw new Error('Insert failed: ' + error.message);
      inserted += batch.length;
      if (onProgress) onProgress(`Saved ${inserted} of ${rows.length}…`);
    }
    return { inserted, found: elements.length };
  }

  window.AppHarvest = { buildOverpassQuery, queryOverpass, processSegments, harvestArea };
})();
