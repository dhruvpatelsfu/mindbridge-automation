import { useEffect, useState, type JSX } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGet, ApiError } from '../api/client'
import { Button } from '../components/Button'
import { useCart } from '../contexts/CartContext'
import { useDefects } from '../contexts/DefectsContext'
import { formatPrice } from '../lib/format'
import { courseThumbnailUrl } from '../lib/thumbnail'
import type { CourseDetail as CourseDetailType, CourseDetailResponse } from '../types/api'

const LEVEL_CHIP: Record<CourseDetailType['level'], string> = {
  beginner: 'bg-emerald-100 text-emerald-800',
  intermediate: 'bg-amber-100 text-amber-800',
  advanced: 'bg-rose-100 text-rose-800'
}

export default function CourseDetail(): JSX.Element {
  const { id = '' } = useParams<{ id: string }>()
  const { addItem } = useCart()
  const { hasDefect } = useDefects()
  const [course, setCourse] = useState<CourseDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiGet<CourseDetailResponse>(`/api/courses/${id}`)
      .then((res) => {
        if (cancelled) return
        setCourse(res.course)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load course')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleAdd(): Promise<void> {
    if (!course || adding) return
    setAdding(true)
    try {
      await addItem(course.id, 1)
      setToast('Added to cart')
      window.setTimeout(() => setToast(null), 2500)
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : 'Could not add to cart')
      window.setTimeout(() => setToast(null), 3500)
    } finally {
      setAdding(false)
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/courses"
        className="inline-flex items-center text-sm text-indigo-700 hover:text-indigo-900 transition-colors"
      >
        ← Back to catalogue
      </Link>

      {loading && (
        <div role="status" aria-label="Loading course" className="mt-6 animate-pulse">
          <div className="aspect-[21/9] w-full rounded-xl bg-slate-200" />
          <div className="mt-6 h-8 w-2/3 bg-slate-200 rounded" />
          <div className="mt-4 h-4 w-1/3 bg-slate-200 rounded" />
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700"
        >
          {error}
        </div>
      )}

      {!loading && !error && course && (
        <article className="mt-6">
          <div
            className="aspect-[21/9] w-full rounded-xl overflow-hidden relative"
            style={{ background: course.image || 'linear-gradient(135deg,#6366f1,#a855f7)' }}
          >
            {(() => {
              const altMissing = hasDefect('D-WCAG-ALT')
              const props: Record<string, string | number> = {
                src: courseThumbnailUrl(course.id),
                width: 1280,
                height: 540,
                loading: 'lazy'
              }
              if (!altMissing) {
                props.alt = `Cover image for ${course.title}`
              }
              return (
                <img
                  {...props}
                  data-testid="course-hero"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )
            })()}
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-5">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{course.title}</h1>

              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                  {course.subject}
                </span>
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${LEVEL_CHIP[course.level]}`}
                >
                  {course.level}
                </span>
              </div>

              <p className="text-sm text-slate-600">
                Instructor · {course.instructor?.name ?? 'TBA'}
              </p>

              <div className="pt-2 prose prose-slate max-w-none">
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {course.description}
                </p>
              </div>
            </div>

            <aside className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-6 lg:sticky lg:top-20 space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Price</p>
                  <p className="text-3xl font-bold text-slate-900">{formatPrice(course.price)}</p>
                </div>
                <Button onClick={handleAdd} disabled={adding} className="w-full justify-center">
                  {adding ? 'Adding…' : 'Add to cart'}
                </Button>
                <Link
                  to={`/enroll/${course.id}`}
                  data-testid="course-enroll-btn"
                  className="block w-full text-center px-4 py-2 rounded-md text-white font-medium bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-colors"
                >
                  Enrol now
                </Link>
                {toast && (
                  <div
                    role="status"
                    className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800"
                  >
                    {toast}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </article>
      )}
    </section>
  )
}
