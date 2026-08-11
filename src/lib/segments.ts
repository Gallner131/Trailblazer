import { haversine } from './geo'

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
]

const MIN_LEN = 100
const MAX_LEN = 1000

const query = (lat: number, lng: number, radius: number): string => `
[out:json][timeout:30];
way["highway"~"^(footway|path|cycleway|pedestrian|track|residential|living_street|unclassified|tertiary|secondary)$"]["name"]["foot"!="no"]["access"!="private"](around:${radius},${lat},${lng});
out geom;`

const wayLength = (g: Array<{ lat: number; lon: number }>): number => {
  let d = 0
  for (let i = 1; i < g.length; i++) {
    d += haversine([g[i - 1].lat, g[i - 1].lon], [g[i].lat, g[i].lon])
  }
  return d
}

const TIMEOUT_MS = 18000

const fetchTimeout = (url: string, opts: RequestInit, ms: number): Promise<Response> => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t))
}

export interface Candidate {
  id: number
  name: string
  surface: string
  highway: string
  len: number
  geom: Array<[number, number]>
}

export const fetchSegments = async (
  lat: number,
  lng: number,
  radius: number,
  onStatus?: (msg: string) => void
): Promise<{ elements: any[]; source: string }> => {
  let lastErr: Error | null = null

  for (let i = 0; i < OVERPASS.length; i++) {
    const url = OVERPASS[i]
    const host = new URL(url).host
    onStatus?.(`Searching OpenStreetMap within ${radius} m\n(server ${i + 1} of ${OVERPASS.length}: ${host})`)

    const t0 = Date.now()
    try {
      const r = await fetchTimeout(
        url,
        {
          method: 'POST',
          body: 'data=' + encodeURIComponent(query(lat, lng, radius)),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        },
        TIMEOUT_MS
      )
      if (!r.ok) throw new Error('HTTP ' + r.status + ' from ' + host)
      onStatus?.(`Reading the map data back (${((Date.now() - t0) / 1000).toFixed(0)}s)…`)
      const j = await r.json()
      if (!j.elements) throw new Error('Unexpected response from ' + host)
      return { elements: j.elements, source: host }
    } catch (e) {
      lastErr =
        e instanceof Error && e.name === 'AbortError'
          ? new Error(host + ' did not answer within ' + TIMEOUT_MS / 1000 + 's')
          : new Error(host + ': ' + ((e as any)?.message || e))
    }
  }

  throw lastErr || new Error('Every OpenStreetMap server failed')
}

export const buildCandidates = (elements: any[]): Candidate[] => {
  const seen = new Set<string>()
  const out: Candidate[] = []

  for (const w of elements) {
    if (!w.geometry || w.geometry.length < 2 || !w.tags || !w.tags.name) continue
    const len = wayLength(w.geometry)
    if (len < MIN_LEN || len > MAX_LEN) continue
    const k = w.tags.name + '|' + Math.round(len / 25)
    if (seen.has(k)) continue
    seen.add(k)
    out.push({
      id: w.id,
      name: w.tags.name,
      surface: w.tags.surface || w.tags.highway.replace(/_/g, ' '),
      highway: w.tags.highway,
      len: Math.round(len),
      geom: w.geometry.map((p: any) => [p.lat, p.lon])
    })
  }

  return out.sort((a, b) => a.id - b.id)
}

export const hashDayKey = (str: string): number => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const pickToday = (cands: Candidate[], cell: string, dayKey: string): Candidate => {
  return cands[hashDayKey(dayKey + '|' + cell) % cands.length]
}
