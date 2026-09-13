import { AuthorizationError, NotFoundError, ValidationError } from '../../../core/errors'
import type { AuthorizedPrincipal } from '../../../security'
import type { AuditService } from '../../audit'
import type { NotificationService } from '../../notifications'
import type { EvaluationRepository } from '../repositories'
import type { Evaluation, EvaluationCriteria } from '../types'

export class EvaluationService {
  private repository: EvaluationRepository
  private audit: AuditService
  private notifications: NotificationService
  constructor(repository: EvaluationRepository, audit: AuditService, notifications: NotificationService) { this.repository = repository; this.audit = audit; this.notifications = notifications }

  async createEvaluation(actor: AuthorizedPrincipal, input: Pick<Evaluation, 'employeeId' | 'departmentId' | 'period' | 'criteria' | 'comment'>) {
    this.assertManager(actor, input.departmentId); validateCriteria(input.criteria)
    const item: Evaluation = { ...input, id: crypto.randomUUID(), managerId: actor.userId, score: weightedScore(input.criteria), status: 'DRAFT', comment: input.comment.trim(), createdAt: new Date().toISOString() }
    await this.repository.create(item)
    await this.audit.logAction({ action: 'CREATE', event: 'EVALUATION_CREATED', entityType: 'evaluation', entityId: item.id, performedBy: actor.userId, description: 'ارزیابی ایجاد شد.', newValue: withoutPrivateComment(item), metadata: { departmentId: item.departmentId, ownerId: item.employeeId } })
    return item
  }
  async updateEvaluation(actor: AuthorizedPrincipal, id: string, input: Partial<Pick<Evaluation, 'criteria' | 'comment' | 'period'>>) {
    const current = await this.require(id); this.assertManager(actor, current.departmentId)
    if (current.status === 'FINALIZED') throw new ValidationError('EVALUATION_FINALIZED')
    if (input.criteria) validateCriteria(input.criteria)
    return this.repository.update({ ...current, ...input, comment: input.comment?.trim() ?? current.comment, score: input.criteria ? weightedScore(input.criteria) : current.score, status: 'UNDER_REVIEW' })
  }
  async finalizeEvaluation(actor: AuthorizedPrincipal, id: string) {
    const current = await this.require(id); this.assertManager(actor, current.departmentId)
    if (current.managerId !== actor.userId) throw new AuthorizationError('EVALUATION_FINALIZE_DENIED')
    const updated = await this.repository.update({ ...current, status: 'FINALIZED', finalizedAt: new Date().toISOString() })
    await this.audit.logAction({ action: 'APPROVE', event: 'EVALUATION_FINALIZED', entityType: 'evaluation', entityId: id, performedBy: actor.userId, description: 'ارزیابی نهایی شد.', oldValue: { status: current.status }, newValue: { status: updated.status, score: updated.score }, metadata: { departmentId: updated.departmentId, ownerId: updated.employeeId } })
    await this.notifications.notifyUser(updated.employeeId, { title: 'ارزیابی نهایی شد', message: `امتیاز دوره ${updated.period} ثبت شد.`, type: 'SUCCESS', category: 'PERFORMANCE', entityType: 'evaluation', entityId: id, priority: 'HIGH' })
    return updated
  }
  async getEmployeeEvaluations(actor: AuthorizedPrincipal, employeeId: string, departmentId?: string) {
    if (actor.roles.includes('SECRETARY') || actor.roles.includes('MAIN_MANAGER')) throw new AuthorizationError('INDIVIDUAL_PERFORMANCE_ACCESS_DENIED')
    if (actor.roles.includes('EMPLOYEE') && actor.userId !== employeeId) throw new AuthorizationError('PERFORMANCE_ACCESS_DENIED')
    if (actor.roles.includes('DEPARTMENT_MANAGER') && (!departmentId || !actor.departmentIds.includes(departmentId))) throw new AuthorizationError('DEPARTMENT_ACCESS_DENIED')
    return (await this.repository.findByEmployee(employeeId)).filter((item) => (!departmentId || item.departmentId === departmentId) && (!actor.roles.includes('EMPLOYEE') || item.status === 'FINALIZED'))
  }
  async getDepartmentEvaluations(actor: AuthorizedPrincipal, departmentId: string) { this.assertManager(actor, departmentId); return this.repository.findByDepartment(departmentId) }
  async getOrganizationSummary(actor: AuthorizedPrincipal) {
    if (!actor.roles.includes('MAIN_MANAGER')) throw new AuthorizationError('ORGANIZATION_PERFORMANCE_ACCESS_DENIED')
    const finalized = (await this.repository.findAll()).filter((item) => item.status === 'FINALIZED')
    return [...finalized.reduce((groups, item) => { const items = groups.get(item.departmentId) ?? []; items.push(item); groups.set(item.departmentId, items); return groups }, new Map<string, Evaluation[]>())].map(([departmentId, items]) => ({ departmentId, evaluations: items.length, averageScore: Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) }))
  }
  private assertManager(actor: AuthorizedPrincipal, departmentId: string) { if (!actor.roles.includes('DEPARTMENT_MANAGER') || !actor.departmentIds.includes(departmentId)) throw new AuthorizationError('EVALUATION_ACCESS_DENIED') }
  private async require(id: string) { const item = await this.repository.findById(id); if (!item) throw new NotFoundError('EVALUATION_NOT_FOUND'); return item }
}

const validateCriteria = (criteria: readonly EvaluationCriteria[]) => { if (!criteria.length) throw new ValidationError('CRITERIA_REQUIRED'); if (criteria.some((item) => !item.name.trim() || item.score < 0 || item.score > 100 || item.weight <= 0)) throw new ValidationError('INVALID_CRITERIA'); if (Math.abs(criteria.reduce((sum, item) => sum + item.weight, 0) - 100) > .01) throw new ValidationError('INVALID_CRITERIA_WEIGHT', 'مجموع وزن معیارها باید ۱۰۰ باشد.') }
const weightedScore = (criteria: readonly EvaluationCriteria[]) => Math.round(criteria.reduce((sum, item) => sum + item.score * item.weight, 0) / 100)
const withoutPrivateComment = (item: Evaluation) => ({ id: item.id, employeeId: item.employeeId, departmentId: item.departmentId, managerId: item.managerId, period: item.period, criteria: item.criteria, score: item.score, status: item.status, createdAt: item.createdAt })
