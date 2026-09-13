import { AuthService } from '../src/features/auth/services/authService'
import { InMemoryAuthRepository } from '../src/features/auth/repositories/InMemoryAuthRepository'
import { PersistentSessionRepository } from '../src/features/auth/repositories/PersistentSessionRepository'
import { DEMO_PASSWORD, demoAuthRecords } from '../src/features/auth/demoAuthSeed'
import type { RoleCode } from '../src/domain/enums'
import { demoUsers, type DemoRole, type DemoUser } from '../src/demo'
import { resolveDashboardTarget } from '../src/app/routes/dashboardTargets'
import { findMeeting, meetingViews } from '../src/demo'
import { taskViews } from '../src/demo'
import { reportViews } from '../src/demo'
import { requestViews } from '../src/demo'

const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message) }
const service = new AuthService(new InMemoryAuthRepository(demoAuthRecords), new PersistentSessionRepository())

const activeByIdentity = (role: DemoRole): DemoUser | undefined =>
  demoUsers.find((user) => user.role === role && user.status === 'ACTIVE')

const roles = ['CEO', 'DEPARTMENT_MANAGER', 'SECRETARY', 'EMPLOYEE'] as const
const expectedRoleCodes: Readonly<Record<typeof roles[number], RoleCode>> = {
  CEO: 'MAIN_MANAGER',
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
  SECRETARY: 'SECRETARY',
  EMPLOYEE: 'EMPLOYEE',
}

for (const role of roles) {
  const demo = activeByIdentity(role)
  assert(Boolean(demo), `Demo data is missing an active ${role} identity`)
  const { user, session } = await service.login({ username: demo!.email.toLowerCase(), password: DEMO_PASSWORD })
  assert(user.id === demo!.id, `${role} login must resolve to the matching demo identity`)
  assert(session.roles.includes(expectedRoleCodes[role]), `${role} session must carry the ${expectedRoleCodes[role]} role`)
  assert(session.capabilities.length > 0, `${role} session must derive baseline capabilities`)
  assert(demo!.departmentId ? session.departmentIds.includes(demo!.departmentId) : true, `${role} session must carry department scope`)
  assert(await service.isAuthenticated(), `${role} session must persist after login`)
  assert((await service.getCurrentUser())?.id === demo!.id, `${role} current user must be restorable from the session`)
  await service.logout()
  assert(!(await service.isAuthenticated()), `${role} logout must clear the session`)
}

let invalidRejected = false
try {
  const demo = activeByIdentity('CEO')!
  await service.login({ username: demo.email.toLowerCase(), password: 'wrong-password' })
} catch { invalidRejected = true }
assert(invalidRejected, 'Invalid credentials must be rejected')

console.info('Mock authentication passed: login, role mapping, capabilities, session persistence and logout for all demo roles.')

const meetingId = meetingViews[0]?.id ?? 'meeting-101'
assert(resolveDashboardTarget('meetings', meetingId) === `/meetings/${meetingId}`, 'Dashboard navigation must resolve id-carrying targets to their detail route')
assert(resolveDashboardTarget('meetings') === '/meetings', 'Dashboard navigation must resolve list targets unchanged')
assert(resolveDashboardTarget('meetings/create') === '/meetings/create', 'Dashboard navigation must preserve action-like targets')
assert(Boolean(findMeeting(meetingId)), 'Demo meeting ids must be resolvable by the detail router')
const detailIdsValid = [taskViews, reportViews, requestViews].every((views) => views[0] !== undefined && views[0].id.length > 0)
assert(detailIdsValid, 'Task, report and request demo records must expose resolvable ids for detail routing')
console.info('Detail route wiring passed: dashboard targets resolve list/detail/create routes and demo records expose resolvable ids.')
