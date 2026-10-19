import type { ButtonHTMLAttributes, JSX } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

const BASE_CLASSES =
  'inline-flex items-center px-4 py-2 rounded-md text-white transition-colors ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'

const VARIANT_CLASSES = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:outline-indigo-600',
  secondary: 'bg-slate-600 hover:bg-slate-700 focus-visible:outline-slate-600'
} as const

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonProps): JSX.Element {
  const merged = [BASE_CLASSES, VARIANT_CLASSES[variant], className].filter(Boolean).join(' ')
  return <button {...props} type={type} className={merged} />
}
