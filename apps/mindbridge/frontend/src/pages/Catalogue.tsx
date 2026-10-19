import { useEffect, useMemo, useState, type JSX } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet, ApiError } from '../api/client'
import { CourseCard } from '../components/CourseCard'
import { Pagination } from '../components/Pagination'
import { useDebounce } from '../hooks/useDebounce'
import { useDefects } from '../contexts/DefectsContext'
import type { CourseLevel, CoursesListResponse } from '../types/api'

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

const PAGE_SIZE = 20

function parseLevel(value: string | null): CourseLevel | '' {
  if (value === 'beginner' || value === 'intermediate' || value === 'advanced') return value
  return ''
}

function parsePage(value: string | null): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

function buildPath(params: URLSearchParams): string {
  const usp = new URLSearchParams()
  usp.set('page', params.get('page') ?? '1')
  usp.set('pageSize', String(PAGE_SIZE))
  const search = params.get('search')
  if (search) usp.set('search', search)
  const subject = params.get('subject')
  if (subject) usp.set('subject', subject)
  const level = params.get('level')
  if (level) usp.set('level', level)
  if (params.get('featured') === 'true') usp.set('featured', 'true')
  return `/api/courses?${usp.toString()}`
}

function LoadingGrid(): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading courses"
      className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-slate-200" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Catalogue(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasDefect } = useDefects()
  const overflowGrid = hasDefect('D-RESPONSIVE-768')

  const urlSearch = searchParams.get('search') ?? ''
  const urlSubject = searchParams.get('subject') ?? ''
  const urlLevel = parseLevel(searchParams.get('level'))
  const urlFeatured = searchParams.get('featured') === 'true'
  const page = parsePage(searchParams.get('page'))

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

  const [data, setData] = useState<CoursesListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const requestPath = useMemo(() => buildPath(searchParams), [searchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiGet<CoursesListResponse>(requestPath)
      .then((res) => {
        if (cancelled) return
        setData(res)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load courses')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [requestPath])

  function updateParam(key: string, value: string | null, resetPage = true): void {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
    if (resetPage) next.set('page', '1')
    setSearchParams(next, { replace: true })
  }

  function clearFilters(): void {
    setSearchInput('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  function changePage(nextPage: number): void {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(nextPage))
    setSearchParams(next, { replace: true })
  }

  const courses = data?.courses ?? []
  const pagination = data?.pagination ?? { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 }
  const hasFilters = Boolean(urlSearch || urlSubject || urlLevel || urlFeatured)

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">All Courses</h1>
        <p className="mt-2 text-slate-500">Browse the full MindBridge catalogue.</p>
      </header>

      <div className="mt-6 sticky top-16 z-20 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 rounded-xl px-3 py-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label htmlFor="catalogue-search" className="block text-xs font-medium text-slate-600">
              Search
            </label>
            <input
              id="catalogue-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title or description"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
            />
          </div>
          <div>
            <label htmlFor="catalogue-subject" className="block text-xs font-medium text-slate-600">
              Subject
            </label>
            <select
              id="catalogue-subject"
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
            <label htmlFor="catalogue-level" className="block text-xs font-medium text-slate-600">
              Level
            </label>
            <select
              id="catalogue-level"
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
          <div className="flex items-center gap-2 pb-1">
            <input
              id="catalogue-featured"
              type="checkbox"
              checked={urlFeatured}
              onChange={(e) => updateParam('featured', e.target.checked ? 'true' : null)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="catalogue-featured" className="text-sm text-slate-700">
              Featured only
            </label>
          </div>
        </div>
      </div>

      {loading && <LoadingGrid />}

      {!loading && error && (
        <div
          role="alert"
          className="mt-8 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700"
        >
          {error}
        </div>
      )}

      {!loading && !error && courses.length === 0 && (
        <div className="mt-8 bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-slate-700">No courses match your filters.</p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {!loading && !error && courses.length > 0 && (
        <>
          <div
            data-testid="catalogue-results-grid"
            className={
              overflowGrid
                ? 'mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-md:-mx-12 max-md:overflow-visible max-md:relative max-md:z-40'
                : 'mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
            }
          >
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onChange={changePage}
          />
        </>
      )}
    </section>
  )
}
