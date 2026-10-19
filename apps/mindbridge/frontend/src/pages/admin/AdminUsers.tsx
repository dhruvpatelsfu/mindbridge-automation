import { useEffect, useState, type JSX } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { listAdminUsers } from '../../api/admin'
import { Pagination } from '../../components/Pagination'
import { formatLongDate } from '../../lib/format'
import type { AdminUsersListResponse, User } from '../../types/api'

const ROLE_CHIP: Record<User['role'], string> = {
  user: 'bg-indigo-100 text-indigo-800',
  admin: 'bg-rose-100 text-rose-800'
}

function UserRow({ user }: { user: User }): JSX.Element {
  return (
    <tr className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-slate-900">{user.name}</td>
      <td className="px-4 py-3 text-sm text-slate-700">{user.email}</td>
      <td className="px-4 py-3 text-sm">
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_CHIP[user.role]}`}>
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">{formatLongDate(user.createdAt)}</td>
    </tr>
  )
}

function parsePage(value: string | null): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

const DEFAULT_PAGE_SIZE = 20

export default function AdminUsers(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'))

  const [data, setData] = useState<AdminUsersListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listAdminUsers({ page, pageSize: DEFAULT_PAGE_SIZE })
      .then((res) => {
        if (cancelled) return
        setData(res)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load users.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page])

  function changePage(nextPage: number): void {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(nextPage))
    setSearchParams(next, { replace: true })
  }

  const users = data?.users ?? []
  const pagination = data?.pagination ?? { page, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
          User accounts
        </h1>
        <p className="mt-1 text-sm text-slate-500">Read-only directory of accounts.</p>
      </header>

      {loading && (
        <div
          role="status"
          aria-label="Loading users"
          className="mt-6 h-32 rounded-xl bg-white shadow-sm animate-pulse"
        />
      )}

      {!loading && error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700"
        >
          {error}
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <p className="mt-6 text-slate-500">No users yet.</p>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="mt-6 overflow-x-auto bg-white rounded-xl shadow-sm">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                <th scope="col" className="px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow key={u.id} user={u} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && data && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={changePage}
        />
      )}
    </section>
  )
}
