import { useCallback, useEffect, useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { fetchDashboard, generateShareLink } from '../api/profile'
import { useAuth } from '../contexts/AuthContext'
import { useDefects } from '../contexts/DefectsContext'
import { formatLongDate } from '../lib/format'
import type { DashboardSummary } from '../types/api'

const ACTIVITY_BADGE = {
  enrolment: 'bg-indigo-100 text-indigo-800',
  payment: 'bg-emerald-100 text-emerald-800',
  profile_update: 'bg-amber-100 text-amber-800'
} as const

const ACTIVITY_LABEL = {
  enrolment: 'Enrolment',
  payment: 'Payment',
  profile_update: 'Profile'
} as const

function GradesSection({ data }: { data: DashboardSummary['grades'] }): JSX.Element {
  return (
    <section
      data-testid="dashboard-grades-section"
      className="bg-white rounded-2xl shadow-sm p-6 sm:p-8"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Grades</h2>
        <span className="text-xs text-slate-500">{data.length} courses</span>
      </div>
      {data.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          You have not received any grades yet. Enrol in a course to get started.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {data.map((g) => (
            <li key={g.courseId} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{g.courseTitle}</p>
                <p className="text-xs text-slate-500">
                  Last updated {formatLongDate(g.updatedAt)}
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold">
                {g.grade}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SessionsSection({
  data
}: {
  data: DashboardSummary['upcomingSessions']
}): JSX.Element {
  return (
    <section
      data-testid="dashboard-sessions-section"
      className="bg-white rounded-2xl shadow-sm p-6 sm:p-8"
    >
      <h2 className="text-lg font-semibold text-slate-900">Upcoming sessions</h2>
      {data.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No upcoming tutoring sessions scheduled.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.map((s) => (
            <li
              key={`${s.courseId}-${s.scheduledAt}`}
              className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{s.courseTitle}</p>
                <p className="text-xs text-slate-500">with {s.tutorName}</p>
              </div>
              <p className="text-xs font-medium text-slate-700">
                {formatLongDate(s.scheduledAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ActivitySection({
  data
}: {
  data: DashboardSummary['recentActivity']
}): JSX.Element {
  return (
    <section
      data-testid="dashboard-activity-section"
      className="bg-white rounded-2xl shadow-sm p-6 sm:p-8"
    >
      <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
      {data.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Nothing has happened on your account yet.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {data.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${ACTIVITY_BADGE[a.type]}`}
                >
                  {ACTIVITY_LABEL[a.type]}
                </span>
                <span className="text-sm text-slate-700">{a.description}</span>
              </div>
              <span className="text-xs text-slate-500 shrink-0">
                {formatLongDate(a.occurredAt)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default function Dashboard(): JSX.Element {
  const { state } = useAuth()
  const { hasDefect } = useDefects()
  const pinShareBanner = hasDefect('D-MODAL-MOBILE')
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareNote, setShareNote] = useState('')
  const [sharing, setSharing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDashboard()
      setSummary(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleShare(): Promise<void> {
    setSharing(true)
    setShareError(null)
    setShareUrl(null)
    try {
      const res = await generateShareLink(shareNote)
      setShareUrl(res.url)
    } catch (err) {
      setShareError(
        err instanceof ApiError ? err.message : 'Could not generate a share link.'
      )
    } finally {
      setSharing(false)
    }
  }

  const greeting =
    state.status === 'authenticated' ? `Welcome back, ${state.user.name}.` : 'Welcome back.'

  return (
    <section
      data-testid="dashboard-root"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="mt-2 text-slate-600">{greeting}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            type="text"
            value={shareNote}
            onChange={(e) => setShareNote(e.target.value)}
            placeholder="Share note (optional)"
            aria-label="Share note"
            data-testid="dashboard-share-note"
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={sharing}
            data-testid="dashboard-generate-share-link"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-white text-sm font-semibold bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
          >
            {sharing ? 'Generating…' : 'Generate share link'}
          </button>
        </div>
      </header>

      {shareUrl && (
        <div
          role="status"
          data-testid="dashboard-share-link-result"
          className={
            pinShareBanner
              ? 'mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900 flex items-center justify-between gap-4 max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-50 max-md:rounded-none max-md:border-x-0 max-md:mt-0'
              : 'mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900 flex items-center justify-between gap-4'
          }
        >
          <span className="truncate">Share link ready:</span>
          <a
            href={shareUrl}
            className="font-mono text-xs sm:text-sm text-rose-700 hover:underline truncate"
          >
            {shareUrl}
          </a>
        </div>
      )}

      {shareError && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700"
        >
          {shareError}
        </div>
      )}

      {loading && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              role="status"
              aria-label="Loading dashboard"
              className="h-48 rounded-2xl bg-white shadow-sm animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && error && !summary && (
        <div
          role="alert"
          className="mt-8 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700 flex items-center justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-white bg-rose-600 hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && summary && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GradesSection data={summary.grades} />
          <SessionsSection data={summary.upcomingSessions} />
          <ActivitySection data={summary.recentActivity} />
        </div>
      )}

      <div className="mt-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Ready to learn something new?</h2>
          <p className="mt-1 text-sm text-white/90">
            Browse our catalogue or jump into the practice generator.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/courses"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-medium transition-colors"
          >
            Browse catalogue
          </Link>
          <Link
            to="/practice"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-sm font-medium transition-colors"
          >
            Open practice
          </Link>
        </div>
      </div>
    </section>
  )
}
