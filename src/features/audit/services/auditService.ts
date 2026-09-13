import { loggerService } from '../../../core/logger'
import type { AuthorizedPrincipal } from '../../../security'
import type { AuditRepository } from '../repositories'
import type { AuditAction, AuditFilters, AuditLog, CreateAuditLogInput } from '../types'
import { sanitizeAuditInput } from '../utils/sanitizeAudit'

const actionFromEvent = (event: string): AuditAction => { if (event.includes('CREATED') || event.includes('SUBMITTED')) return 'CREATE'; if (event.includes('DELETED') || event.includes('CANCELLED')) return 'DELETE'; if (event.includes('APPROVED') || event.includes('COMPLETED') || event.includes('FINALIZED')) return 'APPROVE'; if (event.includes('REJECTED')) return 'REJECT'; if (event.includes('ASSIGN')) return 'ASSIGN'; if (event.includes('LOGIN')) return 'LOGIN'; if (event.includes('LOGOUT')) return 'LOGOUT'; if (event.includes('UPLOAD')) return 'UPLOAD'; if (event.includes('DOWNLOAD')) return 'DOWNLOAD'; return 'UPDATE' }

export class AuditService {
  private readonly repository: AuditRepository
  constructor(repository: AuditRepository) { this.repository = repository }
  async createAuditLog(input: CreateAuditLogInput) { const safe = sanitizeAuditInput(input); return this.repository.create({ ...safe, id: crypto.randomUUID(), createdAt: new Date().toISOString() }) }
  async logAction(input: CreateAuditLogInput) { try { return await this.createAuditLog(input) } catch (error) { await loggerService.error('AUDIT_WRITE_FAILED', { error, entityType: input.entityType, entityId: input.entityId }); return null } }
  async record(input: { actorId: string; action: string; entityType: string; entityId: string; before?: unknown; after?: unknown }) { const log = await this.logAction({ action: actionFromEvent(input.action), event: input.action, entityType: input.entityType, entityId: input.entityId, performedBy: input.actorId, description: input.action.replaceAll('_', ' '), oldValue: input.before, newValue: input.after, metadata: inferMetadata(input.after ?? input.before) }); return log ?? { id: crypto.randomUUID(), action: actionFromEvent(input.action), event: input.action, entityType: input.entityType, entityId: input.entityId, performedBy: input.actorId, description: input.action, createdAt: new Date().toISOString() } }
  async getEntityHistory(actor: AuthorizedPrincipal, entityType: string, entityId: string) { return this.visible(actor, await this.repository.findByEntity(entityType, entityId)) }
  async getUserActivity(actor: AuthorizedPrincipal, userId: string) { return this.visible(actor, await this.repository.findByUser(userId)) }
  async getSystemActivity(actor: AuthorizedPrincipal, filters: AuditFilters = {}) { return this.visible(actor, await this.repository.findAll()).then((items) => items.filter((item) => (!filters.entityType || item.entityType === filters.entityType) && (!filters.action || item.action === filters.action) && (!filters.from || item.createdAt >= filters.from) && (!filters.to || item.createdAt <= filters.to))) }
  formatActivity(item: AuditLog) { return { title: item.description, user: item.performedBy, date: item.createdAt, action: item.action } }
  private async visible(actor: AuthorizedPrincipal, logs: readonly AuditLog[]) { if (actor.roles.includes('MAIN_MANAGER')) return logs; if (actor.roles.includes('DEPARTMENT_MANAGER')) return logs.filter((item) => item.metadata?.departmentId && actor.departmentIds.includes(item.metadata.departmentId)); if (actor.roles.includes('SECRETARY')) return logs.filter((item) => ['meeting', 'minutes', 'decision'].includes(item.entityType.toLowerCase()) && (item.performedBy === actor.userId || item.metadata?.ownerId === actor.userId)); return logs.filter((item) => item.performedBy === actor.userId || item.metadata?.ownerId === actor.userId) }
}

const inferMetadata = (value: unknown) => { if (!value || typeof value !== 'object') return undefined; const record = value as Record<string, unknown>; return { departmentId: typeof record.departmentId === 'string' ? record.departmentId : undefined, ownerId: typeof record.assignedTo === 'string' ? record.assignedTo : typeof record.employeeId === 'string' ? record.employeeId : typeof record.createdBy === 'string' ? record.createdBy : undefined } }
