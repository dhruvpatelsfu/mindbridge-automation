import { randomBytes } from 'node:crypto'
import { db } from '../db/index.js'

export interface DashboardGrade {
  courseId: string
  courseTitle: string
  grade: string
  updatedAt: string
}

export interface DashboardSession {
  courseId: string
  courseTitle: string
  tutorName: string
  scheduledAt: string
}

export interface DashboardActivity {
  id: string
  type: 'enrolment' | 'payment' | 'profile_update'
  description: string
  occurredAt: string
}

export interface DashboardSummary {
  grades: DashboardGrade[]
  upcomingSessions: DashboardSession[]
  recentActivity: DashboardActivity[]
}

interface EnrolmentRow {
  id: string
  enrolled_at: string
  course_id: string
  title: string
  instructor_name: string
}

interface PaymentRow {
  id: string
  amount: number
  last4: string
  created_at: string
}

interface ProfileRow {
  updated_at: string
}

const SESSION_OFFSET_MS = 14 * 24 * 60 * 60 * 1000
const MAX_SESSIONS = 5
const MAX_ACTIVITY = 10

function hashToGradeNumber(id: string): number {
  let acc = 0
  for (let i = 0; i < id.length; i += 1) {
    acc = (acc * 31 + id.charCodeAt(i)) | 0
  }
  const positive = Math.abs(acc)
  return 70 + (positive % 31)
}

function numericToLetter(grade: number): string {
  if (grade >= 95) return 'A+'
  if (grade >= 90) return 'A'
  if (grade >= 85) return 'A-'
  if (grade >= 80) return 'B+'
  if (grade >= 75) return 'B'
  return 'C+'
}

export function getDashboardSummary(userId: string): DashboardSummary {
  const enrolments = db
    .prepare(
      `SELECT e.id, e.enrolled_at, e.course_id, c.title, c.instructor_name
       FROM enrolments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ?
       ORDER BY e.enrolled_at DESC, e.id ASC`
    )
    .all(userId) as EnrolmentRow[]

  const payments = db
    .prepare(
      `SELECT id, amount, last4, created_at FROM payments
       WHERE user_id = ?
       ORDER BY created_at DESC, id ASC`
    )
    .all(userId) as PaymentRow[]

  const profile = db
    .prepare('SELECT updated_at FROM profiles WHERE user_id = ?')
    .get(userId) as ProfileRow | undefined

  const grades: DashboardGrade[] = enrolments.map((row) => {
    const numeric = hashToGradeNumber(row.id)
    return {
      courseId: row.course_id,
      courseTitle: row.title,
      grade: `${numericToLetter(numeric)} (${numeric})`,
      updatedAt: row.enrolled_at
    }
  })

  const upcomingSessions: DashboardSession[] = enrolments.slice(0, MAX_SESSIONS).map((row) => ({
    courseId: row.course_id,
    courseTitle: row.title,
    tutorName: row.instructor_name,
    scheduledAt: new Date(new Date(row.enrolled_at).getTime() + SESSION_OFFSET_MS).toISOString()
  }))

  const activity: DashboardActivity[] = []
  for (const row of enrolments) {
    activity.push({
      id: `enr-${row.id}`,
      type: 'enrolment',
      description: `Enrolled in ${row.title}`,
      occurredAt: row.enrolled_at
    })
  }
  for (const row of payments) {
    activity.push({
      id: `pay-${row.id}`,
      type: 'payment',
      description: `Payment of $${row.amount.toFixed(2)} (****${row.last4})`,
      occurredAt: row.created_at
    })
  }
  if (profile) {
    activity.push({
      id: `prof-${userId}`,
      type: 'profile_update',
      description: 'Profile updated',
      occurredAt: profile.updated_at
    })
  }
  activity.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0))

  return {
    grades,
    upcomingSessions,
    recentActivity: activity.slice(0, MAX_ACTIVITY)
  }
}

export function createShareLink(): string {
  const token = randomBytes(8).toString('hex')
  return `https://mindbridge.example.com/share/${token}`
}
