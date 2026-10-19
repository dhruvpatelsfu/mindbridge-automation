import { useEffect, useState, type JSX } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ApiError, apiGet } from '../api/client'
import { enrolInCourse } from '../api/profile'
import { Button } from '../components/Button'
import type { CourseDetail, CourseDetailResponse } from '../types/api'

const enrollSchema = z.object({
  dateOfBirth: z.string().trim().min(1, 'Date of birth is required.')
})

type EnrollForm = z.infer<typeof enrollSchema>

export default function Enroll(): JSX.Element {
  const { courseId = '' } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<EnrollForm>({
    resolver: zodResolver(enrollSchema),
    defaultValues: { dateOfBirth: '' }
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiGet<CourseDetailResponse>(`/api/courses/${courseId}`)
      .then((res) => {
        if (cancelled) return
        setCourse(res.course)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load course.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [courseId])

  async function onSubmit(values: EnrollForm): Promise<void> {
    setError(null)
    try {
      await enrolInCourse(courseId, values.dateOfBirth.trim())
      setSuccess(true)
      window.setTimeout(() => {
        navigate('/dashboard', { replace: true, state: { enrolled: courseId } })
      }, 1200)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Could not complete enrolment.')
      }
    }
  }

  return (
    <section className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-2xl shadow-md p-8 sm:p-10">
        <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
          Enrol in this course
        </h1>
        {loading && (
          <div
            role="status"
            aria-label="Loading course"
            className="mt-6 h-12 rounded bg-slate-100 animate-pulse"
          />
        )}
        {!loading && course && (
          <p className="mt-2 text-sm text-slate-600">
            <strong>{course.title}</strong> · {course.subject} · {course.level}
          </p>
        )}
        {!loading && !course && error && <p className="mt-2 text-sm text-rose-700">{error}</p>}

        {!loading && course && (
          <form
            noValidate
            onSubmit={(e) => void handleSubmit(onSubmit)(e)}
            className="mt-8 space-y-5"
            aria-label="Enrolment form"
          >
            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-slate-700">
                Date of birth
              </label>
              <input
                id="dob"
                type="text"
                inputMode="numeric"
                autoComplete="bday"
                placeholder="YYYY-MM-DD or MM-DD-YYYY"
                data-testid="enroll-dob"
                {...register('dateOfBirth')}
                aria-invalid={Boolean(errors.dateOfBirth)}
                aria-describedby={errors.dateOfBirth ? 'dob-format dob-error' : 'dob-format'}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              />
              <p id="dob-format" className="mt-1 text-xs text-slate-500">
                Accepted formats include YYYY-MM-DD and MM-DD-YYYY.
              </p>
              {errors.dateOfBirth && (
                <p id="dob-error" role="alert" className="mt-1 text-sm text-rose-600">
                  {errors.dateOfBirth.message}
                </p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                data-testid="enroll-error"
                className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                data-testid="enroll-success"
                className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
              >
                Enrolment confirmed. Redirecting to your dashboard…
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="enroll-submit-btn"
              className="w-full justify-center bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 focus-visible:outline-cyan-600"
            >
              {isSubmitting ? 'Enrolling…' : 'Enrol now'}
            </Button>

            <p className="text-center text-sm text-slate-600">
              Changed your mind?{' '}
              <Link
                to={`/courses/${courseId}`}
                className="font-medium text-cyan-700 hover:text-cyan-900"
              >
                Back to course
              </Link>
            </p>
          </form>
        )}
      </div>
    </section>
  )
}
