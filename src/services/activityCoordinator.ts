import type { AuditService } from '../features/audit'
import type { NotificationService } from '../features/notifications'
import type { ActivityService } from './activityService'

export class ActivityCoordinator implements ActivityService {
  private readonly audit: AuditService
  private readonly notifications: NotificationService
  constructor(audit: AuditService, notifications: NotificationService) { this.audit = audit; this.notifications = notifications }
  async record(entry: Parameters<ActivityService['record']>[0]) {
    const item = await this.audit.record(entry)
    return { id: item.id, actorId: item.performedBy, action: item.event, entityType: item.entityType, entityId: item.entityId, before: item.oldValue, after: item.newValue, createdAt: item.createdAt }
  }
  async notify(userIds: readonly string[], input: { title: string; message: string; priority: string }) {
    const items = await this.notifications.notify(userIds, input)
    return items.map((item) => ({ id: item.id, userId: item.userId, title: item.title, message: item.message, priority: item.priority, isRead: item.isRead, createdAt: item.createdAt }))
  }
}
