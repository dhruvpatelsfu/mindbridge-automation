import type { JSX } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useDefects } from '../contexts/DefectsContext'

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, Math.max(0, max - 1))}…` : value
}

function AuthControls(): JSX.Element {
  const { state, logout } = useAuth()

  if (state.status === 'loading') {
    return (
      <div
        aria-hidden="true"
        className="h-5 w-24 rounded-md bg-slate-100"
        data-testid="auth-placeholder"
      />
    )
  }

  if (state.status === 'authenticated') {
    return (
      <div className="flex items-center gap-3">
        <span
          className="text-sm font-medium text-slate-800 max-w-[12rem] truncate"
          title={state.user.name}
        >
          {truncate(state.user.name, 20)}
        </span>
        <span className="hidden sm:inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
          {state.user.role}
        </span>
        <button
          type="button"
          onClick={() => void logout()}
          data-testid="nav-logout"
          className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Log out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        to="/login"
        data-testid="nav-login"
        className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
      >
        Log in
      </Link>
      <Link
        to="/register"
        data-testid="nav-register"
        className="text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-3 py-1.5 rounded-md transition-colors"
      >
        Register
      </Link>
    </div>
  )
}

export function Layout(): JSX.Element {
  const { cart } = useCart()
  const { hasDefect } = useDefects()
  const { state } = useAuth()
  const isAuthenticated = state.status === 'authenticated'
  const isAdmin = state.status === 'authenticated' && state.user.role === 'admin'
  const navUnclickable = isAuthenticated && hasDefect('D-RESPONSIVE-400')
  const navClassName = navUnclickable
    ? 'flex items-center gap-6 max-[399px]:pointer-events-none max-[399px]:opacity-30'
    : 'flex items-center gap-6'

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-semibold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent"
          >
            MindBridge
          </Link>

          <nav data-testid="primary-nav" className={navClassName}>
            {isAuthenticated && (
              <Link
                to="/dashboard"
                data-testid="nav-dashboard"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                Dashboard
              </Link>
            )}

            {isAuthenticated && (
              <Link
                to="/practice"
                data-testid="nav-practice"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                Practice
              </Link>
            )}

            <Link
              to="/courses"
              data-testid="nav-catalogue"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              Catalogue
            </Link>

            {isAuthenticated && (
              <Link
                to="/my/learning"
                data-testid="nav-my-learning"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                My learning
              </Link>
            )}

            {isAuthenticated && (
              <Link
                to="/account"
                data-testid="nav-account"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                Account
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin/courses"
                className="text-sm font-medium text-rose-600 hover:text-rose-800 transition-colors"
              >
                Admin
              </Link>
            )}

            <Link
              to="/cart"
              data-testid="nav-cart"
              aria-label={`Cart with ${cart.itemCount} items`}
              className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="w-5 h-5 text-slate-700"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21 8H6" />
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="18" cy="20" r="1.5" />
              </svg>
              {cart.itemCount > 0 && (
                <span
                  data-testid="cart-badge"
                  className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[11px] font-semibold flex items-center justify-center"
                >
                  {cart.itemCount}
                </span>
              )}
            </Link>

            <AuthControls />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-slate-500">
          MindBridge · Learn QA by doing
        </div>
      </footer>
    </div>
  )
}
