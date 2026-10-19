import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX
} from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../components/Button'
import { useAuth } from '../contexts/AuthContext'
import { useDefects } from '../contexts/DefectsContext'
import { ApiError } from '../api/client'

type SubscriptionTier = 'free' | 'pro'

interface WizardState {
  email: string
  password: string
  name: string
  dateOfBirth: string
  region: string
  subscriptionTier: SubscriptionTier | ''
}

const STORAGE_KEY = 'mindbridge:register-wizard'

const INITIAL_STATE: WizardState = {
  email: '',
  password: '',
  name: '',
  dateOfBirth: '',
  region: '',
  subscriptionTier: ''
}

function readStorage(): WizardState {
  if (typeof window === 'undefined') return INITIAL_STATE
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_STATE
    const parsed = JSON.parse(raw) as Partial<WizardState>
    return { ...INITIAL_STATE, ...parsed }
  } catch {
    return INITIAL_STATE
  }
}

function writeStorage(state: WizardState, dropPassword: boolean): void {
  if (typeof window === 'undefined') return
  try {
    const payload = dropPassword ? { ...state, password: '' } : state
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota / private-mode errors — wizard still works in-memory.
  }
}

function stripPasswordFromStorage(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Partial<WizardState>
    if ('password' in parsed) {
      delete parsed.password
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    }
  } catch {
    // ignore
  }
}

function clearStorage(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

interface WizardContextValue {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
  reset: () => void
}

const WizardContext = createContext<WizardContextValue | null>(null)

function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('Register wizard step must be rendered inside <Register />')
  return ctx
}

function useNextParam(): string {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const next = params.get('next')
  if (next && next.startsWith('/')) return next
  return '/dashboard'
}

function StepIndicator({ current }: { current: 1 | 2 | 3 }): JSX.Element {
  const steps: Array<{ index: 1 | 2 | 3; label: string }> = [
    { index: 1, label: 'Email' },
    { index: 2, label: 'Password' },
    { index: 3, label: 'Profile' }
  ]
  return (
    <ol className="flex items-center justify-between mb-8" aria-label="Registration steps">
      {steps.map((s, i) => {
        const active = s.index === current
        const complete = s.index < current
        return (
          <li key={s.index} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <span
                aria-current={active ? 'step' : undefined}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  active
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                    : complete
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                }`}
              >
                {s.index}
              </span>
              <span
                className={`text-xs font-medium ${
                  active ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-3 h-px flex-1 bg-slate-200" aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default function Register(): JSX.Element {
  const { hasDefect } = useDefects()
  const dropPassword = hasDefect('D-REG-BACK-LOSS')
  const [state, setState] = useState<WizardState>(() => readStorage())

  useEffect(() => {
    writeStorage(state, dropPassword)
  }, [state, dropPassword])

  // When the defect is active, history navigation (popstate) between step
  // routes also strips the password slot from sessionStorage and clears the
  // in-memory copy, so the user finds an empty password field after Back -> Forward.
  useEffect(() => {
    if (!dropPassword) return
    function handlePopState(): void {
      stripPasswordFromStorage()
      setState((prev) => ({ ...prev, password: '' }))
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [dropPassword])

  const update = useCallback((patch: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setState(INITIAL_STATE)
    clearStorage()
  }, [])

  const value = useMemo<WizardContextValue>(() => ({ state, update, reset }), [state, update, reset])

  return (
    <section className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-2xl shadow-md p-8 sm:p-10" data-testid="register-wizard">
        <h1 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Three quick steps and you are ready to learn.
        </p>

        <WizardContext.Provider value={value}>
          <div className="mt-8">
            <Outlet />
          </div>
        </WizardContext.Provider>
      </div>
    </section>
  )
}

export function RegisterIndexRedirect(): JSX.Element {
  return <Navigate to="step/1" replace />
}

const step1Schema = z.object({
  email: z.string().trim().email('Enter a valid email address.')
})

export function RegisterStep1(): JSX.Element {
  const navigate = useNavigate()
  const next = useNextParam()
  const { state, update } = useWizard()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<{ email: string }>({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: state.email }
  })

  function onSubmit(values: { email: string }): void {
    update({ email: values.email.trim() })
    const qs = next === '/dashboard' ? '' : `?next=${encodeURIComponent(next)}`
    navigate(`/register/step/2${qs}`)
  }

  return (
    <form
      noValidate
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      className="space-y-5"
      aria-label="Register step 1"
    >
      <StepIndicator current={1} />

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          data-testid="register-step-1-email"
          {...register('email')}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
        {errors.email && (
          <p id="email-error" role="alert" className="mt-1 text-sm text-rose-600">
            {errors.email.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full justify-center"
        data-testid="register-step-1-next"
      >
        Continue
      </Button>

      <p className="mt-2 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-800">
          Log in
        </Link>
      </p>
    </form>
  )
}

const step2Schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters.')
})

// When the D-REG-SPECIALCHAR defect is active the password step advertises
// the corrected requirement (>= 10 chars including a special character) but
// its validator wrongly rejects special characters, so a compliant password
// like "testpassword123!" fails with a contradictory error message.
const step2SchemaRejectSpecials = z.object({
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters.')
    .regex(/^[A-Za-z0-9]*$/, 'Password must not contain special characters.')
})

export function RegisterStep2(): JSX.Element {
  const navigate = useNavigate()
  const next = useNextParam()
  const { state, update } = useWizard()
  const { hasDefect } = useDefects()
  const rejectSpecials = hasDefect('D-REG-SPECIALCHAR')

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors }
  } = useForm<{ password: string }>({
    resolver: zodResolver(rejectSpecials ? step2SchemaRejectSpecials : step2Schema),
    defaultValues: { password: state.password }
  })

  useEffect(() => {
    if (!state.email) {
      navigate('/register/step/1', { replace: true })
    }
  }, [state.email, navigate])

  function onSubmit(values: { password: string }): void {
    update({ password: values.password })
    const qs = next === '/dashboard' ? '' : `?next=${encodeURIComponent(next)}`
    navigate(`/register/step/3${qs}`)
  }

  function goBack(): void {
    update({ password: getValues('password') })
    navigate('/register/step/1')
  }

  return (
    <form
      noValidate
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      className="space-y-5"
      aria-label="Register step 2"
    >
      <StepIndicator current={2} />

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          data-testid="register-step-2-password"
          {...register('password')}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : 'password-hint'}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
        {errors.password ? (
          <p id="password-error" role="alert" className="mt-1 text-sm text-rose-600">
            {errors.password.message}
          </p>
        ) : (
          <p id="password-hint" className="mt-1 text-xs text-slate-500">
            {rejectSpecials
              ? 'Use at least 10 characters, including at least one special character.'
              : 'Use at least 8 characters. Longer passphrases are stronger.'}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          data-testid="register-step-2-back"
          className="inline-flex items-center px-4 py-2 rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-sm font-medium"
        >
          Back
        </button>
        <Button
          type="submit"
          className="flex-1 justify-center"
          data-testid="register-step-2-next"
        >
          Continue
        </Button>
      </div>
    </form>
  )
}

const step3SchemaStrict = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
  dateOfBirth: z.string().trim().optional(),
  region: z.string().trim().max(80).optional(),
  subscriptionTier: z.union([z.literal(''), z.enum(['free', 'pro'])]).optional()
})

// When the D-REG-WHITESPACE defect is active the wizard skips the trim
// and relaxes min(2) -> min(1) on `name`, so a value like "   " passes
// client-side validation and is sent to the backend untouched.
const step3SchemaSkipTrim = z.object({
  name: z.string().min(1, 'Name is required.').max(100),
  dateOfBirth: z.string().optional(),
  region: z.string().max(80).optional(),
  subscriptionTier: z.union([z.literal(''), z.enum(['free', 'pro'])]).optional()
})

type Step3Values = z.infer<typeof step3SchemaStrict>

export function RegisterStep3(): JSX.Element {
  const navigate = useNavigate()
  const next = useNextParam()
  const { state, update, reset } = useWizard()
  const { register: registerUser } = useAuth()
  const { hasDefect } = useDefects()
  const skipTrim = hasDefect('D-REG-WHITESPACE')
  const [apiErr, setApiErr] = useState<string | null>(null)

  const activeSchema = skipTrim ? step3SchemaSkipTrim : step3SchemaStrict
  const trimName = (value: string): string => (skipTrim ? value : value.trim())

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm<Step3Values>({
    resolver: zodResolver(activeSchema),
    defaultValues: {
      name: state.name,
      dateOfBirth: state.dateOfBirth,
      region: state.region,
      subscriptionTier: state.subscriptionTier
    }
  })

  useEffect(() => {
    if (!state.email || !state.password) {
      navigate('/register/step/1', { replace: true })
    }
  }, [state.email, state.password, navigate])

  async function onSubmit(values: Step3Values): Promise<void> {
    setApiErr(null)
    update({
      name: trimName(values.name),
      dateOfBirth: values.dateOfBirth ?? '',
      region: values.region ?? '',
      subscriptionTier: (values.subscriptionTier ?? '') as SubscriptionTier | ''
    })

    try {
      const dob = values.dateOfBirth?.trim()
      const region = values.region?.trim()
      const tier = values.subscriptionTier === '' ? undefined : values.subscriptionTier
      await registerUser({
        email: state.email,
        password: state.password,
        name: trimName(values.name),
        ...(dob ? { dateOfBirth: dob } : {}),
        ...(region ? { region } : {}),
        ...(tier ? { subscriptionTier: tier } : {})
      })
      reset()
      navigate(next, { replace: true })
    } catch (err) {
      // 400s from registration are surfaced as a generic "Registration
      // failed" so the learner has to inspect the network response in
      // DevTools to identify the actual cause (e.g. a missing payload
      // field). Other statuses keep the server-supplied message.
      if (err instanceof ApiError && err.status === 400) {
        setApiErr('Registration failed. Please try again.')
      } else if (err instanceof ApiError) {
        setApiErr(err.message)
      } else {
        setApiErr('Registration failed. Please try again.')
      }
    }
  }

  function goBack(): void {
    const values = getValues()
    update({
      name: trimName(values.name ?? ''),
      dateOfBirth: values.dateOfBirth ?? '',
      region: values.region ?? '',
      subscriptionTier: (values.subscriptionTier ?? '') as SubscriptionTier | ''
    })
    navigate('/register/step/2')
  }

  return (
    <form
      noValidate
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      className="space-y-5"
      aria-label="Register step 3"
    >
      <StepIndicator current={3} />

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          data-testid="register-step-3-name"
          {...register('name')}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
        {errors.name && (
          <p id="name-error" role="alert" className="mt-1 text-sm text-rose-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="dob" className="block text-sm font-medium text-slate-700">
          Date of birth <span className="text-slate-400 text-xs">(optional)</span>
        </label>
        <input
          id="dob"
          type="date"
          data-testid="register-step-3-dob"
          {...register('dateOfBirth')}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
      </div>

      <div>
        <label htmlFor="region" className="block text-sm font-medium text-slate-700">
          Region <span className="text-slate-400 text-xs">(optional)</span>
        </label>
        <input
          id="region"
          type="text"
          data-testid="register-step-3-region"
          {...register('region')}
          placeholder="e.g. EMEA, NA, APAC"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
      </div>

      <div>
        <label htmlFor="tier" className="block text-sm font-medium text-slate-700">
          Subscription tier <span className="text-slate-400 text-xs">(optional)</span>
        </label>
        <select
          id="tier"
          data-testid="register-step-3-tier"
          {...register('subscriptionTier')}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
        >
          <option value="">— Select a tier —</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      {apiErr && (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          {apiErr}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          data-testid="register-step-3-back"
          className="inline-flex items-center px-4 py-2 rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-sm font-medium"
        >
          Back
        </button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 justify-center"
          data-testid="register-submit-btn"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </div>
    </form>
  )
}
