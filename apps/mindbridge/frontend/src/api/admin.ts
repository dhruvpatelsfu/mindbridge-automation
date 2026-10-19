import { apiGet, apiPatch } from './client'
import type {
  AdminCoursesListResponse,
  AdminUsersListResponse,
  CourseDetailResponse,
  CourseLevel
} from '../types/api'

export interface AdminCoursesQuery {
  page?: number
  pageSize?: number
  search?: string
  subject?: string
  level?: CourseLevel
}

export interface AdminUsersQuery {
  page?: number
  pageSize?: number
}

export interface CoursePatch {
  title?: string
  subject?: string
  level?: CourseLevel
  price?: number
  description?: string
  image?: string
  instructorId?: string
  featured?: boolean
}

function toQueryString(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === null) continue
    usp.set(key, String(value))
  }
  const s = usp.toString()
  return s.length > 0 ? `?${s}` : ''
}

export async function listAdminCourses(
  query: AdminCoursesQuery = {}
): Promise<AdminCoursesListResponse> {
  const qs = toQueryString({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    subject: query.subject,
    level: query.level
  })
  return apiGet<AdminCoursesListResponse>(`/api/admin/courses${qs}`)
}

export async function listAdminUsers(
  query: AdminUsersQuery = {}
): Promise<AdminUsersListResponse> {
  const qs = toQueryString({ page: query.page, pageSize: query.pageSize })
  return apiGet<AdminUsersListResponse>(`/api/admin/users${qs}`)
}

export async function updateCourse(
  id: string,
  patch: CoursePatch
): Promise<CourseDetailResponse> {
  return apiPatch<CourseDetailResponse>(`/api/admin/courses/${id}`, patch)
}
