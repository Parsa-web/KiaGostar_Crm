import type { RoleCode } from '../../../domain/enums'
import { AppError } from '../../../errors'
import type { RoleAssignmentRepository } from '../../auth/repositories'
import { authorize, type AuthorizedPrincipal } from '../../../security'
import { Capabilities } from '../../../security/permissions'

export class UserRoleService {
  private readonly roles: RoleAssignmentRepository
  constructor(roles: RoleAssignmentRepository) { this.roles = roles }
  async assignRole(actor: AuthorizedPrincipal, userId: string, role: RoleCode) { this.assert(actor); await this.roles.grantRole(userId, role) }
  async removeRole(actor: AuthorizedPrincipal, userId: string, role: RoleCode) { this.assert(actor); await this.roles.removeRole(userId, role) }
  private assert(actor: AuthorizedPrincipal) { authorize(actor, Capabilities.ROLE_MANAGE); if (!actor.roles.includes('MAIN_MANAGER')) throw new AppError('PERMISSION_ERROR', 'تخصیص نقش فقط در اختیار مدیر اصلی است.') }
}
