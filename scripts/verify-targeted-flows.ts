import { roleCapabilities } from '../src/features/auth/utils/roleCapabilities'
import { projectSystemCalendar } from '../src/features/calendar'
import {
  demoAddTaskAttachments, demoChangeMeetingStatus, demoCreateMeeting, demoCreateReport, demoCreateResolution, demoCreateTask,
  demoGetSnapshot, demoReportsForViewer, demoReviewReport, demoScheduleMeeting,
  demoSyncSchedule, demoTasksForViewer, meetingStatusAt, rehydrateDemoState,
} from '../src/demo'
import { demoEmployees, demoManagers, demoSecretaries } from '../src/demo/demoOrganization'
import { toLocalIso } from '../src/core/utils/dateUtils'
import type { AuthorizedPrincipal } from '../src/security'

const assert = (condition: unknown, message: string): asserts condition => { if (!condition) throw new Error(message) }
const employee = demoEmployees.find((item) => item.status === 'ACTIVE')
assert(employee, 'An active employee is required')
const manager = demoManagers.find((item) => item.departmentId === employee.departmentId)
const otherManager = demoManagers.find((item) => item.departmentId !== employee.departmentId)
const otherEmployee = demoEmployees.find((item) => item.status === 'ACTIVE' && item.departmentId !== employee.departmentId)
const secretary = demoSecretaries[0]
assert(manager && otherManager && otherEmployee && secretary, 'Manager, employee and secretary seeds are required')

const employeePrincipal: AuthorizedPrincipal = { userId: employee.id, roles: ['EMPLOYEE'], capabilities: roleCapabilities.EMPLOYEE, departmentIds: [employee.departmentId] }
const managerPrincipal: AuthorizedPrincipal = { userId: manager.id, roles: ['DEPARTMENT_MANAGER'], capabilities: roleCapabilities.DEPARTMENT_MANAGER, departmentIds: [manager.departmentId] }
const otherManagerPrincipal: AuthorizedPrincipal = { userId: otherManager.id, roles: ['DEPARTMENT_MANAGER'], capabilities: roleCapabilities.DEPARTMENT_MANAGER, departmentIds: [otherManager.departmentId] }
const secretaryPrincipal: AuthorizedPrincipal = { userId: secretary.id, roles: ['SECRETARY'], capabilities: roleCapabilities.SECRETARY, departmentIds: [secretary.departmentId] }
const executive: AuthorizedPrincipal = { userId: 'usr-ceo', roles: ['MAIN_MANAGER'], capabilities: roleCapabilities.MAIN_MANAGER, departmentIds: ['dep-exec'] }

const employeeReport = demoCreateReport(employeePrincipal, employee.id, { title: 'گزارش مسیر کارمند', summary: 'گزارش معتبر برای آزمون کامل گردش تأیید.', department: otherManager.departmentId })
assert(employeeReport && employeeReport.departmentId === employee.departmentId && employeeReport.stage === 'DEPARTMENT', 'Employee report did not use the author unit/department stage')
assert(demoGetSnapshot().reports.some((item) => item.id === employeeReport.id), `Employee report was not committed (${employeeReport.id})`)
assert(!demoReportsForViewer(demoGetSnapshot().reports, executive).some((item) => item.id === employeeReport.id), 'CEO saw employee report before manager approval')
const managerViewer = { userId: manager.id, roles: managerPrincipal.roles, departmentId: manager.departmentId }
const otherManagerViewer = { userId: otherManager.id, roles: otherManagerPrincipal.roles, departmentId: otherManager.departmentId }
const managerVisibleAfterEmployee = demoReportsForViewer(demoGetSnapshot().reports, managerViewer)
assert(managerVisibleAfterEmployee.some((item) => item.id === employeeReport.id), 'Own unit manager did not receive employee report')
assert(!demoReportsForViewer(demoGetSnapshot().reports, otherManagerViewer).some((item) => item.id === employeeReport.id), 'Other unit manager saw employee report')
assert(!demoReviewReport(otherManagerPrincipal, employeeReport.id, true, undefined, otherManager.id), 'Other unit manager approved the report')
assert(demoReviewReport(managerPrincipal, employeeReport.id, true, undefined, manager.id), 'Own unit manager could not approve report')
assert(demoReportsForViewer(demoGetSnapshot().reports, executive).some((item) => item.id === employeeReport.id), 'Approved employee report did not reach CEO')

const managerReport = demoCreateReport(managerPrincipal, manager.id, { title: 'گزارش مستقیم مدیر واحد', summary: 'گزارش معتبر مدیر واحد برای مدیرعامل.' })
assert(managerReport?.stage === 'EXECUTIVE' && demoReportsForViewer(demoGetSnapshot().reports, executive).some((item) => item.id === managerReport.id), 'Manager report did not go directly to CEO')
const secretaryReport = demoCreateReport(secretaryPrincipal, secretary.id, { title: 'گزارش منشی', summary: 'گزارش معتبر ثبت شده توسط منشی.' })
assert(secretaryReport && demoReportsForViewer(demoGetSnapshot().reports, secretaryPrincipal).every((item) => item.authorId === secretary.id), 'Secretary could see another author report')

const futureStart = new Date(Date.now() + 3_600_000)
const futureEnd = new Date(futureStart.getTime() + 3_600_000)
const draft = demoCreateMeeting(executive.userId, { title: 'پیش‌نویس قابل زمان‌بندی', startTime: toLocalIso(futureStart), endTime: toLocalIso(futureEnd), participantIds: [employee.id] })
assert(draft && demoChangeMeetingStatus(draft.id, 'DRAFT'), 'Draft meeting setup failed')
const movedStart = new Date(futureStart.getTime() + 86_400_000)
const movedEnd = new Date(movedStart.getTime() + 5_400_000)
const scheduled = demoScheduleMeeting(draft.id, { startTime: toLocalIso(movedStart), endTime: toLocalIso(movedEnd) })
assert(scheduled && scheduled.status === 'SCHEDULED', 'Draft was not promoted to scheduled')
assert(!demoCreateResolution(secretaryPrincipal, scheduled.id, secretary.id, { title: 'مصوبه زودهنگام', assignees: [employee.id], dueDate: toLocalIso(movedEnd) }), 'Resolution was accepted before the real meeting start')
const calendarMeeting = projectSystemCalendar(demoGetSnapshot(), employeePrincipal).find((item) => item.entityId === draft.id)
assert(calendarMeeting?.date === toLocalIso(movedStart) && calendarMeeting.endDate === toLocalIso(movedEnd), 'Scheduled draft did not reach calendar with canonical time')
const canonicalStart = new Date(scheduled.startTime)
const canonicalEnd = new Date(scheduled.endTime)
assert(meetingStatusAt(scheduled, new Date(canonicalStart.getTime() - 1)) === 'SCHEDULED', 'Meeting started before its real start')
assert(meetingStatusAt(scheduled, canonicalStart) === 'IN_PROGRESS', 'Meeting did not start at exact start time')
assert(meetingStatusAt(scheduled, canonicalEnd) === 'COMPLETED', 'Meeting did not complete at exact end time')

const liveStart = new Date(Date.now() - 60_000)
const liveEnd = new Date(Date.now() + 60_000)
const live = demoCreateMeeting(secretary.id, { title: 'جلسه تبدیل مصوبه', startTime: toLocalIso(liveStart), endTime: toLocalIso(liveEnd), participantIds: [employee.id, secretary.id] })
assert(live, 'Live meeting creation failed')
demoSyncSchedule()
const createdResolutions = demoCreateResolution(secretaryPrincipal, live.id, secretary.id, { title: 'اقدام پس از جلسه', description: 'وظیفه فقط پس از پایان ساخته شود.', assignees: [employee.id], dueDate: toLocalIso(new Date(Date.now() + 86_400_000)) })
assert(createdResolutions?.length === 1 && !createdResolutions[0].taskId, 'Resolution created a task before meeting end')
const managerResolution = demoCreateResolution(executive, live.id, executive.userId, { title: 'مصوبه مدیر در جلسه', description: 'مدیر نیز باید در زمان واقعی جلسه قادر به ثبت باشد.', assignees: [employee.id], dueDate: toLocalIso(new Date(Date.now() + 172_800_000)) })
assert(managerResolution?.length === 1 && !managerResolution[0].taskId, 'Manager could not register a live resolution')
assert(!demoGetSnapshot().tasks.some((item) => item.id === `tsk-${createdResolutions[0].id}`), 'Premature resolution task exists')
demoSyncSchedule(new Date(liveEnd.getTime() + 1))
const finalizedResolution = demoGetSnapshot().resolutions.find((item) => item.id === createdResolutions[0].id)
assert(finalizedResolution?.taskId, 'Resolution was not converted after meeting end')
assert(demoGetSnapshot().tasks.some((item) => item.id === finalizedResolution.taskId && item.assigneeId === employee.id && item.meetingId === live.id), 'Converted task is not linked to meeting/assignee')

const employeeTask = demoGetSnapshot().tasks.find((item) => item.id === finalizedResolution.taskId)!
const managerTaskViewer = { userId: manager.id, roles: managerPrincipal.roles, departmentId: manager.departmentId }
assert(!demoCreateTask(managerPrincipal, manager.id, {
  title: 'وظیفه شخصی مدیر واحد', description: 'مدیر نباید مستقیم برای خودش وظیفه بسازد.', assignees: [manager.id],
  department: manager.departmentId, deadline: toLocalIso(new Date(Date.now() + 259_200_000)),
}), 'Unit manager created a standalone task for self')
const employeeDirectTask = demoCreateTask(managerPrincipal, manager.id, {
  title: 'وظیفه کارمند واحد', description: 'وظیفه مستقیم از بخش کارکنان.', assignees: [employee.id],
  department: manager.departmentId, deadline: toLocalIso(new Date(Date.now() + 259_200_000)),
})
assert(employeeDirectTask && employeeDirectTask.assigneeId === employee.id && !employeeDirectTask.meetingId, 'Unit manager could not create a task for an own-unit employee')
assert(!demoCreateTask(managerPrincipal, manager.id, {
  title: 'وظیفه خارج از واحد', description: 'نباید ثبت شود.', assignees: [otherEmployee.id],
  department: manager.departmentId, deadline: toLocalIso(new Date(Date.now() + 259_200_000)),
}), 'Unit manager assigned a task outside the own unit')
assert(demoTasksForViewer(demoGetSnapshot().tasks, managerTaskViewer).some((item) => item.id === employeeTask.id), 'Unit manager cannot see own employee task')
assert(demoTasksForViewer(demoGetSnapshot().tasks, managerTaskViewer).every((task) => task.assigneeId === manager.id || (task.departmentId === manager.departmentId && task.assigneeId.startsWith('usr-emp-'))), 'Unit manager task scope leaked another unit or unrelated assignee')
const attachment = demoAddTaskAttachments(employeePrincipal, employeeTask.id, employee.id, [{ name: 'evidence.txt', mimeType: 'text/plain', sizeBytes: 12, dataUrl: 'data:text/plain;base64,dGVzdA==' }])
assert(attachment && attachment.length === 1, 'Assignee could not add a task attachment')
assert(!demoAddTaskAttachments(otherManagerPrincipal, employeeTask.id, otherManager.id, [{ name: 'forbidden.txt', mimeType: 'text/plain', sizeBytes: 4 }]), 'Other unit manager added an attachment')
const restoredTaskState = rehydrateDemoState(JSON.stringify(demoGetSnapshot()))
assert(restoredTaskState.files.some((file) => file.id === attachment[0].id && file.entityId === employeeTask.id && file.dataUrl), 'Task attachment did not survive store rehydration')

console.log('Targeted flow verification passed: scoped reports/tasks, task attachments, draft scheduling, real-time lifecycle and deferred resolution tasks.')
