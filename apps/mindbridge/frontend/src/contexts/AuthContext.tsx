import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode
} from 'react'
import {
  fetchMe,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type LoginInput,
  type RegisterInput
} from '../api/auth'
import type { User } from '../types/api'

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: User }

interface AuthContextValue {
  state: AuthState
  login: (input: LoginInput) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const refresh = useCallback(async () => {
    try {
      const user = await fetchMe()
      setState(user ? { status: 'authenticated', user } : { status: 'anonymous' })
    } catch {
      setState({ status: 'anonymous' })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (input: LoginInput): Promise<User> => {
    const user = await loginRequest(input)
    setState({ status: 'authenticated', user })
    return user
  }, [])

  const register = useCallback(async (input: RegisterInput): Promise<User> => {
    const user = await registerRequest(input)
    setState({ status: 'authenticated', user })
    return user
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest()
    } finally {
      setState({ status: 'anonymous' })
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ state, login, register, logout, refresh }),
    [state, login, register, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
