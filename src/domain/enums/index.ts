export const UserStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' } as const
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]

export const RoleCode = {
  MAIN_MANAGER: 'MAIN_MANAGER',
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
  SECRETARY: 'SECRETARY',
  EMPLOYEE: 'EMPLOYEE',
} as const
export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode]

export const TaskStatus = { PENDING: 'PENDING', IN_PROGRESS: 'IN_PROGRESS', WAITING_REVIEW: 'WAITING_REVIEW', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' } as const
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]

export const MeetingStatus = { DRAFT: 'DRAFT', SCHEDULED: 'SCHEDULED', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' } as const
export type MeetingStatus = (typeof MeetingStatus)[keyof typeof MeetingStatus]

export const RequestStatus = { DRAFT: 'DRAFT', SUBMITTED: 'SUBMITTED', UNDER_REVIEW: 'UNDER_REVIEW', APPROVED: 'APPROVED', REJECTED: 'REJECTED', ESCALATED: 'ESCALATED', COMPLETED: 'COMPLETED' } as const
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus]

export const MinutesStatus = { DRAFT: 'DRAFT', UNDER_REVIEW: 'UNDER_REVIEW', FINALIZED: 'FINALIZED', FINAL: 'FINAL' } as const
export type MinutesStatus = (typeof MinutesStatus)[keyof typeof MinutesStatus]

export const RequestType = { PURCHASE: 'PURCHASE', REPAIR: 'REPAIR', HR: 'HR', MEETING: 'MEETING', SUPPORT: 'SUPPORT', PROCESS_CHANGE: 'PROCESS_CHANGE', CUSTOM: 'CUSTOM' } as const
export type RequestType = (typeof RequestType)[keyof typeof RequestType]

export const TaskPriority = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' } as const
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority]

export const ReportStatus = { DRAFT: 'DRAFT', SUBMITTED: 'SUBMITTED', APPROVED: 'APPROVED', REQUIRES_CORRECTION: 'REQUIRES_CORRECTION' } as const
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus]

export const DepartmentReportStatus = { DRAFT: 'DRAFT', SUBMITTED: 'SUBMITTED' } as const
export type DepartmentReportStatus = (typeof DepartmentReportStatus)[keyof typeof DepartmentReportStatus]
