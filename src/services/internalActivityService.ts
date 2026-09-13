import type { AuditLog, Notification } from '../domain/entities'
import type { AuditDataRepository, NotificationDataRepository } from '../repositories/activityRepositories'
import type { ActivityService } from './activityService'

export interface NotificationChannel {
  readonly kind: 'INTERNAL'
  deliver(notification: Notification): Promise<void>
}

export class InternalActivityService implements ActivityService {
  private readonly audit: AuditDataRepository
  private readonly notifications: NotificationDataRepository
  private readonly channels: readonly NotificationChannel[]
  constructor(audit: AuditDataRepository, notifications: NotificationDataRepository, channels: readonly NotificationChannel[] = []) { this.audit = audit; this.notifications = notifications; this.channels = channels }
  async record(entry: Omit<AuditLog, 'id' | 'createdAt'>) { return this.audit.create({ ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() }) }
  async notify(userIds: readonly string[], input: Pick<Notification, 'title' | 'message' | 'priority'>) {
    return Promise.all(userIds.map(async (userId) => {
      const notification = await this.notifications.create({ ...input, id: crypto.randomUUID(), userId, isRead: false, createdAt: new Date().toISOString() })
      await Promise.all(this.channels.map((channel) => channel.deliver(notification)))
      return notification
    }))
  }
}
