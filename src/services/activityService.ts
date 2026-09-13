import type { AuditLog, Notification } from '../domain/entities'

export interface AuditWriter {
  record(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>
}
export interface InternalNotificationWriter {
  notify(userIds: readonly string[], input: Pick<Notification, 'title' | 'message' | 'priority'>): Promise<readonly Notification[]>
}
export interface ActivityService extends AuditWriter, InternalNotificationWriter {}

export class NoopActivityService implements ActivityService {
  async record(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> { return { ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() } }
  async notify(userIds: readonly string[], input: Pick<Notification, 'title' | 'message' | 'priority'>): Promise<readonly Notification[]> { return userIds.map((userId) => ({ ...input, id: crypto.randomUUID(), userId, isRead: false, createdAt: new Date().toISOString() })) }
}
