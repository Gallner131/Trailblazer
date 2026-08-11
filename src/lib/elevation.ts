export interface ElevationData {
  prof: number[]
  up: number
  down: number
  grade: number
  src: string
}

const fetchTimeout = (url: string, opts: RequestInit, ms: number): Promise<Response> => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t))
}

export const fetchElevation = async (
  geom: Array<[number, number]>,
  onStatus?: (msg: string) => void
): Promise<ElevationData | null> => {
  onStatus?.('Fetching elevation profile…')

  try {
    const step = Math.max(1, Math.ceil(geom.length / 99))
    const pts = geom.filter((_, i) => i % step === 0)
    if (pts[pts.length - 1] !== geom[geom.length - 1]) {
      pts.push(geom[geom.length - 1])
    }

    const locs = pts.map((p) => p[0].toFixed(6) + ',' + p[1].toFixed(6)).join('|')
    const r = await fetchTimeout(
      'https://api.opentopodata.org/v1/srtm30m?locations=' + encodeURIComponent(locs),
      {},
      12000
    )

    if (!r.ok) throw new Error('HTTP ' + r.status)
    const j = (await r.json()) as any
    if (j.status !== 'OK' || !j.results) throw new Error(j.error || 'bad response')

    let raw = j.results.map((x: any) => x.elevation).filter((v: any) => typeof v === 'number')
    if (raw.length < 3) throw new Error('no elevation returned')

    const prof = raw.map((_: number, i: number) => {
      const a = Math.max(0, i - 1)
      const b = Math.min(raw.length - 1, i + 1)
      return (raw[a] + raw[i] + raw[b]) / 3
    })

    let up = 0,
      down = 0
    for (let i = 1; i < prof.length; i++) {
      const d = prof[i] - prof[i - 1]
      d > 0 ? (up += d) : (down -= d)
    }

    const totalDist = geom.reduce((sum, _, i) => {
      if (i === 0) return sum
      const prev = geom[i - 1]
      const curr = geom[i]
      const dLat = toRad(curr[0] - prev[0])
      const dLng = toRad(curr[1] - prev[1])
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(prev[0])) * Math.cos(toRad(curr[0])) * Math.sin(dLng / 2) ** 2
      return sum + 2 * 6371000 * Math.asin(Math.sqrt(a))
    }, 0)

    return {
      prof,
      up: Math.round(up),
      down: Math.round(down),
      grade: +((prof[prof.length - 1] - prof[0]) / totalDist * 100).toFixed(1),
      src: 'SRTM 30 m via opentopodata.org'
    }
  } catch (e) {
    console.error('Elevation fetch failed:', e)
    return null
  }
}

const toRad = (deg: number) => (deg * Math.PI) / 180
