import { Router } from 'express'
import { z } from 'zod'
import { ApiError, asyncHandler, zodToApiError } from '../middleware/error-handler.js'
import { requireAuth } from '../middleware/auth.js'
import { getHookBucket } from '../lib/defect-context.js'

const practiceSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(1, 'Topic is required.')
    .max(200, 'Topic must be 200 characters or fewer.')
})

function buildQuestions(topic: string): string[] {
  return [
    `What are the foundational concepts of ${topic}?`,
    `Give a concrete real-world application of ${topic}.`,
    `Identify a common misconception about ${topic} and explain why it is wrong.`,
    `Describe a step-by-step exercise that builds intuition for ${topic}.`,
    `Compare ${topic} to a related discipline and explain the key differences.`
  ]
}

export const practiceRouter = Router()

practiceRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'unauthenticated', 'No active session.')
    const parsed = practiceSchema.safeParse(req.body)
    if (!parsed.success) throw zodToApiError(parsed.error)
    const { topic } = parsed.data

    // A defect can push a positive number into this bucket to make the
    // handler await before responding; the client sees a long-running
    // request that eventually resolves with the same payload.
    const latencyMs = getHookBucket<number>('backend-practice-latency-ms')[0]
    if (typeof latencyMs === 'number' && latencyMs > 0) {
      await new Promise((r) => setTimeout(r, latencyMs))
    }

    res.status(200).json({ topic, questions: buildQuestions(topic) })
  })
)
