const RE = 6371000 // Earth radius in meters

export const toRad = (deg: number) => (deg * Math.PI) / 180

export const haversine = (a: [number, number], b: [number, number]): number => {
  const dLa = toRad(b[0] - a[0])
  const dLo = toRad(b[1] - a[1])
  const s =
    Math.sin(dLa / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLo / 2) ** 2
  return 2 * RE * Math.asin(Math.sqrt(s))
}

export const segmentBearing = (p1: [number, number], p2: [number, number]): number => {
  const dLa = toRad(p2[0] - p1[0])
  const dLo = toRad(p2[1] - p1[1])
  return Math.atan2(
    Math.sin(dLo) * Math.cos(toRad(p2[0])),
    Math.cos(toRad(p1[0])) * Math.sin(toRad(p2[0])) -
      Math.sin(toRad(p1[0])) * Math.cos(toRad(p2[0])) * Math.cos(dLo)
  )
}

export const perpendicularAt = (
  pt: [number, number],
  bearing: number,
  distance = 30
): [[number, number], [number, number]] => {
  const perpBearing = bearing + Math.PI / 2
  return [
    [
      pt[0] + (Math.cos(perpBearing) * distance) / RE / toRad(1),
      pt[1] + (Math.sin(perpBearing) * distance) / RE / toRad(1)
    ],
    [
      pt[0] - (Math.cos(perpBearing) * distance) / RE / toRad(1),
      pt[1] - (Math.sin(perpBearing) * distance) / RE / toRad(1)
    ]
  ]
}

export const lineSegmentIntersection = (
  p1: [number, number],
  p2: [number, number],
  l1: [number, number],
  l2: [number, number]
): [number, number] | null => {
  const x1 = p1[1],
    y1 = p1[0],
    x2 = p2[1],
    y2 = p2[0],
    x3 = l1[1],
    y3 = l1[0],
    x4 = l2[1],
    y4 = l2[0]
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 1e-10) return null
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom
  if (t >= 0 && t <= 1 && u >= -0.1 && u <= 1.1)
    return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])]
  return null
}

export const interpolateTime = (
  p1: [number, number],
  p2: [number, number],
  t1: number,
  t2: number,
  crossing: [number, number]
): number => {
  const d_total = haversine(p1, p2)
  if (d_total < 1) return t2
  const d_to_cross = haversine(p1, crossing)
  return t1 + (t2 - t1) * (d_to_cross / d_total)
}
