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
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from '../api/client'
import type { Cart, CartResponse } from '../types/api'

const EMPTY_CART: Cart = { items: [], itemCount: 0, subtotal: 0, total: 0 }

interface CartContextValue {
  cart: Cart
  loading: boolean
  error: string | null
  addItem: (courseId: string, quantity?: number) => Promise<void>
  updateQty: (courseId: string, quantity: number) => Promise<void>
  removeItem: (courseId: string) => Promise<void>
  clear: () => void
  refresh: () => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }): JSX.Element {
  const [cart, setCart] = useState<Cart>(EMPTY_CART)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<CartResponse>('/api/cart')
      setCart(data.cart ?? EMPTY_CART)
      setError(null)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Cart unavailable'
      setError(message)
      setCart(EMPTY_CART)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addItem = useCallback(
    async (courseId: string, quantity = 1) => {
      await apiPost<CartResponse>('/api/cart/items', { courseId, quantity })
      await refresh()
    },
    [refresh]
  )

  const updateQty = useCallback(
    async (courseId: string, quantity: number) => {
      await apiPatch<CartResponse>(`/api/cart/items/${courseId}`, { quantity })
      await refresh()
    },
    [refresh]
  )

  const removeItem = useCallback(
    async (courseId: string) => {
      await apiDelete<CartResponse>(`/api/cart/items/${courseId}`)
      await refresh()
    },
    [refresh]
  )

  const clear = useCallback(() => {
    setCart(EMPTY_CART)
  }, [])

  const value = useMemo<CartContextValue>(
    () => ({ cart, loading, error, addItem, updateQty, removeItem, clear, refresh }),
    [cart, loading, error, addItem, updateQty, removeItem, clear, refresh]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return ctx
}
