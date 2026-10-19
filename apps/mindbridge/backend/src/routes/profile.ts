import { Router } from 'express'
import { z } from 'zod'
import { ApiError, asyncHandler, zodToApiError } from '../middleware/error-handler.js'
import { requireAuth } from '../middleware/auth.js'
import {
  updateProfileForUser,
  getProfileForUser,
  type ProfileUpdateInput
} from '../services/profile-service.js'
import { SUBSCRIPTION_TIERS } from '../types/profile.js'

const updateSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be empty.').max(100).optional(),
    dateOfBirth: z.string().trim().max(20).nullable().optional(),
    region: z.string().trim().max(80).nullable().optional(),
    subscriptionTier: z.enum(SUBSCRIPTION_TIERS).nullable().optional()
  })
  .strict()

function normaliseNullable(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return value.trim().length === 0 ? null : value
}

export const profileRouter = Router()

profileRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'unauthenticated', 'No active session.')
    res.status(200).json({ profile: getProfileForUser(req.user.id) })
  })
)

profileRouter.put(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'unauthenticated', 'No active session.')
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) throw zodToApiError(parsed.error)

    const input: ProfileUpdateInput = {
      name: parsed.data.name,
      dateOfBirth: normaliseNullable(parsed.data.dateOfBirth),
      region: normaliseNullable(parsed.data.region),
      subscriptionTier: parsed.data.subscriptionTier
    }

    const profile = updateProfileForUser(req.user.id, input)
    res.status(200).json({ profile })
  })
)
