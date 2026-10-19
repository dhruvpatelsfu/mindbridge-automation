import type { RequestHandler } from 'express'
import { ApiError } from './error-handler.js'
import { findUserById } from '../services/auth-service.js'
import type { UserRole } from '../types/user.js'

function readSessionUserId(req: Parameters<RequestHandler>[0]): string | null {
  if (!req.session) return null
  const raw = (req.session as { user_id?: unknown }).user_id
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const userId = readSessionUserId(req)
  if (!userId) {
    next(new ApiError(401, 'unauthenticated', 'No active session.'))
    return
  }

  const user = findUserById(userId)
  if (!user) {
    if (req.session) {
      ;(req.session as { user_id?: string | null }).user_id = null
    }
    next(new ApiError(401, 'unauthenticated', 'No active session.'))
    return
  }

  req.user = user
  next()
}

export function requireRole(role: UserRole): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new ApiError(401, 'unauthenticated', 'No active session.'))
      return
    }
    if (req.user.role !== role) {
      next(new ApiError(403, 'forbidden', 'Insufficient permissions.'))
      return
    }
    next()
  }
}
