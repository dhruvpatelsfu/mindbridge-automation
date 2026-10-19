import type { JSX } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { useCart } from '../contexts/CartContext'
import { formatPrice } from '../lib/format'

export default function Cart(): JSX.Element {
  const { cart, loading, error, updateQty, removeItem } = useCart()
  const navigate = useNavigate()

  if (loading) {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div
          role="status"
          aria-label="Loading cart"
          className="h-32 rounded-xl bg-white shadow-sm animate-pulse"
        />
      </section>
    )
  }

  if (cart.items.length === 0) {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Your cart is empty</h1>
        <p className="mt-3 text-slate-500">Find something to learn next.</p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-600">
            {error}
          </p>
        )}
        <div className="mt-8 inline-block">
          <Button onClick={() => navigate('/courses')}>Browse courses</Button>
        </div>
      </section>
    )
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Your cart</h1>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ul className="lg:col-span-2 space-y-4">
          {cart.items.map((line) => (
            <li
              key={line.courseId}
              className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-4"
            >
              <div
                className="w-full sm:w-20 h-20 rounded-lg shrink-0"
                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <Link
                  to={`/courses/${line.courseId}`}
                  className="font-semibold text-slate-900 hover:text-indigo-700 transition-colors"
                >
                  {line.title}
                </Link>
                <p className="mt-1 text-sm text-slate-500">
                  {formatPrice(line.price)} × {line.quantity}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void updateQty(line.courseId, Math.max(1, line.quantity - 1))}
                    disabled={line.quantity <= 1}
                    aria-label={`Decrease quantity for ${line.title}`}
                    className="w-8 h-8 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium" aria-live="polite">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => void updateQty(line.courseId, line.quantity + 1)}
                    aria-label={`Increase quantity for ${line.title}`}
                    className="w-8 h-8 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeItem(line.courseId)}
                    className="ml-3 text-sm text-rose-600 hover:text-rose-800"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="text-right shrink-0 font-semibold text-slate-900">
                {formatPrice(line.price * line.quantity)}
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6 lg:sticky lg:top-20 space-y-4">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{formatPrice(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 pt-3">
              <span>Total</span>
              <span>{formatPrice(cart.total)}</span>
            </div>
            <Button onClick={() => navigate('/checkout')} className="w-full justify-center">
              Checkout
            </Button>
          </div>
        </aside>
      </div>
    </section>
  )
}
