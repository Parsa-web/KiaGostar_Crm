import { AuthorizationError, NotFoundError, ValidationError } from '../../../core/errors'
import type { NotificationRepository } from '../repositories'
import type { CreateNotificationInput, Notification, NotificationFilters, NotificationPriority } from '../types'

export class NotificationService {
  private readonly repository: NotificationRepository
  constructor(repository: NotificationRepository) { this.repository = repository }
  async createNotification(input: CreateNotificationInput) { if (!input.userId || !input.title.trim() || !input.entityType || !input.entityId) throw new ValidationError('INVALID_NOTIFICATION', 'اطلاعات اعلان کامل نیست.'); const item: Notification = { ...input, title: input.title.trim(), message: input.message.trim(), id: crypto.randomUUID(), isRead: false, createdAt: new Date().toISOString() }; return this.repository.create(item) }
  async notifyUser(userId: string, input: Omit<CreateNotificationInput, 'userId'>) { return this.createNotification({ ...input, userId }) }
  async notifyUsers(userIds: readonly string[], input: Omit<CreateNotificationInput, 'userId'>) { return Promise.all([...new Set(userIds)].map((userId) => this.notifyUser(userId, input))) }
  async markAsRead(currentUserId: string, id: string) { const item = await this.requireOwn(currentUserId, id); return item.isRead ? item : this.repository.markAsRead(id) }
  async markAllAsRead(currentUserId: string) { return Promise.all((await this.repository.findUnread(currentUserId)).map((item) => this.repository.markAsRead(item.id))) }
  async getUserNotifications(currentUserId: string, requestedUserId = currentUserId, filters: NotificationFilters = {}) { if (requestedUserId !== currentUserId) throw new AuthorizationError('NOTIFICATION_ACCESS_DENIED'); return (await this.repository.findByUser(requestedUserId)).filter((item) => (!filters.category || item.category === filters.category) && (!filters.priority || item.priority === filters.priority) && (!filters.unreadOnly || !item.isRead)) }
  async getUnreadCount(currentUserId: string) { return (await this.repository.findUnread(currentUserId)).length }
  async deleteNotification(currentUserId: string, id: string) { await this.requireOwn(currentUserId, id); await this.repository.delete(id) }
  async notify(userIds: readonly string[], input: { title: string; message: string; priority: string }) { return this.notifyUsers(userIds, { ...input, priority: normalizePriority(input.priority), type: 'INFO', category: 'SYSTEM', entityType: 'system', entityId: 'system' }) }
  private async requireOwn(userId: string, id: string) { const item = await this.repository.findById(id); if (!item) throw new NotFoundError(); if (item.userId !== userId) throw new AuthorizationError('NOTIFICATION_ACCESS_DENIED'); return item }
}

const normalizePriority = (value: string): NotificationPriority => value === 'LOW' || value === 'HIGH' || value === 'CRITICAL' ? value : 'NORMAL'
