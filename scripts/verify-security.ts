import { InMemoryAuthRepository } from '../src/features/auth/repositories/InMemoryAuthRepository'
import { InMemorySessionRepository } from '../src/features/auth/repositories/SessionRepository'
import { AuthService } from '../src/features/auth/services/authService'
import { AppError } from '../src/errors/AppError'
import { can } from '../src/security/can'
import { Capabilities } from '../src/security/permissions'
import { isWithinScope } from '../src/security/scope'

const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message) }
const now = new Date().toISOString()
const repository = new InMemoryAuthRepository([
  { user: { id: 'manager', firstName: 'مدیر', lastName: 'اصلی', mobile: '1', username: 'manager', status: 'ACTIVE', createdAt: now }, password: 'valid', roles: ['MAIN_MANAGER'], capabilities: [], departmentIds: [] },
  { user: { id: 'secretary', firstName: 'دبیر', lastName: 'جلسه', mobile: '2', username: 'secretary', status: 'ACTIVE', createdAt: now }, password: 'valid', roles: ['SECRETARY'], capabilities: [Capabilities.MEETING_CREATE], departmentIds: ['dep-1'] },
])
const sessions = new InMemorySessionRepository()
const service = new AuthService(repository, sessions)

const manager = await service.login({ username: 'manager', password: 'valid' })
assert(manager.session.roles.includes('MAIN_MANAGER'), 'Main manager role was not loaded.')
assert(can(manager.session, Capabilities.USER_MANAGE), 'Main manager baseline capability is missing.')
assert(!can(manager.session, Capabilities.TASK_CREATE), 'Main manager must not create operational tasks.')
assert(isWithinScope({ ...manager.session, roles: manager.session.roles }, { departmentId: 'any' }), 'Main manager must have global scope.')
await service.logout()
assert(!(await service.isAuthenticated()), 'Logout did not clear the session.')

let invalidRejected = false
try { await service.login({ username: 'manager', password: 'invalid' }) } catch (error) { invalidRejected = error instanceof AppError && error.code === 'AUTH_ERROR' }
assert(invalidRejected, 'Invalid credentials were not rejected.')

const secretary = await service.login({ username: 'secretary', password: 'valid' })
assert(can(secretary.session, Capabilities.MINUTES_CREATE), 'Secretary baseline capability is missing.')
assert(can(secretary.session, Capabilities.MEETING_CREATE), 'Explicit capability did not extend secretary access.')
assert(!isWithinScope({ ...secretary.session, roles: secretary.session.roles }, { ownerId: 'someone-else' }), 'Self scope allowed another user record.')

console.info('Authentication, capability, role baseline, logout, and scope checks passed.')
