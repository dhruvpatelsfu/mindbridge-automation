import type { JSX, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps): JSX.Element {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div
          role="status"
          aria-label="Checking session"
          className="h-32 rounded-xl bg-white shadow-sm animate-pulse"
        />
      </section>
    )
  }

  if (state.status === 'anonymous') {
    const next = `${location.pathname}${location.search}`
    const target = `/login?next=${encodeURIComponent(next)}`
    return <Navigate to={target} replace />
  }

  return <>{children}</>
}
