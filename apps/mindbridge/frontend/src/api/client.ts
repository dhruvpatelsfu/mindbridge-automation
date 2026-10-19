import type { ApiErrorPayload } from '../types/api'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Array<{ field: string; message: string }>

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Array<{ field: string; message: string }>
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

async function request<T>(path: string, init: RequestInit & { method: string }): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {})
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network request failed'
    throw new ApiError(0, 'network_error', message)
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const body: unknown = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    const errBody = body as ApiErrorPayload | null
    const code = errBody?.error?.code ?? `http_${response.status}`
    const message = errBody?.error?.message ?? `Request failed with ${response.status}`
    throw new ApiError(response.status, code, message, errBody?.error?.fields)
  }

  return body as T
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' })
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body)
  })
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body)
  })
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body)
  })
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' })
}
