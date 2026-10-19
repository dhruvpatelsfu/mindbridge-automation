import { apiGet } from './client'
import type { MyEnrolmentsResponse } from '../types/api'

export async function fetchMyEnrolments(): Promise<MyEnrolmentsResponse> {
  return apiGet<MyEnrolmentsResponse>('/api/me/enrolments')
}
