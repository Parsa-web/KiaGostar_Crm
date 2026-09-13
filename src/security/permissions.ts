export const Capabilities = {
  ORGANIZATION_MANAGE: 'organization.manage',
  ORGANIZATION_VIEW: 'organization.view', POSITION_MANAGE: 'position.manage',
  USER_MANAGE: 'user.manage', USER_VIEW: 'user.view',
  ROLE_MANAGE: 'role.manage', CAPABILITY_MANAGE: 'capability.manage',
  MEETING_CREATE: 'meeting.create', MEETING_MANAGE: 'meeting.manage', MEETING_VIEW: 'meeting.view',
  MINUTES_CREATE: 'minutes.create', MINUTES_EDIT: 'minutes.edit', MINUTES_FINALIZE: 'minutes.finalize',
  MINUTES_EDIT_FINAL: 'minutes.edit.final',
  DECISION_CREATE: 'decision.create', DECISION_EDIT: 'decision.edit', DECISION_VIEW: 'decision.view', DECISION_EDIT_FINAL: 'decision.edit.final',
  TASK_CREATE: 'task.create', TASK_ASSIGN: 'task.assign', TASK_REVIEW: 'task.review', TASK_VIEW_SELF: 'task.view.self',
  TASK_UPDATE_SELF: 'task.update.self', TASK_VIEW: 'task.view',
  REPORT_CREATE: 'report.create', REPORT_VIEW: 'report.view', REPORT_REVIEW: 'report.review',
  REQUEST_CREATE: 'request.create', REQUEST_REVIEW: 'request.review', REQUEST_VIEW: 'request.view',
  EVENT_VIEW: 'event.view',
  NOTIFICATION_VIEW: 'notification.view', FILE_MANAGE: 'file.manage', AUDIT_VIEW: 'audit.view',
  DASHBOARD_ORGANIZATION: 'dashboard.organization', DASHBOARD_DEPARTMENT: 'dashboard.department', DASHBOARD_SELF: 'dashboard.self', DASHBOARD_MEETING: 'dashboard.meeting',
  WORKFLOW_MANAGE: 'workflow.manage', WORKFLOW_SELF: 'workflow.self', APPROVAL_MANAGE: 'approval.manage',
  PERFORMANCE_ORGANIZATION: 'performance.organization', PERFORMANCE_DEPARTMENT: 'performance.department', PERFORMANCE_SELF: 'performance.self',
} as const

export type CapabilityCode = (typeof Capabilities)[keyof typeof Capabilities]
