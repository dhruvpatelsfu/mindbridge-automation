import { db } from '../db/index.js'
import { getHookBucket } from './defect-context.js'

const ADMIN_ID = 'u_admin0000000000000000000'
const BUCKET = 'backend-db-null-status'

interface OrderIdRow {
  id: string
}

// Idempotent: when the D-DB-NULL-STATUS hook is set, rewrite the admin's
// most recent order so its status column reads NULL. The selector is by
// recency only (not status), so re-running the helper keeps targeting
// the same row instead of cascading nulls across the seed data.
export function applyNullStatusToAdminLatestOrder(): void {
  if (getHookBucket<unknown>(BUCKET).length === 0) return

  const row = db
    .prepare(
      `SELECT id FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC, id ASC
       LIMIT 1`
    )
    .get(ADMIN_ID) as OrderIdRow | undefined

  if (!row) return
  db.prepare('UPDATE orders SET status = NULL WHERE id = ?').run(row.id)
}
