import { Router } from 'express'
import { z } from 'zod'
import { ulid } from 'ulid'
import { db } from '../db/index.js'
import { ApiError, asyncHandler, zodToApiError } from '../middleware/error-handler.js'
import { requireAuth } from '../middleware/auth.js'
import { parseLenientDob } from '../lib/dob-parser.js'
import { getHookBucket } from '../lib/defect-context.js'

const bodySchema = z.object({
  courseId: z.string().trim().min(1, 'courseId is required.'),
  dateOfBirth: z.string()
})

const STRICT_ISO_DOB = /^\d{4}-\d{2}-\d{2}$/

export const enrollmentRouter = Router()

enrollmentRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'unauthenticated', 'No active session.')

    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) throw zodToApiError(parsed.error)

    const { courseId, dateOfBirth } = parsed.data

    // A defect can push a sentinel into this bucket to swap the lenient
    // multi-format DOB parser for a strict regex-only check. Anything
    // that does not match canonical YYYY-MM-DD returns the same 400
    // data_format_mismatch body that the lenient baseline reserves for
    // truly garbage input.
    const strictIsoOnly = getHookBucket<unknown>('enrollment-strict-iso-only').length > 0

    let normalisedDob: string | null
    if (strictIsoOnly) {
      normalisedDob = STRICT_ISO_DOB.test(dateOfBirth) ? dateOfBirth : null
    } else {
      normalisedDob = parseLenientDob(dateOfBirth)
    }

    if (normalisedDob === null) {
      res.status(400).json({
        error: {
          code: 'data_format_mismatch',
          message: 'data format mismatch',
          expected: 'YYYY-MM-DD'
        }
      })
      return
    }

    const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId) as
      | { id: string }
      | undefined
    if (!course) throw new ApiError(404, 'course_not_found', 'No course with that id.')

    const id = `enr_${ulid()}`
    const now = new Date().toISOString()

    db.prepare(
      `INSERT INTO enrolments (id, name, email, course_id, user_id, status, enrolled_at, date_of_birth)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
    ).run(id, req.user.name, req.user.email, courseId, req.user.id, now, normalisedDob)

    res.status(201).json({ enrolmentId: id, normalisedDob })
  })
)
