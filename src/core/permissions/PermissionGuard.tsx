import type { ReactNode } from 'react'
import type { AuthorizedPrincipal } from '../../security'
import { permissionService } from './permissionService'

export function PermissionGuard({ user, permission, fallback = null, children }: { user: AuthorizedPrincipal | null; permission: string; fallback?: ReactNode; children: ReactNode }) {
  return permissionService.can(user, permission) ? children : fallback
}
