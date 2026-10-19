import { apiGet, apiPost, apiPut } from './client'
import type {
  DashboardSummary,
  EnrollmentResponse,
  PracticeResponse,
  Profile,
  ProfileResponse,
  ShareLinkResponse
} from '../types/api'

export interface ProfileUpdateInput {
  name?: string
  dateOfBirth?: string | null
  region?: string | null
  subscriptionTier?: 'free' | 'pro' | null
}

export async function fetchProfile(): Promise<Profile> {
  const res = await apiGet<ProfileResponse>('/api/profile')
  return res.profile
}

export async function updateProfile(input: ProfileUpdateInput): Promise<Profile> {
  const res = await apiPut<ProfileResponse>('/api/profile', input)
  return res.profile
}

export async function fetchDashboard(): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>('/api/dashboard')
}

export async function generateShareLink(note?: string): Promise<ShareLinkResponse> {
  const trimmed = note?.trim()
  return apiPost<ShareLinkResponse>(
    '/api/dashboard/share-link',
    trimmed ? { payload: trimmed } : {}
  )
}

export async function submitPractice(topic: string): Promise<PracticeResponse> {
  return apiPost<PracticeResponse>('/api/practice', { topic })
}

export async function enrolInCourse(
  courseId: string,
  dateOfBirth: string
): Promise<EnrollmentResponse> {
  return apiPost<EnrollmentResponse>('/api/enrollment', { courseId, dateOfBirth })
}
