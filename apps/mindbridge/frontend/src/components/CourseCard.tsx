import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import { useDefects } from '../contexts/DefectsContext'
import { formatPrice, truncate } from '../lib/format'
import { courseThumbnailUrl } from '../lib/thumbnail'
import type { CourseSummary } from '../types/api'

const LEVEL_CHIP: Record<CourseSummary['level'], string> = {
  beginner: 'bg-emerald-100 text-emerald-800',
  intermediate: 'bg-amber-100 text-amber-800',
  advanced: 'bg-rose-100 text-rose-800'
}

export interface CourseCardProps {
  course: CourseSummary
  featured?: boolean
}

export function CourseCard({ course, featured = false }: CourseCardProps): JSX.Element {
  const { hasDefect } = useDefects()
  const altMissing = hasDefect('D-WCAG-ALT')
  const lowContrast = hasDefect('D-WCAG-CONTRAST')

  const altText = altMissing ? undefined : `Cover image for ${course.title}`
  const metaTone = lowContrast ? 'text-slate-300' : 'text-slate-700'
  const instructor = course.instructorName

  const imgProps: Record<string, string | number> = {
    src: courseThumbnailUrl(course.id),
    width: 640,
    height: 360,
    loading: 'lazy'
  }
  if (altText !== undefined) {
    imgProps.alt = altText
  }

  return (
    <Link
      to={`/courses/${course.id}`}
      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
    >
      <div
        className="aspect-[16/9] w-full relative"
        style={{ background: course.image || 'linear-gradient(135deg,#6366f1,#a855f7)' }}
      >
        <img
          {...imgProps}
          data-testid="course-thumb"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-slate-900 leading-snug group-hover:text-indigo-700 transition-colors">
            {course.title}
          </h3>
          {!featured && (
            <span className="shrink-0 text-sm font-semibold text-slate-900">
              {formatPrice(course.price)}
            </span>
          )}
        </div>

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

        {course.description && (
          <p className="text-sm text-slate-600 leading-relaxed">
            {truncate(course.description, 100)}
          </p>
        )}

        {featured && (
          <div
            className={`flex items-center justify-between pt-2 border-t border-slate-100 text-sm font-medium ${metaTone}`}
            data-testid="featured-meta"
          >
            <span data-testid="featured-instructor">{instructor ?? 'Instructor'}</span>
            <span data-testid="featured-price">{formatPrice(course.price)}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
