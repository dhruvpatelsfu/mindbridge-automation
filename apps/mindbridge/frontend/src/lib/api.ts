import type { HealthResponse } from '../types/api'

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health', {
    headers: { Accept: 'application/json' }
  })

  if (!response.ok) {
    throw new Error(`health check failed: ${response.status}`)
  }

  return (await response.json()) as HealthResponse
}
