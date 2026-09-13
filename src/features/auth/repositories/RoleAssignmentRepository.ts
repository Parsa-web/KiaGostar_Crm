import type { RoleCode } from '../../../domain/enums'
export interface RoleAssignmentRepository {
  grantRole(userId: string, role: RoleCode): Promise<void>
  removeRole(userId: string, role: RoleCode): Promise<void>
}
