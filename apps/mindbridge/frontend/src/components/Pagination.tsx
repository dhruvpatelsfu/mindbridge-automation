import type { JSX } from 'react'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (next: number) => void
}

export function Pagination({ page, totalPages, onChange }: PaginationProps): JSX.Element {
  const effectiveTotal = totalPages === 0 ? 0 : totalPages
  const prevDisabled = page <= 1
  const nextDisabled = totalPages === 0 || page >= totalPages

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-between gap-4 text-sm text-slate-600"
    >
      <span data-testid="pagination-status">
        Page {effectiveTotal === 0 ? 0 : page} of {effectiveTotal}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={prevDisabled}
          onClick={() => onChange(page - 1)}
          className="inline-flex items-center px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={nextDisabled}
          onClick={() => onChange(page + 1)}
          className="inline-flex items-center px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </nav>
  )
}
