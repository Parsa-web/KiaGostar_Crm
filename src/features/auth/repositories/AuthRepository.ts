import type { User } from '../../../domain/entities'
import type { RoleCode } from '../../../domain/enums'
import type { Credentials } from '../types'

export interface AuthRepository {
  findUserByCredentials(credentials: Credentials): Promise<User | null>
  findUserById(userId: string): Promise<User | null>
  getUserRoles(userId: string): Promise<readonly RoleCode[]>
  getUserCapabilities(userId: string): Promise<readonly string[]>
  getUserDepartmentIds(userId: string): Promise<readonly string[]>
}
