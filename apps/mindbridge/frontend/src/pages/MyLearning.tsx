import { useCallback, useEffect, useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { fetchMyEnrolments } from '../api/me'
import { formatLongDate } from '../lib/format'
import type { DashboardEnrolment } from '../types/api'

const LEVEL_CHIP: Record<DashboardEnrolment['course']['level'], string> = {
  beginner: 'bg-emerald-100 text-emerald-800',
  intermediate: 'bg-amber-100 text-amber-800',
  advanced: 'bg-rose-100 text-rose-800'
}

const STATUS_CHIP: Record<DashboardEnrolment['status'], string> = {
  active: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-200 text-slate-700'
}

function EnrolmentCard({ enrolment }: { enrolment: DashboardEnrolment }): JSX.Element {
  const { course, status, enrolledAt } = enrolment
  return (
    <Link
      to={`/courses/${course.id}`}
      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
    >
      <div
        className="aspect-[16/9] w-full"
        style={{ background: course.image || 'linear-gradient(135deg,#6366f1,#a855f7)' }}
        aria-hidden="true"
      />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-slate-900 leading-snug group-hover:text-indigo-700 transition-colors">
            {course.title}
          </h3>
          <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_CHIP[status]}`}>
            {status}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
            {course.subject}
          </span>
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${LEVEL_CHIP[course.level]}`}>
            {course.level}
          </span>
        </div>
        <p className="text-xs text-slate-500">Enrolled {formatLongDate(enrolledAt)}</p>
      </div>
    </Link>
  )
}

function LoadingGrid(): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading enrolments"
      className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-slate-200" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
            <div className="h-3 bg-slate-200 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MyLearning(): JSX.Element {
  const [enrolments, setEnrolments] = useState<DashboardEnrolment[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchMyEnrolments()
      setEnrolments(res.enrolments ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your enrolments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-600 bg-clip-text text-transparent">
          My Learning
        </h1>
        <p className="mt-2 text-slate-500">Track the courses you&apos;re enrolled in.</p>
      </header>

      {loading && <LoadingGrid />}

      {!loading && error && (
        <div
          role="alert"
          className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700"
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

      {!loading && !error && enrolments && enrolments.length === 0 && (
        <div className="mt-10 bg-white rounded-2xl shadow-sm p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No enrolments yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            You haven&apos;t enrolled in any courses yet. Browse the catalogue to get started.
          </p>
          <Link
            to="/courses"
            className="mt-6 inline-flex items-center px-4 py-2 rounded-md text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-sm font-medium transition-colors"
          >
            Browse catalogue
          </Link>
        </div>
      )}

      {!loading && !error && enrolments && enrolments.length > 0 && (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolments.map((e) => (
            <EnrolmentCard key={e.id} enrolment={e} />
          ))}
        </div>
      )}
    </section>
  )
}
