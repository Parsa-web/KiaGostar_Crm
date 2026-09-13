import type { User } from '../../domain/entities'
import type { RoleCode } from '../../domain/enums'
import type { AuthorizedPrincipal } from '../../security/accessControl'

export interface AuthSession {
  userId: string
  roles: RoleCode[]
  capabilities: string[]
  departmentIds: string[]
  createdAt: string
  expiresAt?: string
}

export interface Credentials { username: string; password: string }

export interface AuthContextValue extends AuthorizedPrincipal {
  currentUser: User | null
  isAuthenticated: boolean
  isLoading: boolean
  sessionExpired: boolean
  authError: string | null
  login(credentials: Credentials): Promise<void>
  logout(): Promise<void>
}
