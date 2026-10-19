import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { ApiError, asyncHandler, zodToApiError } from '../middleware/error-handler.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { getCourseDetail, listCourses } from '../services/course-service.js'
import type { PaginationMeta } from '../types/course.js'
import { rowToUser, type UserRow } from '../types/user.js'

const adminListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  subject: z.string().trim().min(1).max(100).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
})

const patchCourseSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    subject: z.string().trim().min(1).max(100).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    price: z.number().min(0).max(10_000).optional(),
    description: z.string().trim().min(1).max(10_000).optional(),
    image: z.string().trim().max(500).optional(),
    instructorId: z.string().trim().min(1).max(100).optional(),
    featured: z.boolean().optional()
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be supplied.'
  })

const usersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
})

export const adminRouter = Router()

adminRouter.use(requireAuth, requireRole('admin'))

adminRouter.get(
  '/courses',
  asyncHandler(async (req, res) => {
    const parsed = adminListQuerySchema.safeParse(req.query)
    if (!parsed.success) throw zodToApiError(parsed.error)
    const { search, subject, level, page, pageSize } = parsed.data

    const result = listCourses({ search, subject, level, page, pageSize })
    res.status(200).json(result)
  })
)

adminRouter.patch(
  '/courses/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id
    if (!id) throw new ApiError(404, 'course_not_found', 'No course with that id.')

    const parsed = patchCourseSchema.safeParse(req.body)
    if (!parsed.success) throw zodToApiError(parsed.error)
    const patch = parsed.data

    const existing = db.prepare('SELECT id FROM courses WHERE id = ?').get(id)
    if (!existing) throw new ApiError(404, 'course_not_found', 'No course with that id.')

    if (patch.instructorId !== undefined) {
      const inst = db
        .prepare('SELECT id, name FROM users WHERE id = ?')
        .get(patch.instructorId) as { id: string; name: string } | undefined
      if (!inst) {
        throw new ApiError(400, 'validation_error', 'Unknown instructorId.', [
          { field: 'instructorId', message: 'No user with that id.' }
        ])
      }
    }

    const sets: string[] = []
    const params: Array<string | number> = []

    if (patch.title !== undefined) {
      sets.push('title = ?')
      params.push(patch.title)
    }
    if (patch.subject !== undefined) {
      sets.push('subject = ?')
      params.push(patch.subject)
    }
    if (patch.level !== undefined) {
      sets.push('level = ?')
      params.push(patch.level)
    }
    if (patch.price !== undefined) {
      sets.push('price = ?')
      params.push(patch.price)
    }
    if (patch.description !== undefined) {
      sets.push('description = ?')
      params.push(patch.description)
    }
    if (patch.image !== undefined) {
      sets.push('image = ?')
      params.push(patch.image)
    }
    if (patch.instructorId !== undefined) {
      const inst = db
        .prepare('SELECT name FROM users WHERE id = ?')
        .get(patch.instructorId) as { name: string }
      sets.push('instructor_id = ?', 'instructor_name = ?')
      params.push(patch.instructorId, inst.name)
    }
    if (patch.featured !== undefined) {
      sets.push('featured = ?')
      params.push(patch.featured ? 1 : 0)
    }

    sets.push('updated_at = ?')
    params.push(new Date().toISOString())

    params.push(id)
    db.prepare(`UPDATE courses SET ${sets.join(', ')} WHERE id = ?`).run(...params)

    const updated = getCourseDetail(id)
    if (!updated) throw new ApiError(404, 'course_not_found', 'No course with that id.')

    res.status(200).json({ course: updated })
  })
)

adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const parsed = usersListQuerySchema.safeParse(req.query)
    if (!parsed.success) throw zodToApiError(parsed.error)
    const { page, pageSize } = parsed.data

    const totalRow = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }
    const total = totalRow.n
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
    const offset = (page - 1) * pageSize

    const rows = db
      .prepare(
        `SELECT id, email, password_hash, name, role, is_instructor, created_at
         FROM users
         ORDER BY created_at ASC, id ASC
         LIMIT ? OFFSET ?`
      )
      .all(pageSize, offset) as UserRow[]

    const pagination: PaginationMeta = { page, pageSize, total, totalPages }
    res.status(200).json({ users: rows.map(rowToUser), pagination })
  })
)
