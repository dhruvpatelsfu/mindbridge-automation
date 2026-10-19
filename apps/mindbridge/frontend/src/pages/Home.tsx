import { useEffect, useState, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, ApiError } from '../api/client'
import { Button } from '../components/Button'
import { CourseCard } from '../components/CourseCard'
import { useDefects } from '../contexts/DefectsContext'
import type { CoursesListResponse, CourseSummary } from '../types/api'

export default function Home(): JSX.Element {
  const navigate = useNavigate()
  const { hasDefect } = useDefects()
  // When the accessibility lab is active, the main call-to-action button text
  // renders in a low-contrast tone (indigo-400 on the indigo-600 button),
  // failing WCAG 2.1 SC 1.4.3 (contrast < 4.5:1).
  const lowContrastCta = hasDefect('D-WCAG-CONTRAST')
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiGet<CoursesListResponse>('/api/courses?featured=true')
      .then((res) => {
        if (cancelled) return
        setCourses(res.courses ?? [])
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load featured courses')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <section className="bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Sharpen your QA edge
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-indigo-100">
            Practical, lab-driven courses that put the craft of software quality at the centre —
            built to be stress-tested, not just consumed.
          </p>
          <div className="mt-8">
            <Button
              onClick={() => navigate('/courses')}
              aria-label="Browse all courses"
              data-testid="hero-cta"
              className={lowContrastCta ? '!text-indigo-400' : undefined}
            >
              Browse courses
            </Button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Featured Courses</h2>
        </div>

        {loading && (
          <div
            role="status"
            aria-label="Loading featured courses"
            className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
                <div className="aspect-[16/9] bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="mt-8 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700"
          >
            {error}
          </div>
        )}

        {!loading && !error && courses.length === 0 && (
          <p className="mt-8 text-slate-500">No featured courses yet — check the full catalogue.</p>
        )}

        {!loading && !error && courses.length > 0 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.slice(0, 6).map((c) => (
              <CourseCard key={c.id} course={c} featured />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
