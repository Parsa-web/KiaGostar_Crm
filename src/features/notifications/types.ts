export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
export type NotificationCategory = 'MEETING' | 'MINUTES' | 'DECISION' | 'TASK' | 'REQUEST' | 'REPORT' | 'PERFORMANCE' | 'WORKFLOW' | 'SYSTEM'
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: NotificationType
  category: NotificationCategory
  entityType: string
  entityId: string
  priority: NotificationPriority
  isRead: boolean
  createdAt: string
}

export type CreateNotificationInput = Omit<Notification, 'id' | 'isRead' | 'createdAt'>
export interface NotificationFilters { category?: NotificationCategory; priority?: NotificationPriority; unreadOnly?: boolean }
