import { AppError } from '../src/errors/AppError'
import { roleCapabilities } from '../src/features/auth/utils/roleCapabilities'
import { InMemoryDepartmentRepository, InMemoryOrganizationUserRepository, InMemoryPositionRepository, InMemoryUserDepartmentRepository } from '../src/features/organization/repositories'
import { DepartmentService, PositionService, UserDepartmentService } from '../src/features/organization/services'
import { InMemoryDecisionRepository, InMemoryMeetingRepository, InMemoryMinutesRepository } from '../src/features/meetings/repositories'
import { DecisionService, MeetingService, MinutesService } from '../src/features/meetings/services'
import { InMemoryTaskReportRepository, InMemoryTaskRepository } from '../src/features/tasks/repositories'
import { TaskService } from '../src/features/tasks/services'
import { InMemoryDepartmentReportRepository, InMemoryEmployeeReportRepository } from '../src/features/reports/repositories'
import { ReportService } from '../src/features/reports/services'
import { InMemoryRequestRepository } from '../src/features/requests/repositories'
import { RequestService } from '../src/features/requests/services'
import { InMemoryAuditRepository, InMemoryNotificationRepository } from '../src/repositories'
import { FileService, InMemoryFileRepository, InternalActivityService } from '../src/services'
import type { AuthorizedPrincipal } from '../src/security'

const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message) }
const rejects = async (operation: () => Promise<unknown>, code: AppError['code']) => { try { await operation() } catch (error) { if (error instanceof AppError && error.code === code) return; throw error } throw new Error(`Expected ${code}.`) }
const principal = (userId: string, role: keyof typeof roleCapabilities, departmentIds: string[] = [], extra: string[] = []): AuthorizedPrincipal => ({ userId, roles: [role], capabilities: [...roleCapabilities[role], ...extra], departmentIds })
const main = principal('main', 'MAIN_MANAGER')
const managerDepartments: string[] = []
const otherManagerDepartments: string[] = []
const manager = principal('manager-1', 'DEPARTMENT_MANAGER', managerDepartments)
const otherManager = principal('manager-2', 'DEPARTMENT_MANAGER', otherManagerDepartments)
const employee = principal('employee-1', 'EMPLOYEE', ['dep-1'])
const employee2 = principal('employee-2', 'EMPLOYEE', ['dep-1'])
const secretary = principal('secretary', 'SECRETARY', ['dep-1'], ['meeting.create'])
const auditRepository = new InMemoryAuditRepository()
const notificationRepository = new InMemoryNotificationRepository()
const activity = new InternalActivityService(auditRepository, notificationRepository)

const departments = new InMemoryDepartmentRepository()
const positions = new InMemoryPositionRepository()
const memberships = new InMemoryUserDepartmentRepository()
const users = new InMemoryOrganizationUserRepository([
  { id: employee.userId, firstName: 'کارمند', lastName: 'یک', mobile: '1', username: 'e1', status: 'ACTIVE', createdAt: new Date().toISOString() },
  { id: employee2.userId, firstName: 'کارمند', lastName: 'دو', mobile: '2', username: 'e2', status: 'ACTIVE', createdAt: new Date().toISOString() },
])
const departmentService = new DepartmentService(departments)
const positionService = new PositionService(positions)
const membershipService = new UserDepartmentService(memberships, departments, users)
const dep1 = await departmentService.createDepartment(main, { name: 'تولید' })
const dep2 = await departmentService.createDepartment(main, { name: 'فنی' })
managerDepartments.push(dep1.id)
otherManagerDepartments.push(dep2.id)
assert(dep1.id !== dep2.id, 'Departments were not created.')
await rejects(() => departmentService.createDepartment(main, { name: ' تولید ' }), 'VALIDATION_ERROR')
await rejects(() => departmentService.createDepartment(manager, { name: 'غیرمجاز' }), 'PERMISSION_ERROR')
await positionService.createPosition(main, { name: 'کارشناس فنی' })
await rejects(() => positionService.createPosition(manager, { name: 'غیرمجاز' }), 'PERMISSION_ERROR')
await membershipService.assignUserToDepartment(main, employee.userId, dep1.id, true)
await membershipService.assignUserToDepartment(main, employee.userId, dep2.id)
await membershipService.assignUserToDepartment(main, employee2.userId, dep1.id, true)
const employeeMemberships = await memberships.findByUser(employee.userId)
assert(employeeMemberships.length === 2 && employeeMemberships.filter((item) => item.isPrimary).length === 1, 'Multiple/primary department rule failed.')
assert((await departmentService.getDepartments(manager)).every((item) => item.id === dep1.id), 'Manager saw unrelated department.')
await rejects(() => departmentService.getDepartment(manager, dep2.id), 'ACCESS_DENIED')
await departmentService.disableDepartment(main, dep2.id)
await rejects(() => membershipService.assignUserToDepartment(main, employee2.userId, dep2.id), 'VALIDATION_ERROR')

const meetingRepository = new InMemoryMeetingRepository()
const minutesRepository = new InMemoryMinutesRepository()
const decisionRepository = new InMemoryDecisionRepository()
const meetingService = new MeetingService(meetingRepository, activity)
const minutesService = new MinutesService(minutesRepository, meetingRepository, activity)
const decisionService = new DecisionService(decisionRepository, minutesRepository, meetingRepository, activity)
const meeting = await meetingService.createMeeting(main, { title: 'جلسه تولید', startTime: new Date(Date.now() + 60_000).toISOString() }, [secretary.userId, employee.userId])
await rejects(() => meetingService.createMeeting(manager, { title: 'بدون مجوز', startTime: new Date().toISOString() }), 'PERMISSION_ERROR')
await meetingService.createMeeting(secretary, { title: 'جلسه با مجوز', startTime: new Date().toISOString() })
await rejects(() => meetingService.createMeeting({ ...employee, capabilities: [...employee.capabilities, 'meeting.create'] }, { title: 'کارمند', startTime: new Date().toISOString() }), 'PERMISSION_ERROR')
await meetingService.startMeeting(main, meeting.id)
await meetingService.completeMeeting(main, meeting.id)
await minutesService.createMinutes(secretary, { meetingId: meeting.id, content: 'متن صورت جلسه' })
await minutesService.finalizeMinutes(secretary, meeting.id)
await rejects(() => minutesService.updateMinutes(secretary, meeting.id, 'ویرایش غیرمجاز'), 'PERMISSION_ERROR')
const decision = await decisionService.createDecision(secretary, { meetingId: meeting.id, departmentId: dep1.id, title: 'تعمیر دستگاه', description: 'قطعه آسیب‌دیده تعویض شود.' })

const taskRepository = new InMemoryTaskRepository()
const taskReports = new InMemoryTaskReportRepository()
const taskService = new TaskService(taskRepository, taskReports, decisionRepository, memberships, activity, async () => [manager.userId])
const task = await taskService.createTask(manager, { decisionId: decision.id, departmentId: dep1.id, assignedTo: employee.userId, title: 'تعویض قطعه', description: 'قطعه اصلی تعویض شود.', priority: 'HIGH', deadline: new Date(Date.now() + 86_400_000).toISOString() })
await rejects(() => taskService.createTask(employee, { decisionId: decision.id, departmentId: dep1.id, assignedTo: employee.userId, title: 'غیرمجاز', description: 'غیرمجاز', priority: 'LOW', deadline: new Date().toISOString() }), 'PERMISSION_ERROR')
await rejects(() => taskService.createTask(main, { decisionId: decision.id, departmentId: dep1.id, assignedTo: employee.userId, title: 'غیرمجاز', description: 'غیرمجاز', priority: 'LOW', deadline: new Date().toISOString() }), 'PERMISSION_ERROR')
await taskService.updateTaskStatus(employee, task.id, 'IN_PROGRESS')
await taskService.submitTaskReport(employee, task.id, { description: 'کار انجام شد.' })
await taskService.reviewTask(manager, task.id, false, 'نیازمند مدرک بیشتر')
await taskService.submitTaskReport(employee, task.id, { description: 'مدرک تکمیلی پیوست شد.', attachments: ['file-1'] })
await taskService.reassignTask(manager, task.id, employee2.userId)
await taskService.reviewTask(manager, task.id, true)
assert((await taskRepository.findById(task.id))?.status === 'COMPLETED', 'Task review workflow failed.')
await rejects(() => taskService.cancelTask(otherManager, task.id, 'خارج از واحد'), 'ACCESS_DENIED')

const employeeReports = new InMemoryEmployeeReportRepository()
const departmentReports = new InMemoryDepartmentReportRepository()
const reportService = new ReportService(employeeReports, departmentReports, memberships, activity, async () => [manager.userId], async () => [main.userId])
const employeeReport = await reportService.createEmployeeReport(employee, { departmentId: dep1.id, taskId: task.id, title: 'گزارش روزانه', description: 'فعالیت انجام شد.' })
await reportService.submitEmployeeReport(employee, employeeReport.id)
await reportService.reviewEmployeeReport(manager, employeeReport.id, true)
const departmentReport = await reportService.createDepartmentReport(manager, { departmentId: dep1.id, period: 'ماه جاری', summary: 'عملکرد مناسب' })
await reportService.submitDepartmentReport(manager, departmentReport.id)
const mainReports = await reportService.getReports(main)
assert(mainReports.employeeReports.length === 0 && mainReports.departmentReports.length === 1, 'Main manager report boundary failed.')

const requestRepository = new InMemoryRequestRepository()
const requestService = new RequestService(requestRepository, memberships, activity, async () => [manager.userId], async () => [main.userId])
const request = await requestService.createRequest(employee, { departmentId: dep1.id, type: 'MEETING', title: 'درخواست جلسه', description: 'بررسی فرایند', priority: 'MEDIUM' })
await requestService.submitRequest(employee, request.id)
await requestService.reviewRequest(manager, request.id)
await requestService.escalateRequest(manager, request.id)
assert((await requestService.getRequests(main)).some((item) => item.id === request.id), 'Escalated request was not visible to main manager.')
await requestService.completeRequest(main, request.id)

const fileService = new FileService(new InMemoryFileRepository())
await fileService.attach(employee, { name: 'evidence.pdf', size: 100, type: 'application/pdf', entityType: 'task', entityId: task.id }, { ownerId: employee.userId })
await rejects(() => fileService.list(employee2, 'task', task.id, { ownerId: employee.userId }), 'ACCESS_DENIED')
assert((await auditRepository.findAll()).length >= 15, 'Expected workflow audit events were not created.')
assert((await notificationRepository.findByUser(employee.userId)).length > 0, 'Expected internal notifications were not created.')

console.info('Organization, meeting, minutes, decision, task, report, request, file, notification, and audit checks passed.')
