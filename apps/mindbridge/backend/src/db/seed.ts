import { faker } from '@faker-js/faker'
import bcrypt from 'bcrypt'
import { ulid } from 'ulid'
import { db } from './index.js'
import type { CourseLevel } from '../types/course.js'

interface CountRow {
  n: number
}

const SUBJECTS = [
  'Software Testing',
  'Test Automation',
  'Performance Testing',
  'Security Testing',
  'QA Strategy'
] as const

const LEVELS: ReadonlyArray<CourseLevel> = ['beginner', 'intermediate', 'advanced']

// Instructor-demo dataset for recording walkthrough videos: PRESENTER_SEED=1
// swaps the generated catalogue (titles, instructor names, prices, card
// colours) while keeping subjects, levels, accounts, routes, and behaviour
// identical. Learner environments never set this flag.
const PRESENTER = process.env.PRESENTER_SEED === '1'
const FAKER_SEED = PRESENTER ? 4242 : 42

const BASE_GRADIENTS = [
  'linear-gradient(135deg, #4f46e5, #ec4899)',
  'linear-gradient(135deg, #14b8a6, #06b6d4)',
  'linear-gradient(135deg, #f97316, #f43f5e)',
  'linear-gradient(135deg, #10b981, #84cc16)',
  'linear-gradient(135deg, #d946ef, #ec4899)',
  'linear-gradient(135deg, #0ea5e9, #3b82f6)'
] as const

const GRADIENTS: ReadonlyArray<string> = PRESENTER
  ? [...BASE_GRADIENTS].reverse()
  : BASE_GRADIENTS

const COURSE_COUNT = 20
const FEATURED_COUNT = 6
const INSTRUCTOR_COUNT = 5

// Fixed deterministic ids so re-running seed produces the same primary keys.
// Format mirrors the contract docs (u_ prefix).
const ADMIN_ID = 'u_admin0000000000000000000'
const INSTRUCTOR_IDS = Array.from(
  { length: INSTRUCTOR_COUNT },
  (_, i) => `u_inst${String(i + 1).padStart(20, '0')}`
)

const ADMIN_EMAIL = 'admin@mindbridge.local'
const ADMIN_PASSWORD = 'admin12345'
const INSTRUCTOR_PASSWORD = 'instructor12345'
const SEED_CREATED_AT = '2026-05-13T00:00:00.000Z'

function pick<T>(arr: ReadonlyArray<T>, i: number): T {
  // noUncheckedIndexedAccess: assert via modulo; callers always pass non-empty arr
  const item = arr[i % arr.length]
  if (item === undefined) throw new Error('seed: empty pool')
  return item
}

function priceBetween(min: number, max: number): number {
  const raw = faker.number.float({ min, max, fractionDigits: 2 })
  return Math.round(raw * 100) / 100
}

interface SeededInstructor {
  id: string
  name: string
}

export function seedUsers(): SeededInstructor[] {
  faker.seed(FAKER_SEED)
  const instructors: SeededInstructor[] = INSTRUCTOR_IDS.map((id) => ({
    id,
    name: faker.person.fullName()
  }))

  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users (id, email, password_hash, name, role, is_instructor, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  const tx = db.transaction(() => {
    const adminRow = db.prepare('SELECT 1 AS x FROM users WHERE id = ?').get(ADMIN_ID)
    if (!adminRow) {
      insertUser.run(
        ADMIN_ID,
        ADMIN_EMAIL,
        bcrypt.hashSync(ADMIN_PASSWORD, 10),
        'Admin',
        'admin',
        0,
        SEED_CREATED_AT
      )
    }

    for (let i = 0; i < instructors.length; i += 1) {
      const inst = instructors[i]
      if (!inst) continue
      const exists = db.prepare('SELECT 1 AS x FROM users WHERE id = ?').get(inst.id)
      if (exists) continue
      const email = `instructor${i + 1}@mindbridge.local`
      insertUser.run(
        inst.id,
        email,
        bcrypt.hashSync(INSTRUCTOR_PASSWORD, 10),
        inst.name,
        'user',
        1,
        SEED_CREATED_AT
      )
    }
  })

  tx()
  return instructors
}

export function seedCourses(): void {
  const instructors = seedUsers()

  const row = db.prepare('SELECT COUNT(*) AS n FROM courses').get() as CountRow
  if (row.n > 0) {
    backfillCourseInstructors(instructors)
    backfillFeaturedAndImage()
    seedDemoProfiles()
    seedDemoEnrolments()
    seedDemoOrders()
    return
  }

  faker.seed(FAKER_SEED)

  const insert = db.prepare(
    `INSERT INTO courses
      (id, title, subject, level, price, description, image, instructor_name, instructor_id, featured, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const now = new Date().toISOString()

  const tx = db.transaction(() => {
    for (let i = 0; i < COURSE_COUNT; i += 1) {
      const subject = pick(SUBJECTS, i)
      const level = LEVELS[faker.number.int({ min: 0, max: LEVELS.length - 1 })] ?? 'beginner'
      const title = `${faker.company.buzzAdjective()} ${subject} ${faker.company.buzzNoun()}`
      const description = `${faker.lorem.sentence({ min: 12, max: 20 })} ${faker.lorem.sentence({ min: 10, max: 16 })}`
      const instructor = pick(instructors, i)
      const image = pick(GRADIENTS, i)
      const featured = i < FEATURED_COUNT ? 1 : 0
      const id = ulid()
      insert.run(
        id,
        title,
        subject,
        level,
        priceBetween(19.99, 199.99),
        description,
        image,
        instructor.name,
        instructor.id,
        featured,
        now,
        now
      )
    }
  })

  tx()

  seedDemoProfiles()
  seedDemoEnrolments()
  seedDemoOrders()
}

// Idempotent backfill for on-disk databases that pre-date the featured / image
// columns. First FEATURED_COUNT rows (by stable created_at + id ordering) get
// featured = 1; image is set to the gradient matching the same ordering. Safe
// to re-run because UPDATE is constant given the same row ordering.
function backfillFeaturedAndImage(): void {
  const rows = db
    .prepare('SELECT id, featured, image FROM courses ORDER BY created_at ASC, id ASC')
    .all() as Array<{ id: string; featured: number; image: string }>
  if (rows.length === 0) return

  const updateFeatured = db.prepare('UPDATE courses SET featured = ? WHERE id = ?')
  const updateImage = db.prepare('UPDATE courses SET image = ? WHERE id = ?')

  const tx = db.transaction(() => {
    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i]
      if (!r) continue
      const desiredFeatured = i < FEATURED_COUNT ? 1 : 0
      if (r.featured !== desiredFeatured) {
        updateFeatured.run(desiredFeatured, r.id)
      }
      if (!r.image) {
        updateImage.run(pick(GRADIENTS, i), r.id)
      }
    }
  })
  tx()
}

const PROFILE_REGIONS = ['EMEA', 'NA', 'APAC'] as const
const PROFILE_TIERS = ['free', 'pro'] as const

// Idempotent backfill: every seeded user gets a profiles row so the
// Dashboard / Account surfaces always have a deterministic shape to render.
// DOB lives in 1990–2005 to keep the demo "adult learner" narrative coherent.
function seedDemoProfiles(): void {
  const users = db.prepare('SELECT id FROM users ORDER BY id ASC').all() as Array<{ id: string }>
  if (users.length === 0) return

  const existing = db.prepare('SELECT 1 AS x FROM profiles WHERE user_id = ?')
  const insert = db.prepare(
    `INSERT INTO profiles (user_id, date_of_birth, region, subscription_tier, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
  const updatedAt = SEED_CREATED_AT

  const tx = db.transaction(() => {
    for (let i = 0; i < users.length; i += 1) {
      const u = users[i]
      if (!u) continue
      if (existing.get(u.id)) continue
      const year = 1990 + (i % 16)
      const month = String(1 + (i % 12)).padStart(2, '0')
      const day = String(1 + (i % 28)).padStart(2, '0')
      const dob = `${year}-${month}-${day}`
      const region = pick(PROFILE_REGIONS, i)
      const tier = pick(PROFILE_TIERS, i)
      insert.run(u.id, dob, region, tier, updatedAt)
    }
  })

  tx()
}

// Idempotent backfill: every seeded user gets 2–3 enrolment rows pointing
// at deterministic courses so the dashboard's grades / sessions / activity
// computations have something to render straight out of the box. Skips
// users that already have at least one enrolment so test users created
// at runtime are never disturbed.
function seedDemoEnrolments(): void {
  const users = db
    .prepare('SELECT id, name, email FROM users ORDER BY id ASC')
    .all() as Array<{ id: string; name: string; email: string }>
  const courses = db
    .prepare('SELECT id FROM courses ORDER BY created_at ASC, id ASC')
    .all() as Array<{ id: string }>
  if (users.length === 0 || courses.length === 0) return

  const existing = db.prepare('SELECT 1 AS x FROM enrolments WHERE user_id = ? LIMIT 1')
  const insert = db.prepare(
    `INSERT INTO enrolments (id, name, email, course_id, user_id, status, enrolled_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?)`
  )

  const tx = db.transaction(() => {
    for (let i = 0; i < users.length; i += 1) {
      const u = users[i]
      if (!u) continue
      if (existing.get(u.id)) continue
      const count = 2 + (i % 2)
      const baseDay = 1 + (i * 7) % 20
      for (let j = 0; j < count; j += 1) {
        const course = pick(courses, i * 3 + j)
        const enrolledAt = `2026-04-${String(baseDay + j).padStart(2, '0')}T09:00:00.000Z`
        insert.run(`enr_${u.id}_${j}`, u.name, u.email, course.id, u.id, enrolledAt)
      }
    }
  })

  tx()
}

// Idempotent backfill: every seeded user gets 2–3 'paid' orders pointing
// at deterministic courses so SQL-validation labs always have a clean
// baseline to query against. Skips users that already have at least one
// order so test users created at runtime are never disturbed.
function seedDemoOrders(): void {
  const users = db.prepare('SELECT id FROM users ORDER BY id ASC').all() as Array<{ id: string }>
  const courses = db
    .prepare('SELECT id, price FROM courses ORDER BY created_at ASC, id ASC')
    .all() as Array<{ id: string; price: number }>
  if (users.length === 0 || courses.length === 0) return

  const existing = db.prepare('SELECT 1 AS x FROM orders WHERE user_id = ? LIMIT 1')
  const insert = db.prepare(
    `INSERT INTO orders (id, user_id, course_id, amount, status, created_at)
     VALUES (?, ?, ?, ?, 'paid', ?)`
  )

  const tx = db.transaction(() => {
    for (let i = 0; i < users.length; i += 1) {
      const u = users[i]
      if (!u) continue
      if (existing.get(u.id)) continue
      const count = 2 + (i % 2)
      const baseDay = 1 + (i * 5) % 25
      for (let j = 0; j < count; j += 1) {
        const course = pick(courses, i * 3 + j + 1)
        const day = String(baseDay + j).padStart(2, '0')
        const createdAt = `2026-05-${day}T12:00:00.000Z`
        const orderId = `ord_${u.id}_${j}`
        insert.run(orderId, u.id, course.id, course.price, createdAt)
      }
    }
  })

  tx()
}

// Idempotent backfill for on-disk databases that pre-date the instructor_id
// FK. Keeps round-robin ordering deterministic so the same course always
// maps to the same instructor across boots.
function backfillCourseInstructors(instructors: SeededInstructor[]): void {
  if (instructors.length === 0) return
  const rows = db
    .prepare(
      `SELECT id FROM courses
       WHERE instructor_id IS NULL OR instructor_id = ''
       ORDER BY created_at ASC, id ASC`
    )
    .all() as Array<{ id: string }>
  if (rows.length === 0) return

  const update = db.prepare(
    'UPDATE courses SET instructor_id = ?, instructor_name = ? WHERE id = ?'
  )
  const tx = db.transaction(() => {
    for (let i = 0; i < rows.length; i += 1) {
      const courseRow = rows[i]
      if (!courseRow) continue
      const inst = pick(instructors, i)
      update.run(inst.id, inst.name, courseRow.id)
    }
  })
  tx()
}
