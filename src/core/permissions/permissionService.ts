import type { AuthorizedPrincipal } from '../../security'
import { authorize, can } from '../../security'

export const permissionService = {
  can: (user: AuthorizedPrincipal | null | undefined, permission: string) => Boolean(user && can(user, permission)),
  canAny: (user: AuthorizedPrincipal | null | undefined, permissions: readonly string[]) => permissions.some((permission) => permissionService.can(user, permission)),
  canAll: (user: AuthorizedPrincipal | null | undefined, permissions: readonly string[]) => permissions.every((permission) => permissionService.can(user, permission)),
  checkPermission: (user: AuthorizedPrincipal | null | undefined, permission: string) => authorize(user, permission),
}
