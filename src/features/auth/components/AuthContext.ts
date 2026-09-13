import { createContext } from 'react'
import type { AuthContextValue } from '../types'

const unavailable = async () => { throw new Error('AuthProvider is not mounted.') }
export const AuthContext = createContext<AuthContextValue>({
  currentUser: null, userId: '', roles: [], capabilities: [], departmentIds: [], isAuthenticated: false, isLoading: true, sessionExpired: false, authError: null, login: unavailable, logout: unavailable,
})
