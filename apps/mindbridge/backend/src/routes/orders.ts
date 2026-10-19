import { Router } from 'express'
import { ApiError, asyncHandler } from '../middleware/error-handler.js'
import { requireAuth } from '../middleware/auth.js'
import { db } from '../db/index.js'

interface OrderRow {
  id: string
  user_id: string
  course_id: string
  amount: number
  status: string | null
  created_at: string
}

export interface OrderResponse {
  id: string
  courseId: string
  amount: number
  // status is intentionally pass-through: null surfaces verbatim so SQL-
  // validation labs can observe the data-integrity defect from the wire.
  status: string | null
  createdAt: string
}

export const ordersRouter = Router()

ordersRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'unauthenticated', 'No active session.')

    const rows = db
      .prepare(
        `SELECT id, user_id, course_id, amount, status, created_at
         FROM orders
         WHERE user_id = ?
         ORDER BY created_at DESC, id ASC`
      )
      .all(req.user.id) as OrderRow[]

    const orders: OrderResponse[] = rows.map((row) => ({
      id: row.id,
      courseId: row.course_id,
      amount: row.amount,
      status: row.status,
      createdAt: row.created_at
    }))

    res.status(200).json({ orders })
  })
)
