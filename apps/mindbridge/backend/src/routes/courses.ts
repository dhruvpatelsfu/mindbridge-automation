import { Router } from 'express'
import { z } from 'zod'
import { ApiError, asyncHandler, zodToApiError } from '../middleware/error-handler.js'
import { getCourseDetail, listCourses } from '../services/course-service.js'
import { getHookBucket } from '../lib/defect-context.js'

const listQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  subject: z.string().trim().min(1).max(100).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
})

interface LoadLatencyConfig {
  endpoint: string
  threshold: number
  minMs: number
  maxMs: number
}

// Concurrency counter only spins up when the defect hook is present. The
// counter is module-scoped because Express handlers are called within the
// same process; clustering multiplies the threshold by the cluster size
// which is acceptable for the lab profile.
let inFlight = 0

// Test seam: when set, replaces the random component of the latency so
// concurrent-request assertions are deterministic without timing flakes.
// Reset to null in test afterEach to restore the production code path.
let latencyOverrideMs: number | null = null

export function __setLatencyMsForTest(ms: number | null): void {
  latencyOverrideMs = ms
}

function pickLatencyMs(cfg: LoadLatencyConfig): number {
  if (latencyOverrideMs !== null) return latencyOverrideMs
  return cfg.minMs + Math.random() * (cfg.maxMs - cfg.minMs)
}

export const coursesRouter = Router()

coursesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    // Fixed per-request latency (not concurrency-gated): when the defect is
    // active a single catalogue search is measurably slow in the Network tab.
    const fixedLatencyMs = getHookBucket<number>('backend-search-latency-ms')[0]
    if (typeof fixedLatencyMs === 'number' && fixedLatencyMs > 0) {
      await new Promise((r) => setTimeout(r, fixedLatencyMs))
    }

    const cfg = getHookBucket<LoadLatencyConfig>('backend-load-latency')[0]
    const gated = cfg !== undefined && cfg.endpoint === 'GET /api/courses'

    if (gated) {
      inFlight += 1
    }
    try {
      if (gated) {
        // Yield once to the event loop so peer requests that arrived in
        // the same I/O turn have a chance to increment the counter
        // before we read its value. Without this every handler sees a
        // count of 1 because the sync path completes before the next
        // request is dispatched.
        await new Promise((r) => setImmediate(r))
        if (inFlight > cfg.threshold) {
          await new Promise((r) => setTimeout(r, pickLatencyMs(cfg)))
        }
      }

      const parsed = listQuerySchema.safeParse(req.query)
      if (!parsed.success) throw zodToApiError(parsed.error)
      const { search, subject, level, featured, page, pageSize } = parsed.data

      const result = listCourses({
        search,
        subject,
        level,
        featured: featured === undefined ? undefined : featured === 'true',
        page,
        pageSize
      })

      res.status(200).json(result)
    } finally {
      if (gated) {
        inFlight -= 1
      }
    }
  })
)

coursesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id
    if (!id) throw new ApiError(404, 'course_not_found', 'No course with that id.')

    const course = getCourseDetail(id)
    if (!course) throw new ApiError(404, 'course_not_found', 'No course with that id.')

    res.status(200).json({ course })
  })
)
