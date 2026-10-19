import { useEffect, useMemo, useState, type JSX } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { listAdminCourses } from '../../api/admin'
import { Pagination } from '../../components/Pagination'
import { useDebounce } from '../../hooks/useDebounce'
import { formatLongDate, formatPrice } from '../../lib/format'
import type { AdminCoursesListResponse, CourseLevel, CourseSummary } from '../../types/api'

const LEVEL_OPTIONS: Array<{ value: CourseLevel | ''; label: string }> = [
  { value: '', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
]

const SUBJECT_OPTIONS = [
  'Software Testing',
  'Test Automation',
  'Performance Testing',
  'Security Testing',
  'API Testing',
  'Mobile Testing',
  'Test Strategy'
]

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

function parseLevel(value: string | null): CourseLevel | '' {
  if (value === 'beginner' || value === 'intermediate' || value === 'advanced') return value
  return ''
}

function parsePageSize(value: string | null): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 20
  if (PAGE_SIZE_OPTIONS.includes(n as (typeof PAGE_SIZE_OPTIONS)[number])) return n
  return 20
}

function parsePage(value: string | null): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

function CourseRow({ course }: { course: CourseSummary }): JSX.Element {
  return (
    <tr className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-sm">
        <Link
          to={`/admin/courses/${course.id}`}
          className="font-medium text-indigo-700 hover:text-indigo-900"
        >
          {course.title}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700">{course.subject}</td>
      <td className="px-4 py-3 text-sm text-slate-700 capitalize">{course.level}</td>
      <td className="px-4 py-3 text-sm text-slate-700">{formatPrice(course.price)}</td>
      <td className="px-4 py-3 text-sm text-slate-700">
        {course.featured ? '✓' : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">{formatLongDate(course.updatedAt)}</td>
    </tr>
  )
}

export default function AdminCourses(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()

  const urlSearch = searchParams.get('search') ?? ''
  const urlSubject = searchParams.get('subject') ?? ''
  const urlLevel = parseLevel(searchParams.get('level'))
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('pageSize'))

  const [searchInput, setSearchInput] = useState(urlSearch)
  const debouncedSearch = useDebounce(searchInput, 300)

  useEffect(() => {
    if (debouncedSearch === urlSearch) return
    const next = new URLSearchParams(searchParams)
    if (debouncedSearch) next.set('search', debouncedSearch)
    else next.delete('search')
    next.set('page', '1')
    setSearchParams(next, { replace: true })
  }, [debouncedSearch, urlSearch, searchParams, setSearchParams])

  const [data, setData] = useState<AdminCoursesListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(
    () => ({
      page,
      pageSize,
      search: urlSearch || undefined,
      subject: urlSubject || undefined,
      level: urlLevel || undefined
    }),
    [page, pageSize, urlSearch, urlSubject, urlLevel]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listAdminCourses(query)
      .then((res) => {
        if (cancelled) return
        setData(res)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load courses.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  function updateParam(key: string, value: string | null, resetPage = true): void {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
    if (resetPage) next.set('page', '1')
    setSearchParams(next, { replace: true })
  }

  function changePage(nextPage: number): void {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(nextPage))
    setSearchParams(next, { replace: true })
  }

  const courses = data?.courses ?? []
  const pagination = data?.pagination ?? { page, pageSize, total: 0, totalPages: 0 }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-rose-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
            Course management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage every course in the catalogue.
          </p>
        </div>
      </header>

      <div className="mt-6 rounded-xl bg-white shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label htmlFor="admin-search" className="block text-xs font-medium text-slate-600">
            Search
          </label>
          <input
            id="admin-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search title or description"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label htmlFor="admin-subject" className="block text-xs font-medium text-slate-600">
            Subject
          </label>
          <select
            id="admin-subject"
            value={urlSubject}
            onChange={(e) => updateParam('subject', e.target.value || null)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="">All subjects</option>
            {SUBJECT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="admin-level" className="block text-xs font-medium text-slate-600">
            Level
          </label>
          <select
            id="admin-level"
            value={urlLevel}
            onChange={(e) => updateParam('level', e.target.value || null)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
          >
            {LEVEL_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="admin-page-size" className="block text-xs font-medium text-slate-600">
            Page size
          </label>
          <select
            id="admin-page-size"
            value={pageSize}
            onChange={(e) => updateParam('pageSize', e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div
          role="status"
          aria-label="Loading courses"
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

      {!loading && !error && courses.length === 0 && (
        <p className="mt-6 text-slate-500">No courses match the current filters.</p>
      )}

      {!loading && !error && courses.length > 0 && (
        <div className="mt-6 overflow-x-auto bg-white rounded-xl shadow-sm">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Title</th>
                <th scope="col" className="px-4 py-3 font-semibold">Subject</th>
                <th scope="col" className="px-4 py-3 font-semibold">Level</th>
                <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                <th scope="col" className="px-4 py-3 font-semibold">Featured</th>
                <th scope="col" className="px-4 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <CourseRow key={c.id} course={c} />
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
