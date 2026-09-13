import type { ReactNode } from 'react'
import type { RoleCode } from '../domain/enums'
import { can } from './can'
import type { CapabilityCode } from './permissions'
import { isWithinScope, type ResourceScope } from './scope'
import type { AuthContextValue } from '../features/auth/types'

interface GuardProps { auth: AuthContextValue; children: ReactNode; fallback?: ReactNode }

export const ProtectedRoute = ({ auth, children, fallback = null }: GuardProps) =>
  auth.isAuthenticated ? children : fallback

export const CapabilityRoute = ({ auth, capability, children, fallback = null }: GuardProps & { capability: CapabilityCode | string }) =>
  can(auth, capability) ? children : fallback

export const RoleRoute = ({ auth, role, capability, children, fallback = null }: GuardProps & { role: RoleCode; capability: CapabilityCode | string }) =>
  auth.roles.includes(role) && can(auth, capability) ? children : fallback

export const ScopeRoute = ({ auth, resource, capability, children, fallback = null }: GuardProps & { resource: ResourceScope; capability: CapabilityCode | string }) =>
  can(auth, capability) && isWithinScope(auth, resource) ? children : fallback
