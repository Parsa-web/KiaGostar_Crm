import type { RoleCode } from '../domain/enums'

export const AccessScope = { GLOBAL: 'GLOBAL', DEPARTMENT: 'DEPARTMENT', SELF: 'SELF' } as const
export type AccessScope = (typeof AccessScope)[keyof typeof AccessScope]

export interface ScopedPrincipal {
  userId: string
  roles: readonly RoleCode[]
  departmentIds: readonly string[]
}

export interface ResourceScope {
  ownerId?: string
  departmentId?: string
}

export const resolveScope = (roles: readonly RoleCode[]): AccessScope => {
  if (roles.includes('MAIN_MANAGER')) return AccessScope.GLOBAL
  if (roles.includes('DEPARTMENT_MANAGER')) return AccessScope.DEPARTMENT
  return AccessScope.SELF
}

export const isWithinScope = (principal: ScopedPrincipal, resource: ResourceScope): boolean => {
  const scope = resolveScope(principal.roles)
  if (scope === AccessScope.GLOBAL) return true
  if (scope === AccessScope.DEPARTMENT) {
    return resource.departmentId !== undefined && principal.departmentIds.includes(resource.departmentId)
  }
  return resource.ownerId === principal.userId
}
