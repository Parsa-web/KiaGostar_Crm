import type { Task } from '../../../domain/entities'

export const isTaskOverdue = (task: Task, now = new Date()): boolean =>
  Date.parse(task.deadline) < now.getTime() && task.status !== 'COMPLETED' && task.status !== 'CANCELLED'
