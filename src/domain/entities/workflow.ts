import type { DepartmentReportStatus, MeetingStatus, MinutesStatus, ReportStatus, RequestStatus, RequestType, TaskPriority, TaskStatus } from '../enums'

export interface Meeting { id: string; title: string; description?: string; createdBy: string; startTime: string; endTime?: string; status: MeetingStatus; createdAt: string }
export interface MeetingParticipant { id: string; meetingId: string; userId: string }
export interface Minutes { id: string; meetingId: string; content: string; status: MinutesStatus; createdBy: string; createdAt: string }
export interface Decision { id: string; meetingId: string; departmentId: string; title: string; description: string; status: string; createdAt: string }
export interface Task { id: string; decisionId: string; departmentId: string; createdBy: string; assignedTo: string; title: string; description: string; priority: TaskPriority; deadline: string; status: TaskStatus; createdAt: string }
export interface TaskReport { id: string; taskId: string; createdBy: string; description: string; attachments?: string[]; createdAt: string }
export interface EmployeeReport { id: string; employeeId: string; departmentId: string; taskId?: string; title: string; description: string; status: ReportStatus; attachments?: string[]; managerComment?: string; createdAt: string }
export interface DepartmentReport { id: string; departmentId: string; createdBy: string; period: string; summary: string; taskSummary?: unknown; issues?: string; attachments?: string[]; status: DepartmentReportStatus; createdAt: string }
export interface Request { id: string; type: RequestType; title: string; description: string; createdBy: string; departmentId: string; priority: TaskPriority; status: RequestStatus; attachments?: string[]; reviewReason?: string; createdAt: string }
export interface FileAttachment { id: string; name: string; size: number; type: string; uploadedBy: string; entityType: string; entityId: string; createdAt: string }
export interface Notification { id: string; userId: string; title: string; message: string; priority: string; isRead: boolean; createdAt: string }
export interface AuditLog { id: string; actorId: string; action: string; entityType: string; entityId: string; before?: unknown; after?: unknown; createdAt: string }
