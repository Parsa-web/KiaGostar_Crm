import { AppError } from '../errors'
import { can, type CapabilityPrincipal } from './can'
import type { CapabilityCode } from './permissions'
import { isWithinScope, type ResourceScope, type ScopedPrincipal } from './scope'

export type AuthorizedPrincipal = CapabilityPrincipal & ScopedPrincipal

export const authorize = (principal: AuthorizedPrincipal | null | undefined, capability: CapabilityCode | string, resource?: ResourceScope): void => {
  if (!principal) throw new AppError('AUTH_ERROR', 'ورود به سامانه الزامی است.')
  if (!can(principal, capability)) throw new AppError('PERMISSION_ERROR', 'مجوز انجام این عملیات را ندارید.')
  if (resource && !isWithinScope(principal, resource)) throw new AppError('ACCESS_DENIED', 'این داده خارج از محدوده سازمانی شماست.')
}
