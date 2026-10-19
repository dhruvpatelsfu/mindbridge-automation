// Deterministic placeholder thumbnail derived from a course id. Renders an
// inline SVG gradient as a data URL, so course images are visible offline,
// reproducible in tests, and require no external dependencies.
const PALETTES: ReadonlyArray<readonly [string, string]> = [
  ['#6366f1', '#a855f7'],
  ['#14b8a6', '#06b6d4'],
  ['#f97316', '#f43f5e'],
  ['#10b981', '#84cc16'],
  ['#d946ef', '#ec4899'],
  ['#0ea5e9', '#3b82f6']
]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function courseThumbnailUrl(courseId: string): string {
  const idx = hashString(courseId) % PALETTES.length
  const [from, to] = PALETTES[idx] ?? PALETTES[0]!
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
