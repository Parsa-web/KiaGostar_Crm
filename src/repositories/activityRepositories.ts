import type { AuditLog, Notification } from '../domain/entities'

export interface AuditDataRepository { create(item: AuditLog): Promise<AuditLog>; findAll(): Promise<readonly AuditLog[]> }
export interface NotificationDataRepository { create(item: Notification): Promise<Notification>; findByUser(userId: string): Promise<readonly Notification[]> }

export class InMemoryAuditRepository implements AuditDataRepository {
  private readonly records: AuditLog[] = []
  async create(item: AuditLog) { this.records.push(structuredClone(item)); return item }
  async findAll() { return [...this.records] }
}
export class InMemoryNotificationRepository implements NotificationDataRepository {
  private readonly records: Notification[] = []
  async create(item: Notification) { this.records.push(structuredClone(item)); return item }
  async findByUser(userId: string) { return this.records.filter((item) => item.userId === userId) }
}
