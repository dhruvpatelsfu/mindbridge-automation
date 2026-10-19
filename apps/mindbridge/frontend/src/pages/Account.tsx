import { useCallback, useEffect, useState, type JSX } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../components/Button'
import { ApiError } from '../api/client'
import { fetchProfile, updateProfile } from '../api/profile'
import type { Profile } from '../types/api'

const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(100),
  dateOfBirth: z.string().trim().optional(),
  region: z.string().trim().max(80).optional(),
  subscriptionTier: z.union([z.literal(''), z.enum(['free', 'pro'])]).optional()
})

type FormValues = z.infer<typeof formSchema>

function toFormValues(profile: Profile): FormValues {
  return {
    name: profile.name,
    dateOfBirth: profile.dateOfBirth ?? '',
    region: profile.region ?? '',
    subscriptionTier: profile.subscriptionTier ?? ''
  }
}

export default function Account(): JSX.Element {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', dateOfBirth: '', region: '', subscriptionTier: '' }
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProfile()
      setProfile(data)
      reset(toFormValues(data))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your profile.')
    } finally {
      setLoading(false)
    }
  }, [reset])

  useEffect(() => {
    void load()
  }, [load])

  async function onSubmit(values: FormValues): Promise<void> {
    setSaved(false)
    setError(null)
    try {
      const tier = values.subscriptionTier === '' ? null : values.subscriptionTier
      const updated = await updateProfile({
        name: values.name.trim(),
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.trim() : null,
        region: values.region ? values.region.trim() : null,
        subscriptionTier: tier ?? null
      })
      setProfile(updated)
      reset(toFormValues(updated))
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile.')
    }
  }

  return (
    <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 bg-clip-text text-transparent">
          Account
        </h1>
        <p className="mt-2 text-slate-500">Keep your profile up to date.</p>
      </header>

      {loading && (
        <div
          role="status"
          aria-label="Loading profile"
          className="mt-8 h-48 rounded-2xl bg-white shadow-sm animate-pulse"
        />
      )}

      {!loading && error && !profile && (
        <div
          role="alert"
          className="mt-8 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700"
        >
          {error}
        </div>
      )}

      {!loading && profile && (
        <form
          noValidate
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="mt-8 space-y-5 bg-white rounded-2xl shadow-md p-6 sm:p-8"
          aria-label="Account form"
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{profile.email}</p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              data-testid="account-name"
              {...register('name')}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'name-error' : undefined}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
            {errors.name && (
              <p id="name-error" role="alert" className="mt-1 text-sm text-rose-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="dob" className="block text-sm font-medium text-slate-700">
              Date of birth
            </label>
            <input
              id="dob"
              type="date"
              data-testid="account-dob"
              {...register('dateOfBirth')}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="region" className="block text-sm font-medium text-slate-700">
              Region
            </label>
            <input
              id="region"
              type="text"
              data-testid="account-region"
              {...register('region')}
              placeholder="e.g. EMEA, NA, APAC"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="tier" className="block text-sm font-medium text-slate-700">
              Subscription tier
            </label>
            <select
              id="tier"
              data-testid="account-tier"
              {...register('subscriptionTier')}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none bg-white"
            >
              <option value="">— Not set —</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            >
              {error}
            </div>
          )}

          {saved && (
            <div
              role="status"
              data-testid="account-save-success"
              className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              Profile saved successfully.
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="account-save-btn"
            className="w-full justify-center bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus-visible:outline-emerald-600"
          >
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      )}
    </section>
  )
}
