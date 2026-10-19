import { db } from '../db/index.js'
import type { Cart, CartLine } from '../types/course.js'

interface CartLineRow {
  course_id: string
  title: string
  price: number
  quantity: number
}

export function loadCart(sessionId: string): Cart {
  const rows = db
    .prepare(
      `SELECT cl.course_id, c.title, c.price, cl.quantity
       FROM cart_lines cl
       JOIN courses c ON c.id = cl.course_id
       WHERE cl.session_id = ?
       ORDER BY cl.added_at ASC`
    )
    .all(sessionId) as CartLineRow[]

  const items: CartLine[] = rows.map((r) => ({
    courseId: r.course_id,
    title: r.title,
    price: r.price,
    quantity: r.quantity
  }))

  const itemCount = items.reduce((acc, it) => acc + it.quantity, 0)
  const subtotal =
    Math.round(items.reduce((acc, it) => acc + it.price * it.quantity, 0) * 100) / 100

  return { items, itemCount, subtotal, total: subtotal }
}

export function clearCart(sessionId: string): void {
  db.prepare('DELETE FROM cart_lines WHERE session_id = ?').run(sessionId)
}
