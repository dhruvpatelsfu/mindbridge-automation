import { Router, type Request } from 'express'
import { z } from 'zod'
import { asyncHandler, zodToApiError } from '../middleware/error-handler.js'
import { requireAuth } from '../middleware/auth.js'
import { loginUser, registerUser } from '../services/auth-service.js'
import { listEnrolmentsForUser } from '../services/enrolment-service.js'
import { getHookBucket } from '../lib/defect-context.js'
import { SUBSCRIPTION_TIERS } from '../types/profile.js'

const optionalNonEmpty = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional()

// `name` is intentionally NOT trimmed at the schema layer so a defect can
// observe the raw whitespace and surface the bug. The auth service does the
// defensive trim and rejects a whitespace-only value when the defect hook
// bucket is empty (baseline behaviour).
const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(200),
  name: z.string().min(1).max(100),
  dateOfBirth: optionalNonEmpty(20),
  region: optionalNonEmpty(80),
  subscriptionTier: z.enum(SUBSCRIPTION_TIERS).optional()
})

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200)
})

function setSessionUser(req: Request, userId: string): void {
  if (!req.session) throw new Error('cookie-session middleware not initialised')
  ;(req.session as { user_id?: string | null }).user_id = userId
}

export const authRouter = Router()

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    // A defect can push a sentinel into this bucket to make `clientId` a
    // required field. The frontend never sends it, so the request fails
    // with a 400 that the learner has to discover in DevTools.
    const requireClientId = getHookBucket<unknown>('register-require-client-id').length > 0
    if (requireClientId) {
      const clientId = (req.body as { clientId?: unknown } | null)?.clientId
      if (typeof clientId !== 'string' || clientId.length === 0) {
        res.status(400).json({
          error: {
            code: 'missing_required_field',
            message: 'Missing required field: clientId',
            field: 'clientId'
          }
        })
        return
      }
    }

    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) throw zodToApiError(parsed.error)

    const user = await registerUser(parsed.data)
    setSessionUser(req, user.id)
    res.status(201).json({ user })
  })
)

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) throw zodToApiError(parsed.error)

    const user = await loginUser(parsed.data)
    setSessionUser(req, user.id)
    res.status(200).json({ user })
  })
)

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    if (req.session) {
      ;(req.session as { user_id?: string | null }).user_id = null
    }
    res.status(204).end()
  })
)

export const meRouter = Router()

meRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.status(200).json({ user: req.user })
  })
)

meRouter.get(
  '/enrolments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: { code: 'unauthenticated', message: 'No active session.' } })
      return
    }
    const enrolments = listEnrolmentsForUser(user.id)
    res.status(200).json({ enrolments })
  })
)
