export interface WorkflowInstance { id: string; entityType: string; entityId: string; currentStatus: string; createdBy: string; departmentId?: string; ownerId?: string; startedAt: string; completedAt?: string }
export interface WorkflowHistoryRecord { id: string; workflowId: string; fromStatus: string; toStatus: string; changedBy: string; reason?: string; createdAt: string }
export interface Approval { id: string; entityType: string; entityId: string; requestedBy: string; approverId: string; departmentId: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; comment?: string; createdAt: string; decidedAt?: string }
export interface Reminder { id: string; type: 'TASK_DEADLINE' | 'TASK_OVERDUE' | 'MEETING_UPCOMING' | 'APPROVAL_PENDING'; entityType: string; entityId: string; recipientIds: readonly string[]; dueAt: string; sentAt?: string }
export interface Escalation { id: string; entityType: string; entityId: string; reason: string; fromUserId: string; notifyUserIds: readonly string[]; createdAt: string }
export type WorkflowEntityType = 'TASK' | 'REPORT' | 'REQUEST' | 'MEETING' | 'DECISION' | string
