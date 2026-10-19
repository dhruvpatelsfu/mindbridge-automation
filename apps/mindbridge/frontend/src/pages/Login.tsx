import { useState, type JSX } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../components/Button'
import { useAuth } from '../contexts/AuthContext'
import { ApiError } from '../api/client'

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.')
})

type LoginForm = z.infer<typeof loginSchema>

function useNextParam(): string {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const next = params.get('next')
  return next && next.startsWith('/') ? next : '/dashboard'
}

export default function Login(): JSX.Element {
  const navigate = useNavigate()
  const next = useNextParam()
  const { login } = useAuth()
  const [apiErr, setApiErr] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  })

  async function onSubmit(values: LoginForm): Promise<void> {
    setApiErr(null)
    try {
      await login(values)
      navigate(next, { replace: true })
    } catch (err) {
      setApiErr(
        err instanceof ApiError ? err.message : 'Sign in failed. Please try again.'
      )
    }
  }

  const registerHref =
    next === '/dashboard' ? '/register' : `/register?next=${encodeURIComponent(next)}`

  return (
    <section className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-2xl shadow-md p-8 sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to continue to your courses.
        </p>

        <form
          noValidate
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="mt-8 space-y-5"
          aria-label="Login form"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            {errors.password && (
              <p id="password-error" role="alert" className="mt-1 text-sm text-rose-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {apiErr && (
            <div
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            >
              {apiErr}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full justify-center">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          No account?{' '}
          <Link
            to={registerHref}
            className="font-medium text-indigo-600 hover:text-indigo-800"
          >
            Register
          </Link>
        </p>
      </div>
    </section>
  )
}
