import { useEffect, useState, type JSX } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ApiError, apiGet } from '../../api/client'
import { updateCourse, type CoursePatch } from '../../api/admin'
import { Button } from '../../components/Button'
import type { CourseDetail, CourseDetailResponse } from '../../types/api'

const editSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters.').max(200),
  subject: z.string().trim().min(1, 'Subject is required.').max(100),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  price: z
    .number({ invalid_type_error: 'Price must be a number.' })
    .min(0, 'Price cannot be negative.')
    .max(10_000)
    .refine((n) => Number.isFinite(n) && Math.round(n * 100) === n * 100, {
      message: 'Use at most two decimals.'
    }),
  description: z.string().trim().min(1, 'Description is required.'),
  image: z.string().trim().max(500),
  instructorId: z.string().trim().min(1, 'Instructor ID is required.').max(100),
  featured: z.boolean()
})

type EditForm = z.infer<typeof editSchema>

function FieldError({ id, message }: { id: string; message?: string }): JSX.Element | null {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-rose-600">
      {message}
    </p>
  )
}

function diffFields(values: EditForm, dirty: Partial<Record<keyof EditForm, boolean>>): CoursePatch {
  const patch: CoursePatch = {}
  ;(Object.keys(dirty) as Array<keyof EditForm>).forEach((key) => {
    if (!dirty[key]) return
    const value = values[key]
    if (key === 'price') patch.price = value as number
    else if (key === 'featured') patch.featured = value as boolean
    else if (key === 'level') patch.level = value as EditForm['level']
    else (patch as Record<string, unknown>)[key] = value
  })
  return patch
}

export default function AdminCourseEdit(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, dirtyFields }
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: '',
      subject: '',
      level: 'beginner',
      price: 0,
      description: '',
      image: '',
      instructorId: '',
      featured: false
    }
  })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    apiGet<CourseDetailResponse>(`/api/courses/${id}`)
      .then((res) => {
        if (cancelled) return
        const c = res.course
        setCourse(c)
        reset({
          title: c.title,
          subject: c.subject,
          level: c.level,
          price: c.price,
          description: c.description,
          image: c.image,
          instructorId: c.instructor.id,
          featured: false
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setLoadError('not_found')
        } else {
          setLoadError(err instanceof ApiError ? err.message : 'Could not load course.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, reset])

  async function onSubmit(values: EditForm): Promise<void> {
    if (!id) return
    setSubmitError(null)
    setSuccessMessage(null)
    const patch = diffFields(values, dirtyFields as Partial<Record<keyof EditForm, boolean>>)
    if (Object.keys(patch).length === 0) {
      setSuccessMessage('No changes to save.')
      return
    }
    try {
      await updateCourse(id, patch)
      setSuccessMessage('Course updated')
      navigate('/admin/courses')
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.fields) {
        for (const f of err.fields) {
          setError(f.field as keyof EditForm, { type: 'server', message: f.message })
        }
        setSubmitError(err.message)
        return
      }
      setSubmitError(err instanceof ApiError ? err.message : 'Could not save changes.')
    }
  }

  if (loading) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div
          role="status"
          aria-label="Loading course"
          className="h-64 rounded-xl bg-white shadow-sm animate-pulse"
        />
      </section>
    )
  }

  if (loadError === 'not_found') {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mx-auto max-w-md bg-white rounded-2xl shadow-md p-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Course not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            We couldn&apos;t find a course with that ID.
          </p>
          <Link
            to="/admin/courses"
            className="mt-6 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            ← Back to courses
          </Link>
        </div>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700"
        >
          {loadError}
        </div>
      </section>
    )
  }

  const orphanInstructor = course?.instructor.id === 'unknown'

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Edit course
        </h1>
        <Link
          to="/admin/courses"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← All courses
        </Link>
      </header>

      {successMessage && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {successMessage}
        </div>
      )}

      <form
        noValidate
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="mt-6 bg-white rounded-2xl shadow-md p-6 sm:p-8 space-y-5"
        aria-label="Edit course form"
      >
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            id="title"
            {...register('title')}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'title-error' : undefined}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <FieldError id="title-error" message={errors.title?.message} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-slate-700">
              Subject
            </label>
            <input
              id="subject"
              {...register('subject')}
              aria-invalid={Boolean(errors.subject)}
              aria-describedby={errors.subject ? 'subject-error' : undefined}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <FieldError id="subject-error" message={errors.subject?.message} />
          </div>
          <div>
            <label htmlFor="level" className="block text-sm font-medium text-slate-700">
              Level
            </label>
            <select
              id="level"
              {...register('level')}
              aria-invalid={Boolean(errors.level)}
              aria-describedby={errors.level ? 'level-error' : undefined}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <FieldError id="level-error" message={errors.level?.message} />
          </div>
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-slate-700">
            Price (USD)
          </label>
          <input
            id="price"
            type="number"
            step="0.01"
            min={0}
            {...register('price', { valueAsNumber: true })}
            aria-invalid={Boolean(errors.price)}
            aria-describedby={errors.price ? 'price-error' : undefined}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <FieldError id="price-error" message={errors.price?.message} />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="description"
            rows={6}
            {...register('description')}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'description-error' : undefined}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <FieldError id="description-error" message={errors.description?.message} />
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium text-slate-700">
            Image (path or gradient)
          </label>
          <input
            id="image"
            {...register('image')}
            aria-invalid={Boolean(errors.image)}
            aria-describedby={errors.image ? 'image-error' : undefined}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <FieldError id="image-error" message={errors.image?.message} />
        </div>

        <div>
          <label htmlFor="instructorId" className="block text-sm font-medium text-slate-700">
            Instructor ID
          </label>
          <input
            id="instructorId"
            {...register('instructorId')}
            readOnly
            aria-invalid={Boolean(errors.instructorId)}
            aria-describedby={errors.instructorId ? 'instructorId-error' : 'instructorId-help'}
            className="mt-1 block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
          />
          <p id="instructorId-help" className="mt-1 text-xs text-slate-500">
            {orphanInstructor
              ? 'This course has no linked instructor (legacy data). Instructor reassignment is deferred.'
              : `Linked to ${course?.instructor.name}.`}
          </p>
          <FieldError id="instructorId-error" message={errors.instructorId?.message} />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="featured"
            type="checkbox"
            {...register('featured')}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="featured" className="text-sm text-slate-700">
            Featured
          </label>
        </div>

        {submitError && (
          <div
            role="alert"
            className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link
            to="/admin/courses"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </section>
  )
}
