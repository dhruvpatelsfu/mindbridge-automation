import type { RequestHandler } from 'express'
import { ulid } from 'ulid'

// cookie-session typings expose req.session as CookieSessionInterfaces.CookieSessionObject | null.
// We pin a stable per-session id (sid) so the cart can key off it without needing a users table.
export function getOrCreateSessionId(req: Parameters<RequestHandler>[0]): string {
  if (!req.session) {
    throw new Error('cookie-session middleware not initialised')
  }
  const existing = req.session.sid as unknown
  if (typeof existing === 'string' && existing.length > 0) {
    return existing
  }
  const fresh = ulid()
  req.session.sid = fresh
  return fresh
}
