import type { RoleCode, UserStatus } from '../enums'

export interface User { id: string; firstName: string; lastName: string; mobile: string; username: string; status: UserStatus; createdAt: string }
export interface Department { id: string; name: string; description?: string; status: UserStatus }
export interface UserDepartment { id: string; userId: string; departmentId: string; isPrimary: boolean }
export interface Position { id: string; name: string; description?: string; status: UserStatus }
export interface Role { id: string; name: string; code: RoleCode }
export interface Capability { id: string; name: string; code: string; description?: string }
export interface UserRole { id: string; userId: string; roleId: string }
export interface UserCapability { id: string; userId: string; capabilityId: string; enabled: boolean }
