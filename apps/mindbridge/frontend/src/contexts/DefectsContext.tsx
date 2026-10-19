import { createContext, useContext, useEffect, useMemo, useState, type JSX, type ReactNode } from 'react'

export type DefectsStatus = 'loading' | 'success' | 'error'

export interface DefectsContextValue {
  labId: string | null
  defects: string[]
  status: DefectsStatus
  error: string | null
  hasDefect: (id: string) => boolean
}

const DEFAULT_VALUE: DefectsContextValue = {
  labId: null,
  defects: [],
  status: 'loading',
  error: null,
  hasDefect: () => false
}

const Context = createContext<DefectsContextValue>(DEFAULT_VALUE)

// Tolerant structural type: the backend returns a `defects` object map keyed
// by defect id with boolean values. Anything else normalises to an empty
// list so a malformed payload can't crash the page.
type RawLabInfoResponse = {
  labId?: string
  defects?: Record<string, unknown>
} | null

function parseDefects(raw: unknown): string[] {
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
    return []
  }
  const out: string[] = []
  for (const [id, on] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof id === 'string' && id.length > 0 && on === true) out.push(id)
  }
  return out
}

export function DefectsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [labId, setLabId] = useState<string | null>(null)
  const [defects, setDefects] = useState<string[]>([])
  const [status, setStatus] = useState<DefectsStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      try {
        const response = await fetch('/api/lab-info', {
          headers: { Accept: 'application/json' }
        })
        if (!response.ok) {
          throw new Error(`lab-info failed: ${response.status}`)
        }
        const body = (await response.json()) as RawLabInfoResponse
        if (cancelled) return
        setLabId(typeof body?.labId === 'string' ? body.labId : null)
        setDefects(parseDefects(body?.defects))
        setStatus('success')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unknown error')
        setStatus('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<DefectsContextValue>(() => {
    const set = new Set(defects)
    return {
      labId,
      defects,
      status,
      error,
      hasDefect: (id: string) => set.has(id)
    }
  }, [labId, defects, status, error])

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useDefects(): DefectsContextValue {
  return useContext(Context)
}
