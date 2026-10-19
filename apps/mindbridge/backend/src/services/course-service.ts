import { db } from '../db/index.js'
import type {
  CourseDetail,
  CourseLevel,
  CourseRow,
  CourseSummary,
  PaginationMeta
} from '../types/course.js'

const DESCRIPTION_LIST_MAX = 280

export interface CatalogueFilters {
  search?: string
  subject?: string
  level?: CourseLevel
  featured?: boolean
  page: number
  pageSize: number
}

interface InstructorJoinRow extends CourseRow {
  user_id: string | null
  user_name: string | null
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}

function rowToSummary(row: CourseRow): CourseSummary {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    level: row.level,
    price: row.price,
    description: truncate(row.description, DESCRIPTION_LIST_MAX),
    image: row.image,
    instructorId: row.instructor_id ?? 'unknown',
    instructorName: row.instructor_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToDetail(row: InstructorJoinRow): CourseDetail {
  const instructor =
    row.user_id && row.user_name
      ? { id: row.user_id, name: row.user_name }
      : { id: 'unknown', name: row.instructor_name }

  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    level: row.level,
    price: row.price,
    description: row.description,
    image: row.image,
    instructor,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function buildWhereClause(filters: CatalogueFilters): {
  clause: string
  params: Array<string | number>
} {
  const conditions: string[] = []
  const params: Array<string | number> = []

  if (filters.search && filters.search.length > 0) {
    conditions.push('(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)')
    const needle = `%${filters.search.toLowerCase()}%`
    params.push(needle, needle)
  }

  if (filters.subject) {
    conditions.push('subject = ?')
    params.push(filters.subject)
  }

  if (filters.level) {
    conditions.push('level = ?')
    params.push(filters.level)
  }

  if (filters.featured === true) {
    conditions.push('featured = 1')
  } else if (filters.featured === false) {
    conditions.push('featured = 0')
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  return { clause, params }
}

export interface CatalogueResult {
  courses: CourseSummary[]
  pagination: PaginationMeta
}

export function listCourses(filters: CatalogueFilters): CatalogueResult {
  const { clause, params } = buildWhereClause(filters)
  const totalRow = db.prepare(`SELECT COUNT(*) AS n FROM courses ${clause}`).get(...params) as {
    n: number
  }
  const total = totalRow.n
  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize)
  const offset = (filters.page - 1) * filters.pageSize

  const rows = db
    .prepare(
      `SELECT id, title, subject, level, price, description, image,
              instructor_name, instructor_id, featured, created_at, updated_at
       FROM courses
       ${clause}
       ORDER BY created_at ASC, id ASC
       LIMIT ? OFFSET ?`
    )
    .all(...params, filters.pageSize, offset) as CourseRow[]

  return {
    courses: rows.map(rowToSummary),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages
    }
  }
}

export function getCourseDetail(courseId: string): CourseDetail | null {
  const row = db
    .prepare(
      `SELECT c.id, c.title, c.subject, c.level, c.price, c.description, c.image,
              c.instructor_name, c.instructor_id, c.featured, c.created_at, c.updated_at,
              u.id AS user_id, u.name AS user_name
       FROM courses c
       LEFT JOIN users u ON u.id = c.instructor_id
       WHERE c.id = ?`
    )
    .get(courseId) as InstructorJoinRow | undefined

  if (!row) return null
  return rowToDetail(row)
}
