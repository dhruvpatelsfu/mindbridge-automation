import bcrypt from 'bcrypt'
import { ulid } from 'ulid'
import { db } from '../db/index.js'
import { getHookBucket } from '../lib/defect-context.js'
import { ApiError } from '../middleware/error-handler.js'
import { rowToUser, type User, type UserRow } from '../types/user.js'
import type { SubscriptionTier } from '../types/profile.js'

const BCRYPT_COST = 10

interface RegisterInput {
  email: string
  password: string
  name: string
  dateOfBirth?: string
  region?: string
  subscriptionTier?: SubscriptionTier
}

interface LoginInput {
  email: string
  password: string
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

function nullableTrim(value: string | undefined): string | null {
  if (value === undefined) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export async function registerUser(input: RegisterInput): Promise<User> {
  const email = normaliseEmail(input.email)

  // A defect can push a sentinel into this bucket to skip the pre-flight
  // duplicate check. The UNIQUE constraint on users.email still applies,
  // so a second insert with the same address will throw and surface as 500.
  const skipDuplicateCheck = getHookBucket<unknown>('register-skip-duplicate-check').length > 0

  if (!skipDuplicateCheck) {
    const existing = db.prepare('SELECT 1 AS x FROM users WHERE email = ?').get(email)
    if (existing) {
      throw new ApiError(409, 'email_taken', 'Email already registered.')
    }
  }

  // A defect can push a sentinel into this bucket to skip the defensive
  // trim of `name`. With the bucket empty (baseline) a whitespace-only
  // name is rejected here as a 400 validation_error; with the bucket
  // populated the raw value is persisted verbatim.
  const skipTrim = getHookBucket<unknown>('register-skip-trim').length > 0
  const name = skipTrim ? input.name : input.name.trim()
  if (!skipTrim && name.length === 0) {
    throw new ApiError(400, 'validation_error', 'Request validation failed.', [
      { field: 'name', message: 'Name must not be empty after trimming whitespace.' }
    ])
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST)
  const id = `u_${ulid()}`
  const createdAt = new Date().toISOString()

  const dateOfBirth = nullableTrim(input.dateOfBirth)
  const region = nullableTrim(input.region)
  const subscriptionTier = input.subscriptionTier ?? null

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_instructor, created_at)
       VALUES (?, ?, ?, ?, 'user', 0, ?)`
    ).run(id, email, passwordHash, name, createdAt)

    db.prepare(
      `INSERT INTO profiles (user_id, date_of_birth, region, subscription_tier, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, dateOfBirth, region, subscriptionTier, createdAt)
  })

  tx()

  return {
    id,
    email,
    name,
    role: 'user',
    createdAt
  }
}

export async function loginUser(input: LoginInput): Promise<User> {
  const email = normaliseEmail(input.email)
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined
  if (!row) {
    throw new ApiError(401, 'invalid_credentials', 'Email or password is incorrect.')
  }

  const ok = await bcrypt.compare(input.password, row.password_hash)
  if (!ok) {
    throw new ApiError(401, 'invalid_credentials', 'Email or password is incorrect.')
  }

  return rowToUser(row)
}

export function findUserById(id: string): User | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
  if (!row) return null
  return rowToUser(row)
}
