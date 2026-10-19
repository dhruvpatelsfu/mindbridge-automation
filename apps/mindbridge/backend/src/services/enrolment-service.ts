import { db } from '../db/index.js'
import type { CourseLevel, DashboardEnrolment } from '../types/course.js'

interface EnrolmentJoinRow {
  id: string
  enrolled_at: string
  status: string
  course_id: string
  title: string
  subject: string
  level: CourseLevel
  image: string
}

export function listEnrolmentsForUser(userId: string): DashboardEnrolment[] {
  const rows = db
    .prepare(
      `SELECT e.id, e.enrolled_at, e.status,
              c.id AS course_id, c.title, c.subject, c.level, c.image
       FROM enrolments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ?
       ORDER BY e.enrolled_at DESC, e.id ASC`
    )
    .all(userId) as EnrolmentJoinRow[]

  return rows.map((row) => ({
    id: row.id,
    course: {
      id: row.course_id,
      title: row.title,
      subject: row.subject,
      level: row.level,
      image: row.image ?? ''
    },
    status: 'active' as const,
    enrolledAt: row.enrolled_at
  }))
}
