import { db } from '../db/index.js'
import { ApiError } from '../middleware/error-handler.js'
import type { Profile, ProfileRow, SubscriptionTier } from '../types/profile.js'
import type { UserRow } from '../types/user.js'

interface ProfileJoinRow extends ProfileRow {
  name: string
  email: string
}

export interface ProfileUpdateInput {
  name?: string
  dateOfBirth?: string | null
  region?: string | null
  subscriptionTier?: SubscriptionTier | null
}

function rowToProfile(row: ProfileJoinRow): Profile {
  return {
    userId: row.user_id,
    name: row.name,
    email: row.email,
    dateOfBirth: row.date_of_birth ?? null,
    region: row.region ?? null,
    subscriptionTier: row.subscription_tier ?? null,
    updatedAt: row.updated_at
  }
}

export function getProfileForUser(userId: string): Profile {
  const row = db
    .prepare(
      `SELECT p.user_id, p.date_of_birth, p.region, p.subscription_tier, p.updated_at,
              u.name, u.email
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ?`
    )
    .get(userId) as ProfileJoinRow | undefined

  if (row) return rowToProfile(row)

  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId) as
    | Pick<UserRow, 'id' | 'name' | 'email'>
    | undefined
  if (!user) {
    throw new ApiError(404, 'profile_not_found', 'No profile for that user.')
  }

  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO profiles (user_id, date_of_birth, region, subscription_tier, updated_at)
     VALUES (?, NULL, NULL, NULL, ?)`
  ).run(userId, now)

  return {
    userId,
    name: user.name,
    email: user.email,
    dateOfBirth: null,
    region: null,
    subscriptionTier: null,
    updatedAt: now
  }
}

export function updateProfileForUser(userId: string, input: ProfileUpdateInput): Profile {
  const existing = getProfileForUser(userId)
  const now = new Date().toISOString()

  const nextName = input.name !== undefined ? input.name.trim() : existing.name
  if (nextName.length === 0) {
    throw new ApiError(400, 'validation_error', 'Name cannot be empty.')
  }

  const nextDob = input.dateOfBirth === undefined ? existing.dateOfBirth : input.dateOfBirth
  const nextRegion = input.region === undefined ? existing.region : input.region
  const nextTier =
    input.subscriptionTier === undefined ? existing.subscriptionTier : input.subscriptionTier

  const tx = db.transaction(() => {
    if (input.name !== undefined) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(nextName, userId)
    }
    db.prepare(
      `UPDATE profiles
         SET date_of_birth = ?, region = ?, subscription_tier = ?, updated_at = ?
       WHERE user_id = ?`
    ).run(nextDob, nextRegion, nextTier, now, userId)
  })

  tx()

  return {
    userId,
    name: nextName,
    email: existing.email,
    dateOfBirth: nextDob,
    region: nextRegion,
    subscriptionTier: nextTier,
    updatedAt: now
  }
}
