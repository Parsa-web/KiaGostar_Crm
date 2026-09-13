import type { RoleCode } from '../../../domain/enums'
import type { AuthorizedPrincipal } from '../../../security/accessControl'
import { authorize } from '../../../security/accessControl'
import { Capabilities } from '../../../security/permissions'
import type { CapabilityAssignmentRepository } from '../repositories/CapabilityAssignmentRepository'
import { assertCapabilityCanBeGranted } from '../utils/capabilityPolicy'

export class PermissionService {
  private readonly assignments: CapabilityAssignmentRepository
  constructor(assignments: CapabilityAssignmentRepository) { this.assignments = assignments }

  async grant(actor: AuthorizedPrincipal, targetUserId: string, targetRoles: readonly RoleCode[], capability: string): Promise<void> {
    authorize(actor, Capabilities.CAPABILITY_MANAGE)
    assertCapabilityCanBeGranted(targetRoles, capability)
    await this.assignments.grant(targetUserId, capability)
  }

  async remove(actor: AuthorizedPrincipal, targetUserId: string, capability: string): Promise<void> {
    authorize(actor, Capabilities.CAPABILITY_MANAGE)
    await this.assignments.remove(targetUserId, capability)
  }
}
