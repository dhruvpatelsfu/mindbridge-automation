import { Router } from 'express'
import { z } from 'zod'
import { ulid } from 'ulid'
import { db } from '../db/index.js'
import { ApiError, asyncHandler, zodToApiError } from '../middleware/error-handler.js'
import { requireAuth } from '../middleware/auth.js'
import { getOrCreateSessionId } from '../middleware/session-id.js'
import { loadCart } from '../services/cart-service.js'
import { getHookBucket } from '../lib/defect-context.js'
import { logger } from '../lib/logger.js'
import type { Cart, Order, OrderEnrolment } from '../types/course.js'

const mockCardSchema = z.object({
  number: z.string().min(8).max(32),
  expiry: z.string().min(3).max(8),
  cvv: z.string().min(3).max(4)
})

const checkoutSchema = z.object({
  mockCard: mockCardSchema,
  zip: z.string().trim().min(1, 'Zip code is required.').optional()
})

const IDEMPOTENCY_TTL_MS = 5_000

interface CachedCheckout {
  response: { order: Order }
  cartHash: string
  timestamp: number
}

// In-memory idempotency cache keyed by user id. Each entry holds the
// previously returned response, the hash of the cart that produced it,
// and the timestamp. When a fresh request arrives within the TTL for the
// same user, the cached response is replayed with X-Idempotent-Replay: true
// so a rapid double-click does not double-charge.
const idempotencyCache = new Map<string, CachedCheckout>()

function last4(cardNumber: string): string {
  const digits = cardNumber.replace(/\s+/g, '')
  return digits.slice(-4)
}

function hashCart(cart: Cart): string {
  if (cart.items.length === 0) return 'empty'
  const sortedItems = [...cart.items].sort((a, b) => a.courseId.localeCompare(b.courseId))
  const parts = sortedItems.map((it) => `${it.courseId}:${it.quantity}:${it.price}`)
  return `${cart.total.toFixed(2)}|${parts.join(',')}`
}

export function __resetCheckoutIdempotencyForTests(): void {
  idempotencyCache.clear()
}

export const checkoutRouter = Router()

checkoutRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = checkoutSchema.safeParse(req.body)
    if (!parsed.success) throw zodToApiError(parsed.error)
    const { mockCard, zip } = parsed.data

    const user = req.user
    if (!user) throw new ApiError(401, 'unauthenticated', 'No active session.')

    // Correct behaviour: the billing Zip code must be a 5-digit number. The
    // D-CHECKOUT-ZIP defect pushes a sentinel into this bucket so the guard is
    // skipped and a non-numeric value such as "testing" is wrongly accepted.
    const skipZipValidation = getHookBucket<unknown>('checkout-skip-zip-validation').length > 0
    if (!skipZipValidation && zip !== undefined && !/^\d{5}$/.test(zip)) {
      throw new ApiError(400, 'invalid_zip', 'Zip code must contain only numbers.')
    }

    // A defect can push a sentinel into this bucket to make any payment
    // field containing `<` or `>` blow up with an unhandled exception.
    // The throw bypasses zod validation (which would emit a tidy 400)
    // and bubbles to the global error handler so the wire response is
    // a generic HTTP 500.
    const crashOnSpecialChars =
      getHookBucket<unknown>('checkout-crash-on-special-chars').length > 0
    if (crashOnSpecialChars) {
      const special = /[<>$&()]/
      if (
        special.test(mockCard.number) ||
        special.test(mockCard.expiry) ||
        special.test(mockCard.cvv)
      ) {
        throw new Error('Unhandled')
      }
    }

    const skipIdempotency = getHookBucket<unknown>('checkout-skip-idempotency').length > 0

    // Replay the cached response when the same user retries quickly. The
    // cart was cleared at the end of the previous successful request so
    // looking up by user id alone matches real-world double-click semantics.
    if (!skipIdempotency) {
      const cached = idempotencyCache.get(user.id)
      if (cached && Date.now() - cached.timestamp < IDEMPOTENCY_TTL_MS) {
        res.setHeader('X-Idempotent-Replay', 'true')
        res.status(201).json(cached.response)
        return
      }
    }

    const sid = getOrCreateSessionId(req)
    const cart = loadCart(sid)

    if (cart.items.length === 0) {
      throw new ApiError(409, 'cart_empty', 'Cannot checkout an empty cart.')
    }

    const cartHash = hashCart(cart)
    const now = new Date().toISOString()
    const paymentId = ulid()
    const paymentLast4 = last4(mockCard.number)

    const enrolments: OrderEnrolment[] = []

    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO payments (id, name, email, user_id, amount, status, last4, created_at)
         VALUES (?, ?, ?, ?, ?, 'mock-paid', ?, ?)`
      ).run(paymentId, user.name, user.email, user.id, cart.total, paymentLast4, now)

      const insertEnrol = db.prepare(
        `INSERT INTO enrolments (id, name, email, course_id, user_id, status, enrolled_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?)`
      )

      for (const item of cart.items) {
        const enrolmentId = ulid()
        insertEnrol.run(enrolmentId, user.name, user.email, item.courseId, user.id, now)
        enrolments.push({
          id: enrolmentId,
          courseId: item.courseId,
          courseTitle: item.title,
          status: 'active',
          enrolledAt: now
        })
      }

      db.prepare('DELETE FROM cart_lines WHERE session_id = ?').run(sid)
    })

    tx()

    logger.info(
      { paymentId, userId: user.id, amount: cart.total, items: cart.items.length },
      'checkout complete'
    )

    const order: Order = {
      id: paymentId,
      amount: cart.total,
      status: 'mock-paid',
      createdAt: now,
      last4: paymentLast4,
      enrolments
    }

    const responseBody = { order }

    if (!skipIdempotency) {
      idempotencyCache.set(user.id, {
        response: responseBody,
        cartHash,
        timestamp: Date.now()
      })
    }

    res.status(201).json(responseBody)
  })
)
