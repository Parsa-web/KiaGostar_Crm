import type { User } from '../../../domain/entities'
import type { RoleCode } from '../../../domain/enums'
import { roleCapabilities } from '../utils/roleCapabilities'
import type { Credentials } from '../types'
import type { AuthRepository } from './AuthRepository'
import type { CapabilityAssignmentRepository } from './CapabilityAssignmentRepository'
import type { RoleAssignmentRepository } from './RoleAssignmentRepository'

export interface AuthRecord { user: User; password: string; roles: RoleCode[]; capabilities: string[]; departmentIds: string[] }

export class InMemoryAuthRepository implements AuthRepository, CapabilityAssignmentRepository, RoleAssignmentRepository {
  private readonly records: readonly AuthRecord[]
  constructor(records: readonly AuthRecord[] = []) { this.records = records }

  async findUserByCredentials(credentials: Credentials) {
    return this.records.find((item) => item.user.username === credentials.username && item.password === credentials.password)?.user ?? null
  }
  async findUserById(userId: string) { return this.records.find((item) => item.user.id === userId)?.user ?? null }
  async getUserRoles(userId: string) { return this.findRecord(userId)?.roles ?? [] }
  async getUserDepartmentIds(userId: string) { return this.findRecord(userId)?.departmentIds ?? [] }
  async getUserCapabilities(userId: string) {
    const record = this.findRecord(userId)
    if (!record) return []
    return [...new Set([...record.roles.flatMap((role) => roleCapabilities[role]), ...record.capabilities])]
  }
  async grant(userId: string, capability: string) { const record = this.requireRecord(userId); if (!record.capabilities.includes(capability)) record.capabilities.push(capability) }
  async remove(userId: string, capability: string) { const record = this.requireRecord(userId); record.capabilities = record.capabilities.filter((item) => item !== capability) }
  async grantRole(userId: string, role: RoleCode) { const record = this.requireRecord(userId); if (!record.roles.includes(role)) record.roles.push(role) }
  async removeRole(userId: string, role: RoleCode) { const record = this.requireRecord(userId); record.roles = record.roles.filter((item) => item !== role) }
  private findRecord(userId: string) { return this.records.find((item) => item.user.id === userId) }
  private requireRecord(userId: string) { const record = this.findRecord(userId); if (!record) throw new Error('User record not found.'); return record }
}
