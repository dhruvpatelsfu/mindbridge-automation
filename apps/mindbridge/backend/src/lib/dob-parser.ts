// Defensive DOB parser for the enrollment endpoint. Accepts a small set
// of common formats and normalises them to canonical ISO YYYY-MM-DD.
// Ambiguous numeric layouts (e.g. 04/05/1990) prefer ISO when explicit,
// otherwise default to US MM-DD-YYYY ordering. Truly malformed input
// returns null so the caller can return a 400.

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const SLASH_OR_DASH_RE = /^(\d{2})[-/](\d{2})[-/](\d{4})$/

function isValidDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100) return false
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  const d = new Date(Date.UTC(year, month - 1, day))
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  )
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function parseLenientDob(raw: string): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null

  const iso = ISO_RE.exec(trimmed)
  if (iso) {
    const year = Number(iso[1])
    const month = Number(iso[2])
    const day = Number(iso[3])
    if (!isValidDate(year, month, day)) return null
    return `${year}-${pad2(month)}-${pad2(day)}`
  }

  const sd = SLASH_OR_DASH_RE.exec(trimmed)
  if (sd) {
    const a = Number(sd[1])
    const b = Number(sd[2])
    const year = Number(sd[3])

    const usValid = isValidDate(year, a, b)
    const euValid = isValidDate(year, b, a)

    if (usValid) {
      return `${year}-${pad2(a)}-${pad2(b)}`
    }
    if (euValid) {
      return `${year}-${pad2(b)}-${pad2(a)}`
    }
    return null
  }

  return null
}
