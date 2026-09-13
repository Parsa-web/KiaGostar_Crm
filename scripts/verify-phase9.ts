import { AuthorizationError, ValidationError } from '../src/core/errors'
import { redactSensitive, sanitizeFileName } from '../src/core/security'
import { AuditService, InMemoryAuditRepository } from '../src/features/audit'
import { FileManagementService, InMemoryFileRepository } from '../src/features/files'
import { NotificationService, InMemoryNotificationRepository } from '../src/features/notifications'
import { EvaluationService, InMemoryEvaluationRepository, PerformanceAnalyticsService } from '../src/features/performance'
import { InMemoryWorkflowRepository, WorkflowService } from '../src/features/workflow'
import type { AuthorizedPrincipal } from '../src/security'

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
const rejects = async (operation: () => Promise<unknown>, type: typeof Error) => { try { await operation() } catch (error) { if (error instanceof type) return; throw error } throw new Error(`Expected ${type.name}`) }
const actor = (userId: string, role: AuthorizedPrincipal['roles'][number], departments: string[] = []): AuthorizedPrincipal => ({ userId, roles: [role], departmentIds: departments, capabilities: [] })
const manager = actor('manager', 'DEPARTMENT_MANAGER', ['dep-1'])
const otherManager = actor('other-manager', 'DEPARTMENT_MANAGER', ['dep-2'])
const employee = actor('employee', 'EMPLOYEE', ['dep-1'])
const secretary = actor('secretary', 'SECRETARY', ['dep-1'])

const notifications = new NotificationService(new InMemoryNotificationRepository())
const audit = new AuditService(new InMemoryAuditRepository())
await notifications.notifyUser(employee.userId, { title: 'وظیفه', message: 'جدید', type: 'INFO', category: 'TASK', entityType: 'task', entityId: 'task-1', priority: 'HIGH' })
assert(await notifications.getUnreadCount(employee.userId) === 1, 'Unread notification was not created.')
await rejects(() => notifications.getUserNotifications(manager.userId, employee.userId), AuthorizationError)
const own = await notifications.getUserNotifications(employee.userId)
await notifications.markAsRead(employee.userId, own[0].id)
assert(await notifications.getUnreadCount(employee.userId) === 0, 'Notification was not marked read.')

await audit.logAction({ action: 'UPDATE', event: 'TASK_UPDATED', entityType: 'task', entityId: 'task-1', performedBy: manager.userId, description: 'updated', oldValue: { password: 'secret', status: 'A' }, newValue: { token: 'secret', status: 'B' }, metadata: { departmentId: 'dep-1', ownerId: employee.userId } })
const employeeHistory = await audit.getEntityHistory(employee, 'task', 'task-1')
assert(employeeHistory.length === 1 && JSON.stringify(employeeHistory).includes('[REDACTED]'), 'Audit redaction/visibility failed.')
assert((await audit.getSystemActivity(otherManager)).length === 0, 'Department audit isolation failed.')

const files = new FileManagementService(new InMemoryFileRepository(), async () => ({ departmentId: 'dep-1' }))
const file = await files.uploadFile(manager, { entityType: 'TASK', entityId: 'task-1', originalName: '../evidence.pdf', mimeType: 'application/pdf', size: 100, resource: { departmentId: 'dep-1' } })
assert(!file.originalName.includes('..') && !sanitizeFileName('../x.pdf').includes('/'), 'Filename sanitization failed.')
await rejects(() => files.getFile(otherManager, file.id), AuthorizationError)

const workflow = new WorkflowService(new InMemoryWorkflowRepository(), audit, notifications)
const instance = await workflow.createWorkflowInstance(manager, { entityType: 'TASK', entityId: 'task-1', currentStatus: 'CREATED', departmentId: 'dep-1', ownerId: employee.userId })
await workflow.changeStatus(manager, instance.id, 'ASSIGNED', undefined, [employee.userId])
await rejects(() => workflow.changeStatus(manager, instance.id, 'COMPLETED'), ValidationError)

const evaluations = new EvaluationService(new InMemoryEvaluationRepository(), audit, notifications)
const evaluation = await evaluations.createEvaluation(manager, { employeeId: employee.userId, departmentId: 'dep-1', period: '1405-Q1', comment: 'private', criteria: [{ name: 'کیفیت', score: 80, weight: 100, description: 'کیفیت کار' }] })
await evaluations.finalizeEvaluation(manager, evaluation.id)
assert((await evaluations.getEmployeeEvaluations(employee, employee.userId)).length === 1, 'Employee evaluation access failed.')
await rejects(() => evaluations.getEmployeeEvaluations(secretary, employee.userId), AuthorizationError)
await rejects(() => evaluations.getDepartmentEvaluations(otherManager, 'dep-1'), AuthorizationError)

const metrics = new PerformanceAnalyticsService().calculateMetrics({ completedTasks: 8, totalTasks: 10, delayedTasks: 1, submittedReports: 4, approvedReports: 3, completedWorkflows: 9, totalWorkflows: 10 })
assert(metrics.overallScore > 0 && metrics.overallScore <= 100, 'Performance calculation failed.')
assert(JSON.stringify(redactSensitive({ password: 'x', profile: { token: 'y' } })).includes('[REDACTED]'), 'Sensitive data redaction failed.')
console.log('Notification, file, audit, workflow, evaluation, analytics, security, and scope checks passed.')
