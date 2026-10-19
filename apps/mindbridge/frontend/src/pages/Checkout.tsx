import { useEffect, useState, type FormEvent, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost, ApiError } from '../api/client'
import { Button } from '../components/Button'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useDefects } from '../contexts/DefectsContext'
import { formatPrice } from '../lib/format'
import type { CheckoutRequestBody, CheckoutResponse } from '../types/api'

interface FormState {
  cardNumber: string
  expiry: string
  cvv: string
  zip: string
}

interface FieldErrors {
  cardNumber?: string
  expiry?: string
  cvv?: string
  zip?: string
}

const INITIAL_FORM: FormState = {
  cardNumber: '4242 4242 4242 4242',
  expiry: '12/29',
  cvv: '123',
  zip: '94105'
}

function validate(state: FormState): FieldErrors {
  const next: FieldErrors = {}
  const digits = state.cardNumber.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) {
    next.cardNumber = 'Card number must be 13–19 digits.'
  }
  if (!/^\d{2}\/\d{2}$/.test(state.expiry.trim())) {
    next.expiry = 'Expiry must be MM/YY.'
  }
  if (!/^\d{3,4}$/.test(state.cvv.trim())) {
    next.cvv = 'CVV must be 3 or 4 digits.'
  }
  if (!state.zip.trim()) {
    next.zip = 'Zip code is required.'
  }
  return next
}

export default function Checkout(): JSX.Element {
  const navigate = useNavigate()
  const { cart, loading, clear } = useCart()
  const { state: auth } = useAuth()
  const { hasDefect } = useDefects()
  const allowDoubleSubmit = hasDefect('D-CHECKOUT-DUPLICATE')
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiErr, setApiErr] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && cart.items.length === 0) {
      navigate('/cart', { replace: true })
    }
  }, [loading, cart.items.length, navigate])

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setApiErr(null)
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      const payload: CheckoutRequestBody = {
        mockCard: {
          number: form.cardNumber.replace(/\s+/g, ''),
          expiry: form.expiry,
          cvv: form.cvv
        },
        zip: form.zip.trim()
      }
      const res = await apiPost<CheckoutResponse>('/api/checkout', payload)
      clear()
      navigate('/checkout/success', { replace: true, state: { order: res.order } })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login?next=/checkout', { replace: true })
        return
      }
      setApiErr(err instanceof ApiError ? err.message : 'Checkout failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  if (loading || cart.items.length === 0) {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div
          role="status"
          aria-label="Loading checkout"
          className="h-64 rounded-xl bg-white shadow-sm animate-pulse"
        />
      </section>
    )
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Checkout</h1>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          noValidate
          className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 space-y-5"
          aria-label="Checkout form"
        >
          {auth.status === 'authenticated' && (
            <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Checking out as{' '}
              <span className="font-medium text-slate-900">{auth.user.name}</span>,{' '}
              <span className="text-slate-600">{auth.user.email}</span>
            </div>
          )}

          <fieldset className="border-t border-slate-200 pt-5">
            <legend className="text-sm font-semibold text-slate-700">Payment (mock)</legend>
            <div className="mt-3 space-y-4">
              <div>
                <label htmlFor="cardNumber" className="block text-sm font-medium text-slate-700">
                  Card number
                </label>
                <input
                  id="cardNumber"
                  name="cardNumber"
                  type="text"
                  inputMode="numeric"
                  value={form.cardNumber}
                  onChange={(e) => update('cardNumber', e.target.value)}
                  aria-invalid={Boolean(errors.cardNumber)}
                  aria-describedby={errors.cardNumber ? 'cardNumber-error' : undefined}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                {errors.cardNumber && (
                  <p id="cardNumber-error" role="alert" className="mt-1 text-sm text-rose-600">
                    {errors.cardNumber}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expiry" className="block text-sm font-medium text-slate-700">
                    Expiry
                  </label>
                  <input
                    id="expiry"
                    name="expiry"
                    type="text"
                    value={form.expiry}
                    onChange={(e) => update('expiry', e.target.value)}
                    aria-invalid={Boolean(errors.expiry)}
                    aria-describedby={errors.expiry ? 'expiry-error' : undefined}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  {errors.expiry && (
                    <p id="expiry-error" role="alert" className="mt-1 text-sm text-rose-600">
                      {errors.expiry}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="cvv" className="block text-sm font-medium text-slate-700">
                    CVV
                  </label>
                  <input
                    id="cvv"
                    name="cvv"
                    type="text"
                    value={form.cvv}
                    onChange={(e) => update('cvv', e.target.value)}
                    aria-invalid={Boolean(errors.cvv)}
                    aria-describedby={errors.cvv ? 'cvv-error' : undefined}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  {errors.cvv && (
                    <p id="cvv-error" role="alert" className="mt-1 text-sm text-rose-600">
                      {errors.cvv}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="zip" className="block text-sm font-medium text-slate-700">
                  Zip code
                </label>
                <input
                  id="zip"
                  name="zip"
                  type="text"
                  inputMode="numeric"
                  value={form.zip}
                  onChange={(e) => update('zip', e.target.value)}
                  aria-invalid={Boolean(errors.zip)}
                  aria-describedby={errors.zip ? 'zip-error' : undefined}
                  data-testid="checkout-zip"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                {errors.zip && (
                  <p id="zip-error" role="alert" className="mt-1 text-sm text-rose-600">
                    {errors.zip}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {apiErr && (
            <div
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            >
              {apiErr}
            </div>
          )}

          <Button
            type="submit"
            disabled={allowDoubleSubmit ? false : submitting}
            data-testid="checkout-submit-btn"
            className="w-full justify-center"
          >
            {submitting && !allowDoubleSubmit ? 'Placing order…' : 'Place order'}
          </Button>
        </form>

        <aside className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6 lg:sticky lg:top-20 space-y-4">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <ul className="space-y-2 text-sm">
              {cart.items.map((line) => (
                <li key={line.courseId} className="flex justify-between gap-2">
                  <span className="text-slate-700">
                    {line.title}
                    {line.quantity > 1 ? ` × ${line.quantity}` : ''}
                  </span>
                  <span className="text-slate-900 font-medium">
                    {formatPrice(line.price * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-200 pt-3 flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatPrice(cart.total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
