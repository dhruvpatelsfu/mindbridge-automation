import { useEffect, type JSX } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { formatPrice } from '../lib/format'
import type { Order } from '../types/api'

interface LocationState {
  order?: Order
}

export default function Confirmation(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? null) as LocationState | null
  const order = state?.order

  useEffect(() => {
    if (!order) {
      navigate('/', { replace: true })
    }
  }, [order, navigate])

  if (!order) {
    return <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12" />
  }

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="w-8 h-8 text-emerald-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">Order placed</h1>
        <p className="mt-2 text-slate-600">
          Order #{order.id} · USD {formatPrice(order.amount).replace('$', '')}
        </p>
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow-sm p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">You&apos;re enrolled in:</h2>
        <ul className="mt-4 space-y-3">
          {order.enrolments.map((enr) => (
            <li key={enr.id} className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-lg shrink-0"
                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">{enr.courseTitle}</p>
                <p className="text-xs text-slate-500">Enrolled · {enr.status}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 text-center">
        <Button onClick={() => navigate('/courses')}>Back to catalogue</Button>
      </div>
    </section>
  )
}
