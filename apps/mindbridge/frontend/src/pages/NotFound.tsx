import type { JSX } from 'react'
import { Link } from 'react-router-dom'

export default function NotFound(): JSX.Element {
  return (
    <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-4 text-slate-500">
        <Link to="/" className="text-indigo-700 hover:text-indigo-900 underline">
          Back home
        </Link>
      </p>
    </section>
  )
}
