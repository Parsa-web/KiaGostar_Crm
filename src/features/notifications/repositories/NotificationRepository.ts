import type { Notification } from '../types'

export interface NotificationRepository {
  create(item: Notification): Promise<Notification>
  update(item: Notification): Promise<Notification>
  delete(id: string): Promise<void>
  findById(id: string): Promise<Notification | null>
  findByUser(userId: string): Promise<readonly Notification[]>
  findUnread(userId: string): Promise<readonly Notification[]>
  findByEntity(entityType: string, entityId: string): Promise<readonly Notification[]>
  markAsRead(id: string): Promise<Notification>
}

export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly records = new Map<string, Notification>()
  async create(item: Notification) { this.records.set(item.id, structuredClone(item)); return structuredClone(item) }
  async update(item: Notification) { if (!this.records.has(item.id)) throw new Error('NOT_FOUND'); this.records.set(item.id, structuredClone(item)); return structuredClone(item) }
  async delete(id: string) { this.records.delete(id) }
  async findById(id: string) { const item = this.records.get(id); return item ? structuredClone(item) : null }
  async findByUser(userId: string) { return [...this.records.values()].filter((item) => item.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((item) => structuredClone(item)) }
  async findUnread(userId: string) { return (await this.findByUser(userId)).filter((item) => !item.isRead) }
  async findByEntity(entityType: string, entityId: string) { return [...this.records.values()].filter((item) => item.entityType === entityType && item.entityId === entityId).map((item) => structuredClone(item)) }
  async markAsRead(id: string) { const item = await this.findById(id); if (!item) throw new Error('NOT_FOUND'); return this.update({ ...item, isRead: true }) }
}
