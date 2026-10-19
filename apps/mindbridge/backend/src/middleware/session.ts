import cookieSession from 'cookie-session'
import type { RequestHandler } from 'express'

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

export const sessionMiddleware: RequestHandler = cookieSession({
  name: 'mb_session',
  keys: [process.env.COOKIE_SECRET ?? 'dev-only-secret-replace-in-prod'],
  maxAge: ONE_WEEK_MS,
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
})
