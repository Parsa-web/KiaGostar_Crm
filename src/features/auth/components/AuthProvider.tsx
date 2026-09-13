import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { RoleCode } from '../../../domain/enums'
import type { AuthService } from '../services'
import type { AuthContextValue, Credentials } from '../types'
import type { AuthState } from '../stores'
import { initialAuthState } from '../stores'
import { AuthContext } from './AuthContext'

export const AuthProvider = ({ service, children }: { service: AuthService; children: ReactNode }) => {
  const [state, setState] = useState<AuthState>(initialAuthState)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([service.getSession(), service.getCurrentUser()]).then(([session, currentUser]) => {
      if (active) setState({ session, currentUser, loading: false })
    }).catch((error: unknown) => { if (active) { setSessionExpired(Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'SESSION_EXPIRED')); setAuthError(error instanceof Error ? error.message : null); setState({ ...initialAuthState, loading: false }) } })
    return () => { active = false }
  }, [service])

  const login = useCallback(async (credentials: Credentials) => {
    setAuthError(null)
    setSessionExpired(false)
    const { user, session } = await service.login(credentials)
    setState({ currentUser: user, session, loading: false })
  }, [service])

  const logout = useCallback(async () => {
    await service.logout()
    setSessionExpired(false)
    setAuthError(null)
    setState({ currentUser: null, session: null, loading: false })
  }, [service])

  const value = useMemo<AuthContextValue>(() => ({
    currentUser: state.currentUser,
    userId: state.session?.userId ?? '',
    roles: (state.session?.roles ?? []) as RoleCode[],
    capabilities: state.session?.capabilities ?? [],
    departmentIds: state.session?.departmentIds ?? [],
    isAuthenticated: !state.loading && state.currentUser !== null && state.session !== null,
    isLoading: state.loading,
    sessionExpired,
    authError,
    login,
    logout,
  }), [authError, login, logout, sessionExpired, state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
