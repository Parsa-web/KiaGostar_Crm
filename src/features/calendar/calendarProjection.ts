import type { AuthorizedPrincipal } from '../../security'
import { can } from '../../security'
import { Capabilities } from '../../security/permissions'
import type { DemoState } from '../../demo'
import { decisionStatusLabels, meetingStatusLabels } from '../../demo'
import { taskStatusLabels } from '../tasks/components/taskPresentation'

export type CalendarTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
export type CalendarItemKind = 'MEETING' | 'TASK' | 'RESOLUTION'

export interface SystemCalendarItem {
  id: string
  entityId: string
  kind: CalendarItemKind
  title: string
  date: string
  endDate?: string
  tone: CalendarTone
  target: 'meetings' | 'tasks'
  status: string
  statusLabel: string
  meta: string
}

const maySeeMeeting = (principal: AuthorizedPrincipal, meeting: DemoState['meetings'][number]) =>
  principal.roles.includes('MAIN_MANAGER')
  || principal.roles.includes('SECRETARY')
  || meeting.organizerId === principal.userId
  || meeting.participantIds.includes(principal.userId)
  || (principal.roles.includes('DEPARTMENT_MANAGER') && principal.departmentIds.includes(meeting.departmentId))

const maySeeTask = (principal: AuthorizedPrincipal, task: DemoState['tasks'][number]) => {
  if (principal.roles.includes('MAIN_MANAGER') && can(principal, Capabilities.TASK_VIEW)) return true
  if (principal.roles.includes('DEPARTMENT_MANAGER') && can(principal, Capabilities.TASK_VIEW)) return principal.departmentIds.includes(task.departmentId)
  return can(principal, Capabilities.TASK_VIEW_SELF) && task.assigneeId === principal.userId
}

const meetingTone = (status: DemoState['meetings'][number]['status']): CalendarTone =>
  status === 'CANCELLED' || status === 'REJECTED' ? 'danger'
    : status === 'COMPLETED' ? 'success'
      : status === 'PENDING_APPROVAL' ? 'warning'
        : status === 'IN_PROGRESS' ? 'info' : 'primary'

const workTone = (status: DemoState['tasks'][number]['status']): CalendarTone =>
  status === 'OVERDUE' ? 'danger' : status === 'COMPLETED' ? 'success' : status === 'IN_PROGRESS' ? 'info' : 'warning'

/** Pure read projection: no calendar-owned records and no mutation/duplication of domain data. */
export const projectSystemCalendar = (store: Pick<DemoState, 'meetings' | 'tasks' | 'resolutions'>, principal: AuthorizedPrincipal): readonly SystemCalendarItem[] => {
  const meetings: SystemCalendarItem[] = store.meetings.filter((meeting) => maySeeMeeting(principal, meeting)).map((meeting) => ({
    id: `meeting:${meeting.id}`,
    entityId: meeting.id,
    kind: 'MEETING',
    title: meeting.title,
    date: meeting.startTime,
    endDate: meeting.endTime,
    tone: meetingTone(meeting.status),
    target: 'meetings',
    status: meeting.status,
    statusLabel: meetingStatusLabels[meeting.status],
    meta: `${meetingStatusLabels[meeting.status]} · ${meeting.location || meeting.modeLabel}`,
  }))

  const tasks: SystemCalendarItem[] = store.tasks.filter((task) => maySeeTask(principal, task)).map((task) => ({
    id: `task:${task.id}`,
    entityId: task.id,
    kind: 'TASK',
    title: task.title,
    date: task.deadline,
    tone: workTone(task.status),
    target: 'tasks',
    status: task.status,
    statusLabel: taskStatusLabels[task.status],
    meta: `${taskStatusLabels[task.status]} · مسئول: ${task.assigneeName}`,
  }))

  const visibleTaskIds = new Set(store.tasks.filter((task) => maySeeTask(principal, task)).map((task) => task.id))
  const resolutions: SystemCalendarItem[] = store.resolutions
    .filter((resolution) => principal.roles.includes('SECRETARY') || (resolution.taskId ? visibleTaskIds.has(resolution.taskId) : false) || resolution.assigneeId === principal.userId)
    .map((resolution) => ({
      id: `resolution:${resolution.id}`,
      entityId: resolution.taskId ?? resolution.meetingId,
      kind: 'RESOLUTION',
      title: resolution.title,
      date: resolution.dueDate,
      tone: workTone(resolution.status),
      target: resolution.taskId ? 'tasks' : 'meetings',
      status: resolution.status,
      statusLabel: decisionStatusLabels[resolution.status],
      meta: `${decisionStatusLabels[resolution.status]} · جلسه: ${resolution.meetingTitle}`,
    }))

  return [...meetings, ...tasks, ...resolutions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}
