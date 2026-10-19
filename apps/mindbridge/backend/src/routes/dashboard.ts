import { Router } from 'express'
import { ApiError, asyncHandler } from '../middleware/error-handler.js'
import { requireAuth } from '../middleware/auth.js'
import { getHookBucket } from '../lib/defect-context.js'
import { createShareLink, getDashboardSummary } from '../services/dashboard-service.js'

export const dashboardRouter = Router()

dashboardRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'unauthenticated', 'No active session.')
    const summary = getDashboardSummary(req.user.id)

    // A defect can push a sentinel into this bucket to blank the enrolled-
    // courses list while leaving the rest of the dashboard intact, so the page
    // loads with correct user data but the course list section is empty.
    const blankCourses = getHookBucket<unknown>('dashboard-courses-empty').length > 0
    if (blankCourses) {
      summary.grades = []
    }

    res.status(200).json(summary)
  })
)

dashboardRouter.post(
  '/share-link',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'unauthenticated', 'No active session.')

    // A defect can push a sentinel into this bucket to require an
    // undocumented `payload` field on the request body. The current
    // frontend always posts an empty `{}`, so the validation throws
    // and the global error handler emits a generic 500.
    const requirePayload = getHookBucket<unknown>('dashboard-share-link-require-payload').length > 0
    if (requirePayload) {
      const payload = (req.body as { payload?: unknown } | null)?.payload
      if (typeof payload !== 'string' || payload.length === 0) {
        throw new Error('Unhandled: share-link requires a non-empty payload')
      }
    }

    res.status(200).json({ url: createShareLink() })
  })
)
