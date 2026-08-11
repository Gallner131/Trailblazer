export const mmss = (seconds: number): string => {
  seconds = Math.max(0, seconds)
  let m = Math.floor(seconds / 60)
  let s = Math.round(seconds - m * 60)
  if (s === 60) {
    m++
    s = 0
  }
  return m + ':' + String(s).padStart(2, '0')
}

export const paceStr = (sec: number, distance: number): string => {
  return mmss(sec / (distance / 1000)) + ' /km'
}

export const ordinal = (n: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
}

export const initials = (name: string | null): string => {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export const avatarColor = (name: string | null): string => {
  let h = 0
  for (const c of name || '') {
    h = (h * 31 + c.charCodeAt(0)) % 360
  }
  return `hsl(${h} 46% 52%)`
}

export const cellOf = (lat: number, lng: number): string => {
  return lat.toFixed(2) + ',' + lng.toFixed(2)
}
