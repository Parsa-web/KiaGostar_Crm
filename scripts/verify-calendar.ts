import { roleCapabilities } from '../src/features/auth/utils/roleCapabilities'
import { projectSystemCalendar } from '../src/features/calendar'
import { demoChangeMeetingStatus, demoCreateMeeting, demoGetSnapshot, demoRemoveMeeting, demoUpdateMeeting, rehydrateDemoState } from '../src/demo'
import { demoEmployees } from '../src/demo/demoOrganization'
import { toLocalIso } from '../src/core/utils/dateUtils'
import type { AuthorizedPrincipal } from '../src/security'

const assert = (condition: unknown, message: string): asserts condition => { if (!condition) throw new Error(message) }
const employee = demoEmployees.find((user) => user.status === 'ACTIVE')
assert(employee, 'Active employee seed is required')

const executive: AuthorizedPrincipal = { userId: 'usr-ceo', roles: ['MAIN_MANAGER'], capabilities: roleCapabilities.MAIN_MANAGER, departmentIds: ['dep-exec'] }
const employeePrincipal: AuthorizedPrincipal = { userId: employee.id, roles: ['EMPLOYEE'], capabilities: roleCapabilities.EMPLOYEE, departmentIds: [employee.departmentId] }
const base = new Date(); base.setDate(base.getDate() + 3); base.setHours(9, 0, 0, 0)
const moved = new Date(base); moved.setDate(moved.getDate() + 2); moved.setHours(14, 30, 0, 0)

const meeting = demoCreateMeeting(executive.userId, {
  title: 'آزمون اتصال تقویم',
  startTime: toLocalIso(base),
  endTime: toLocalIso(new Date(base.getTime() + 60 * 60_000)),
  participantIds: [employee.id],
  location: 'اتاق تست',
})
assert(meeting, 'Meeting creation failed')

let snapshot = demoGetSnapshot()
const employeeEvents = projectSystemCalendar(snapshot, employeePrincipal)
let event = employeeEvents.find((item) => item.id === `meeting:${meeting.id}`)
assert(event?.date === toLocalIso(base), 'Created meeting did not appear at the source time')

const updated = demoUpdateMeeting(meeting.id, {
  title: 'آزمون جابه‌جایی تقویم',
  startTime: toLocalIso(moved),
  endTime: toLocalIso(new Date(moved.getTime() + 90 * 60_000)),
})
assert(updated, 'Meeting update failed')
snapshot = demoGetSnapshot()
event = projectSystemCalendar(snapshot, employeePrincipal).find((item) => item.id === `meeting:${meeting.id}`)
assert(event?.title === 'آزمون جابه‌جایی تقویم' && event.date === toLocalIso(moved), 'Calendar did not follow meeting title/date/time update')
assert(event.endDate === toLocalIso(new Date(moved.getTime() + 90 * 60_000)), 'Calendar end time did not update')

const restored = rehydrateDemoState(JSON.stringify(snapshot))
const restoredEvent = projectSystemCalendar(restored, employeePrincipal).find((item) => item.id === `meeting:${meeting.id}`)
assert(restoredEvent?.date === toLocalIso(moved), 'Persisted store did not rehydrate into calendar projection')

assert(demoChangeMeetingStatus(meeting.id, 'CANCELLED'), 'Meeting cancellation failed')
event = projectSystemCalendar(demoGetSnapshot(), employeePrincipal).find((item) => item.id === `meeting:${meeting.id}`)
assert(event?.status === 'CANCELLED' && event.tone === 'danger', 'Cancelled status did not reach calendar')

assert(demoRemoveMeeting(meeting.id), 'Meeting deletion failed')
assert(!projectSystemCalendar(demoGetSnapshot(), employeePrincipal).some((item) => item.id === `meeting:${meeting.id}`), 'Deleted meeting remained in calendar')

const ownTaskIds = new Set(demoGetSnapshot().tasks.filter((task) => task.assigneeId === employee.id).map((task) => task.id))
const employeeTaskEvents = projectSystemCalendar(demoGetSnapshot(), employeePrincipal).filter((item) => item.kind === 'TASK')
assert(employeeTaskEvents.every((item) => ownTaskIds.has(item.entityId)), 'Employee calendar exposed another user task')

console.log('Calendar verification passed: shared-store create, update, move, cancel, delete, scope and rehydration.')
