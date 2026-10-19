import { ApiError, apiGet, apiPost } from './client'
import type { AuthResponse, User } from '../types/api'

export interface RegisterInput {
  email: string
  password: string
  name: string
  dateOfBirth?: string
  region?: string
  subscriptionTier?: 'free' | 'pro'
}

export interface LoginInput {
  email: string
  password: string
}

export async function register(input: RegisterInput): Promise<User> {
  const res = await apiPost<AuthResponse>('/api/auth/register', input)
  return res.user
}

export async function login(input: LoginInput): Promise<User> {
  const res = await apiPost<AuthResponse>('/api/auth/login', input)
  return res.user
}

export async function logout(): Promise<void> {
  await apiPost<unknown>('/api/auth/logout')
}

export async function fetchMe(): Promise<User | null> {
  try {
    const res = await apiGet<AuthResponse>('/api/me')
    return res.user
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
}
