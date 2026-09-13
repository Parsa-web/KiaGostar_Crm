import type { Task, TaskReport } from '../../domain/entities'

export type CreateTaskInput = Pick<Task, 'decisionId' | 'departmentId' | 'assignedTo' | 'title' | 'description' | 'priority' | 'deadline'>
export type SubmitTaskReportInput = Pick<TaskReport, 'description' | 'attachments'>
export interface TaskDashboardData { active: number; completed: number; overdue: number; departmentWorkload: Readonly<Record<string, number>> }
