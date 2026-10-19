import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { ApiError, asyncHandler, zodToApiError } from '../middleware/error-handler.js'
import { getOrCreateSessionId } from '../middleware/session-id.js'
import { loadCart } from '../services/cart-service.js'

const addItemSchema = z.object({
  courseId: z.string().min(1, 'courseId is required.'),
  quantity: z.number().int().min(1).max(10).optional()
})

const patchItemSchema = z.object({
  quantity: z.number().int().min(0).max(10)
})

function courseExists(courseId: string): boolean {
  const row = db.prepare('SELECT 1 AS exists_flag FROM courses WHERE id = ?').get(courseId)
  return row !== undefined
}

function cartLineExists(sessionId: string, courseId: string): boolean {
  const row = db
    .prepare('SELECT 1 AS x FROM cart_lines WHERE session_id = ? AND course_id = ?')
    .get(sessionId, courseId)
  return row !== undefined
}

function upsertLine(sessionId: string, courseId: string, addQty: number): void {
  const existing = db
    .prepare('SELECT quantity FROM cart_lines WHERE session_id = ? AND course_id = ?')
    .get(sessionId, courseId) as { quantity: number } | undefined

  if (existing) {
    const next = Math.min(10, existing.quantity + addQty)
    db.prepare('UPDATE cart_lines SET quantity = ? WHERE session_id = ? AND course_id = ?').run(
      next,
      sessionId,
      courseId
    )
    return
  }

  db.prepare(
    'INSERT INTO cart_lines (session_id, course_id, quantity, added_at) VALUES (?, ?, ?, ?)'
  ).run(sessionId, courseId, addQty, new Date().toISOString())
}

export const cartRouter = Router()

cartRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const sid = getOrCreateSessionId(req)
    res.status(200).json({ cart: loadCart(sid) })
  })
)

cartRouter.post(
  '/items',
  asyncHandler(async (req, res) => {
    const parsed = addItemSchema.safeParse(req.body)
    if (!parsed.success) throw zodToApiError(parsed.error)
    const { courseId, quantity } = parsed.data

    if (!courseExists(courseId)) {
      throw new ApiError(404, 'course_not_found', 'No course with that id.')
    }

    const sid = getOrCreateSessionId(req)
    upsertLine(sid, courseId, quantity ?? 1)
    res.status(201).json({ cart: loadCart(sid) })
  })
)

cartRouter.patch(
  '/items/:courseId',
  asyncHandler(async (req, res) => {
    const courseId = req.params.courseId
    if (!courseId) {
      throw new ApiError(404, 'cart_item_not_found', 'No cart line for that course.')
    }

    const parsed = patchItemSchema.safeParse(req.body)
    if (!parsed.success) throw zodToApiError(parsed.error)
    const { quantity } = parsed.data

    const sid = getOrCreateSessionId(req)

    if (!cartLineExists(sid, courseId)) {
      throw new ApiError(404, 'cart_item_not_found', 'No cart line for that course.')
    }

    if (quantity === 0) {
      db.prepare('DELETE FROM cart_lines WHERE session_id = ? AND course_id = ?').run(sid, courseId)
      res.status(200).json({ cart: loadCart(sid) })
      return
    }

    db.prepare('UPDATE cart_lines SET quantity = ? WHERE session_id = ? AND course_id = ?').run(
      quantity,
      sid,
      courseId
    )
    res.status(200).json({ cart: loadCart(sid) })
  })
)

cartRouter.delete(
  '/items/:courseId',
  asyncHandler(async (req, res) => {
    const courseId = req.params.courseId
    if (!courseId) {
      throw new ApiError(404, 'cart_item_not_found', 'No cart line for that course.')
    }

    const sid = getOrCreateSessionId(req)
    if (!cartLineExists(sid, courseId)) {
      throw new ApiError(404, 'cart_item_not_found', 'No cart line for that course.')
    }

    db.prepare('DELETE FROM cart_lines WHERE session_id = ? AND course_id = ?').run(sid, courseId)
    res.status(200).json({ cart: loadCart(sid) })
  })
)
