import type { User } from '../../domain/entities'
import type { RoleCode } from '../../domain/enums'
import type { DemoRole, DemoUser } from '../../demo'
import { demoUsers } from '../../demo'
import type { AuthRecord } from './repositories/InMemoryAuthRepository'

/**
 * Mock credentials for the demo seed data.
 * This module exists purely in the frontend and is trivially replaceable by a
 * production auth API; it never hardcodes credentials inside a React component.
 */
export const DEMO_PASSWORD = 'KiaGostar@1403'

const demoRoleToRole: Readonly<Record<DemoRole, RoleCode>> = {
  CEO: 'MAIN_MANAGER',
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
  SECRETARY: 'SECRETARY',
  EMPLOYEE: 'EMPLOYEE',
}

const toAuthUser = (user: DemoUser, createdAt: string): User => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  mobile: user.phone ?? '',
  username: user.email.toLowerCase(),
  status: user.status,
  createdAt: user.joinedAt ?? createdAt,
})

/** One auth record per demo identity; no identities are duplicated or invented. */
export const demoAuthRecords: readonly AuthRecord[] = demoUsers.map((user) => {
  const authUser = toAuthUser(user, new Date().toISOString())
  return {
    user: authUser,
    password: DEMO_PASSWORD,
    roles: [demoRoleToRole[user.role]],
    capabilities: [],
    departmentIds: user.departmentId ? [user.departmentId] : [],
  }
})