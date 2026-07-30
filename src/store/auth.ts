import { create } from 'zustand'

interface User {
  id: number
  email: string
  name: string
  phone: string
  role: 'employee' | 'admin' | 'grass_root_auditor' | 'union_committee_auditor'
  union_member?: boolean
  mutual_aid_member?: boolean
  is_retired?: boolean
  modules?: string[]
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

const getUserFromStorage = (): User | null => {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      return JSON.parse(userStr)
    }
  } catch {
    localStorage.removeItem('user')
  }
  return null
}

export const useAuthStore = create<AuthState>((set) => ({
  user: getUserFromStorage(),
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  login: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
