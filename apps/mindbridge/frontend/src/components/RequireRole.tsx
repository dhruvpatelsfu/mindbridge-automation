import type { JSX, ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types/api'

interface RequireRoleProps {
  role: UserRole
  children: ReactNode
}

export function RequireRole({ role, children }: RequireRoleProps): JSX.Element {
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

  if (state.user.role !== role) {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          role="alert"
          className="mx-auto max-w-md bg-white rounded-2xl shadow-md p-8 text-center"
        >
          <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-rose-500 to-amber-600 bg-clip-text text-transparent">
            Access denied
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            You don&apos;t have access to this page.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            ← Back to home
          </Link>
        </div>
      </section>
    )
  }

  return <>{children}</>
}
