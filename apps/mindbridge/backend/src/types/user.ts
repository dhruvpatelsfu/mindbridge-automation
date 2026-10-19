export type UserRole = 'user' | 'admin'

export interface UserRow {
  id: string
  email: string
  password_hash: string
  name: string
  role: UserRole
  is_instructor: number
  created_at: string
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
}

export function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at
  }
}
