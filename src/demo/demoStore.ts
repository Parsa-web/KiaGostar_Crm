import {useSyncExternalStore} from 'react'
import {Capabilities,type CapabilityCode} from '../security/permissions'
import {can,type CapabilityPrincipal} from '../security/can'
import {toast} from '../components/ui/overlay/toastStore'
import {demoNotifications as seedNotifications} from './demoWorkItems'
import {meetingRequestViews,meetingViews,meetingTypeLabels,meetingModeLabels,meetingMinutes,type MeetingRequestView,type MeetingView} from './demoMeetingViews'
import {fileViews,reportViews,type FileView,type ReportView} from './demoViews'
import {requestViews,type RequestView} from './demoViews'
import {taskViews,type TaskView} from './demoViews'
import {demoDataset,findDemoDepartment,findDemoUser} from './demoDataset'
import {formatPersianDate,toLocalIso} from '../core/utils/dateUtils'


/**
 * Mutable, reactive demo store for all work modules.
 * Seeded from the shared demo dataset so every create/update is visible across
 * list, detail and dashboard surfaces. Permission checks reuse the shared
 * security engine (`can` + Capabilities); feedback reuses the shared toast
 * store. This layer is the single spot to replace with real backend calls.
 */

export interface MeetingWorkspaceEvent {
  id: string
  meetingId: string
  actorId: string
  action: string
  createdAt: string
  metadata?: string
}

export interface MeetingWorkspaceState {
  minutes: string
  startedAt?: string
  finishedAt?: string
  events: MeetingWorkspaceEvent[]
}

export interface MeetingAgendaRecord {
  id: string
  meetingId: string
  order: number
  title: string
  description?: string
  durationMinutes: number
  completed: boolean
}

/** A resolution («مصوبه») agreed during a meeting and delegated to one employee.
    It always carries the meeting it belongs to, so both the assignee's task and
    the report they file later can be traced back to the session that ordered it. */
export interface MeetingResolutionView {
  id: string
  meetingId: string
  meetingTitle: string
  title: string
  description: string
  assigneeId: string
  assigneeName: string
  createdById: string
  createdByName: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
  dueDate: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  /** Created only when the meeting has actually ended. */
  taskId?: string
  createdAt: string
}

export interface NotificationRecord {
  id: string
  userId: string
  title: string
  body: string
  category: 'MEETING' | 'TASK' | 'REPORT' | 'REQUEST' | 'SYSTEM'
  priority: 'HIGH' | 'NORMAL' | 'LOW'
  read: boolean
  createdAt: string
  link?: string
}

export interface DemoState {
  requests: RequestView[]
  tasks: TaskView[]
  reports: ReportView[]
  meetings: MeetingView[]
  meetingAgendaItems: MeetingAgendaRecord[]
  meetingRequests: MeetingRequestView[]
  meetingWorkspaces: Record<string, MeetingWorkspaceState>
  resolutions: MeetingResolutionView[]
  notifications: NotificationRecord[]
  files: StoredFileView[]
}

/** Metadata follows the existing file model; small payloads are optional until
    a backend/object-storage adapter replaces localStorage. */
export interface StoredFileView extends FileView { dataUrl?: string }

const seedState = (): DemoState => ({
  requests: requestViews.map((item) => ({ ...item })),
  tasks: taskViews.map((item) => ({ ...item })),
  reports: reportViews.map((item) => ({ ...item })),
  meetings: meetingViews.map((item) => ({ ...item })),
  meetingAgendaItems: demoDataset.agenda.map((item) => ({ ...item })),
  meetingRequests: meetingRequestViews.map((item) => ({ ...item })),
  meetingWorkspaces: seedMeetingWorkspaces(),
  resolutions: seedResolutions(),
  notifications: seedNotifications.map((item) => ({ ...item })),
  files: fileViews.map((item) => ({ ...item })),
})

/* ---------------------------------------------------------------------------
   Persistence
   Without this every reload rebuilt the store from the seed, so a meeting the
   manager had just created vanished. The whole working set is mirrored into
   localStorage and rehydrated on boot; the seed is only used the very first
   time (or when the stored payload belongs to an older schema).
   --------------------------------------------------------------------------- */
/* Bumped whenever the persisted shape changes: tasks lost their `progress`
   field and reports gained `stage`/`reviews`, so a payload written by the
   previous release must not be rehydrated. */
const STORAGE_KEY = 'kiagostar.demo.state.v2'
const storage = (): Storage | undefined => { try { return window.localStorage } catch { return undefined } }

export function rehydrateDemoState(raw: string | null, seeded: DemoState = seedState()): DemoState {
  if (!raw) return seeded
  try {
    const parsed = JSON.parse(raw) as Partial<DemoState>
    /* Merge over the seed so a field added in a later release is never
       `undefined` for users whose browser still holds the previous payload. */
    return {
      requests: parsed.requests ?? seeded.requests,
      tasks: parsed.tasks ?? seeded.tasks,
      reports: parsed.reports ?? seeded.reports,
      meetings: parsed.meetings ?? seeded.meetings,
      meetingAgendaItems: parsed.meetingAgendaItems ?? seeded.meetingAgendaItems,
      meetingRequests: parsed.meetingRequests ?? seeded.meetingRequests,
      meetingWorkspaces: parsed.meetingWorkspaces ?? seeded.meetingWorkspaces,
      resolutions: parsed.resolutions ?? seeded.resolutions,
      notifications: parsed.notifications ?? seeded.notifications,
      files: parsed.files ?? seeded.files,
    }
  } catch { return seeded }
}

function loadState(): DemoState {
  return rehydrateDemoState(storage()?.getItem(STORAGE_KEY) ?? null)
}

let persistTimer: number | undefined
function persist(next: DemoState) {
  const store = storage()
  if (!store) return
  /* Writes are coalesced: live minutes autosave on every keystroke and a
     synchronous JSON.stringify per character would jank the editor. */
  if (persistTimer !== undefined) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => { try { store.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* quota exceeded — demo data is disposable */ } }, 150)
}

/** Clears the persisted demo working set and restores the pristine seed. */
export function demoResetState() {
  storage()?.removeItem(STORAGE_KEY)
  commit(seedState())
  toast.info('داده‌های نمایشی بازنشانی شد')
}

let state: DemoState = loadState()


function seedMeetingWorkspaces(): Record<string, MeetingWorkspaceState> {
  const workspaces: Record<string, MeetingWorkspaceState> = {}
  meetingViews.forEach((meeting) => {
    const minutes = meetingMinutes(meeting.id)
    workspaces[meeting.id] = {
      minutes: minutes?.content ?? '',
      startedAt: undefined,
      finishedAt: undefined,
      events: [],
    }
    if (meeting.status === 'IN_PROGRESS' || meeting.status === 'COMPLETED') {
      workspaces[meeting.id].startedAt = meeting.startTime
    }
    if (meeting.status === 'COMPLETED') workspaces[meeting.id].finishedAt = meeting.endTime
  })
  return workspaces
}

/** Seed resolutions from the demo decisions so the «مصوبات» tab is populated
    on a fresh install exactly like every other module. */
function seedResolutions(): MeetingResolutionView[] {
  return demoDataset.decisions.map((decision) => {
    const meeting = demoDataset.meetings.find((item) => item.id === decision.meetingId)
    const task = demoDataset.tasks.find((item) => item.id === decision.taskId)
    return {
      id: decision.id,
      meetingId: decision.meetingId,
      meetingTitle: meeting?.title ?? 'جلسه نامشخص',
      title: decision.title,
      description: task?.description ?? '',
      assigneeId: decision.ownerId,
      assigneeName: findDemoUser(decision.ownerId)?.fullName ?? 'کاربر نامشخص',
      createdById: meeting?.organizerId ?? '',
      createdByName: findDemoUser(meeting?.organizerId ?? '')?.fullName ?? 'کاربر نامشخص',
      priority: decision.priority,
      dueDate: decision.dueDate,
      status: decision.status,
      taskId: decision.taskId ?? '',
      createdAt: meeting?.startTime ?? decision.dueDate,
    }
  })
}

const listeners = new Set<() => void>()
/* The schedule clock. `demoSyncSchedule` promotes meetings to IN_PROGRESS the
   moment their start time arrives (and closes them once the end time passes),
   but it only has an effect if something calls it. The store drives it itself:
   the ticker runs while at least one component is subscribed, so any open tab
   sees a meeting go live without a manual refresh or a click on «شروع جلسه». */
const SCHEDULE_TICK_MS = 1_000
let scheduleTimer: number | undefined
const startScheduleClock = () => {
  if (scheduleTimer !== undefined || typeof window === 'undefined') return
  scheduleTimer = window.setInterval(() => { demoSyncSchedule() }, SCHEDULE_TICK_MS)
}
const stopScheduleClock = () => {
  if (scheduleTimer === undefined || typeof window === 'undefined') return
  window.clearInterval(scheduleTimer); scheduleTimer = undefined
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  /* Catch up immediately: a tab opened after the start time must not wait a
     whole tick before the meeting appears as in progress. */
  startScheduleClock(); demoSyncSchedule()
  return () => { listeners.delete(listener); if (listeners.size === 0) stopScheduleClock() }
}
const snapshot = () => state
const commit = (next: DemoState) => { state = next; persist(next); listeners.forEach((listener) => listener()) }

/** Read-only snapshot for projections and verification; mutations must still use actions. */
export const demoGetSnapshot = (): Readonly<DemoState> => state


/** React hook: re-renders subscribers whenever any demo action mutates the store. */
export function useDemoState(): DemoState { return useSyncExternalStore(subscribe, snapshot, snapshot) }

const allowed = (principal: CapabilityPrincipal | null | undefined, capability?: CapabilityCode): boolean =>
  capability == null || can(principal, capability)
const denied = (capability: CapabilityCode) => { toast.error('این عملیات مجاز نیست', `برای این اقدام «${capability}» لازم است.`); return false }

const nameOf = (id: string) => id ? (findDemoUser(id)?.fullName ?? 'کاربر نامشخص') : 'کاربر نامشخص'
const departmentNameOf = (id: string | undefined) => id ? (findDemoDepartment(id)?.name ?? 'واحد نامشخص') : 'واحد نامشخص'
const pad = (value: number, size = 4) => String(value).padStart(size, '0')
let sequence = 8000
const nextCode = (prefix: string) => { sequence += 1; return `${prefix}-${pad(sequence)}` }
const now = () => new Date().toISOString()
const formatNotificationDate = (value: string) => formatPersianDate(value, { dateStyle: 'medium' })

// ---------------------------------------------------------------------------
// REQUESTS
// ---------------------------------------------------------------------------
const requestTypeLabels: Readonly<Record<RequestView['type'], string>> = { LEAVE: 'مرخصی', EQUIPMENT: 'تجهیزات', BUDGET: 'بودجه', ACCESS: 'دسترسی', OTHER: 'سایر' }

export interface CreateRequestPayload {
  title: string
  description: string
  type?: string
  departmentId?: string
  priority?: string
}

export function demoCreateRequest(principal: CapabilityPrincipal | null | undefined, actorId: string, input: CreateRequestPayload) {
  if (!allowed(principal, Capabilities.REQUEST_CREATE)) return denied(Capabilities.REQUEST_CREATE)
  if (!input.title.trim() || !input.description.trim() || !input.departmentId) { toast.warning('عنوان، شرح و واحد درخواست لازم است.'); return }
  const type = (input.type ?? 'OTHER') as RequestView['type']
  const request: RequestView = {
    id: `req-${Date.now()}`,
    code: nextCode('REQ'),
    title: input.title.trim(),
    description: input.description.trim(),
    requesterId: actorId,
    requesterName: nameOf(actorId),
    departmentId: input.departmentId,
    departmentName: departmentNameOf(input.departmentId),
    type,
    typeLabel: requestTypeLabels[type],
    priority: (input.priority ?? 'NORMAL') as RequestView['priority'],
    status: 'PENDING',
    stage: 'DEPARTMENT',
    createdAt: now(),
    submittedAt: now(),
  }
  commit({ ...state, requests: [request, ...state.requests] })
  const departmentManagerId = demoDataset.departments.find((department) => department.id === request.departmentId)?.managerId
  if (departmentManagerId && departmentManagerId !== actorId) {
    demoNotify(departmentManagerId, 'درخواست جدید منتظر بررسی', `${request.requesterName} درخواست «${request.title}» را ثبت کرده است.`, 'REQUEST', `/requests/${request.id}`)
  }
  toast.info('نمایش داده شد', 'رویداد جدید در حافظه دمو ثبت شد.')
  toast.success('درخواست ثبت شد', request.title)
  return request
}

export function demoApproveRequest(principal: CapabilityPrincipal | null | undefined, requestId: string) {
  if (!allowed(principal, Capabilities.REQUEST_REVIEW)) return denied(Capabilities.REQUEST_REVIEW)
  const target = state.requests.find((item) => item.id === requestId)
  if (!target) { toast.error('پیدا نشد', 'درخواست موردنظر در دسترس نیست.'); return false }
  /* Two-stage approval: department manager sets MANAGER_APPROVED, CEO sets
     APPROVED. Only the correct reviewer at each stage may advance. */
  const isCEO = principal && (principal as {roles?:readonly string[]}).roles?.includes?.('MAIN_MANAGER')
  const isDM = principal && (principal as {roles?:readonly string[]}).roles?.includes?.('DEPARTMENT_MANAGER')
  let updated: typeof target
  if (isCEO && target.stage === 'EXECUTIVE') {
    updated = { ...target, status: 'APPROVED', stage: 'COMPLETED' }
    commit({ ...state, requests: state.requests.map((item) => item.id === requestId ? updated : item) })
    demoNotify(updated.requesterId, 'درخواست شما تأیید نهایی شد', `درخواست «${updated.title}» توسط مدیرعامل تأیید شد.`, 'REQUEST', `/requests/${updated.id}`)
    toast.success('درخواست تأیید نهایی شد', updated.title)
  } else if (isDM && target.stage === 'DEPARTMENT') {
    updated = { ...target, stage: 'EXECUTIVE' }
    commit({ ...state, requests: state.requests.map((item) => item.id === requestId ? updated : item) })
    /* Notify the CEO that a request is waiting for their review. */
    demoNotify('usr-ceo', 'درخواست منتظر تأیید مدیرعامل', `درخواست «${updated.title}» پس از تأیید مدیر واحد منتظر تأیید نهایی است.`, 'REQUEST', `/requests/${updated.id}`)
    demoNotify(updated.requesterId, 'درخواست تأیید مدیر واحد شد', `درخواست «${updated.title}» توسط مدیر واحد تأیید و برای مدیرعامل ارسال شد.`, 'REQUEST', `/requests/${updated.id}`)
    toast.success('درخواست تأیید و به مدیرعامل ارسال شد', updated.title)
  } else {
    toast.error('دسترسی غیرمجاز', 'شما مجاز به بررسی این درخواست نیستید.'); return false
  }
  return true
}

export function demoRejectRequest(principal: CapabilityPrincipal | null | undefined, requestId: string, reason: string) {
  if (!allowed(principal, Capabilities.REQUEST_REVIEW)) return denied(Capabilities.REQUEST_REVIEW)
  const target = state.requests.find((item) => item.id === requestId)
  if (!target) { toast.error('پیدا نشد', 'درخواست موردنظر در دسترس نیست.'); return false }
  if (!reason.trim()) { toast.warning('دلیل رد لازم است.'); return false }
  const isCEO = principal && (principal as {roles?:readonly string[]}).roles?.includes?.('MAIN_MANAGER')
  const isDM = principal && (principal as {roles?:readonly string[]}).roles?.includes?.('DEPARTMENT_MANAGER')
  if (!(isCEO && target.stage === 'EXECUTIVE') && !(isDM && target.stage === 'DEPARTMENT')) {
    toast.error('دسترسی غیرمجاز', 'شما مجاز به بررسی این درخواست نیستید.'); return false
  }
  const updated = { ...target, status: 'REJECTED' as const, stage: 'COMPLETED' as const, description: `${target.description}\n\nدلیل رد: ${reason.trim()}` }
  commit({ ...state, requests: state.requests.map((item) => item.id === requestId ? updated : item) })
  demoNotify(updated.requesterId, 'درخواست شما رد شد', `درخواست «${updated.title}» رد شد: ${reason.trim()}`, 'REQUEST', `/requests/${updated.id}`)
  toast.success('درخواست رد شد', updated.title)
  return true
}

// ---------------------------------------------------------------------------
// TASKS
// ---------------------------------------------------------------------------
export interface CreateTaskPayload {
  title: string
  description: string
  assignees: readonly string[]
  department?: string
  priority?: string
  deadline?: string
  /** Set when the task originates from a meeting resolution. */
  meetingId?: string
}

const meetingTitleOf = (meetingId: string | undefined) => meetingId ? state.meetings.find((item) => item.id === meetingId)?.title : undefined

/** Builds one task per assignee. A resolution can be delegated to several
    employees at once, and each of them must own their own task row. */
function buildTasks(actorId: string, input: CreateTaskPayload): TaskView[] {
  const meetingTitle = meetingTitleOf(input.meetingId)
  const department = input.department ?? findDemoUser(input.assignees[0])?.departmentId ?? ''
  return input.assignees.map((assigneeId, index) => ({
    id: `tsk-${Date.now()}-${index}`,
    code: nextCode('TSK'),
    title: input.title.trim(),
    description: input.description.trim(),
    assigneeId,
    assigneeName: nameOf(assigneeId),
    creatorId: actorId,
    creatorName: nameOf(actorId),
    departmentId: findDemoUser(assigneeId)?.departmentId ?? department,
    departmentName: departmentNameOf(findDemoUser(assigneeId)?.departmentId ?? department),
    meetingId: input.meetingId,
    meetingTitle,
    status: 'PENDING',
    priority: (input.priority ?? 'NORMAL') as TaskView['priority'],
    deadline: input.deadline!,
    createdAt: now(),
    overdue: false,
  }))
}

export interface TaskViewer { userId: string; departmentId?: string; roles: readonly string[] }

/** Shared task scope for lists, detail routes and mutations. */
export function demoTasksForViewer(tasks: readonly TaskView[], viewer: TaskViewer): readonly TaskView[] {
  if (viewer.roles.includes('MAIN_MANAGER') || viewer.roles.includes('CEO')) return tasks
  if (viewer.roles.includes('DEPARTMENT_MANAGER')) {
    return tasks.filter((task) => task.assigneeId === viewer.userId || (
      task.departmentId === viewer.departmentId && findDemoUser(task.assigneeId)?.role === 'EMPLOYEE'
    ))
  }
  return tasks.filter((task) => task.assigneeId === viewer.userId)
}

const taskViewerOf = (actorId: string): TaskViewer => {
  const user = findDemoUser(actorId)
  return {
    userId: actorId,
    departmentId: user?.departmentId,
    roles: user?.role === 'CEO' ? ['MAIN_MANAGER'] : user ? [user.role] : [],
  }
}

export const canActOnTask = (task: TaskView, actorId: string): boolean =>
  demoTasksForViewer([task], taskViewerOf(actorId)).length === 1

export function demoCreateTask(principal: CapabilityPrincipal | null | undefined, actorId: string, input: CreateTaskPayload) {
  if (!allowed(principal, Capabilities.TASK_CREATE)) return denied(Capabilities.TASK_CREATE)
  if (!input.title.trim() || !input.assignees.length || !input.deadline) { toast.warning('عنوان، مسئول و مهلت وظیفه لازم است.'); return }
  const actor = findDemoUser(actorId)
  if (actor?.role === 'DEPARTMENT_MANAGER') {
    const outsideScope = input.assignees.some((assigneeId) => {
      const assignee = findDemoUser(assigneeId)
      return assignee?.role !== 'EMPLOYEE' || assignee.departmentId !== actor.departmentId
    })
    if (outsideScope) { toast.error('دسترسی غیرمجاز', 'مدیر واحد فقط می‌تواند برای کارکنان همان واحد وظیفه ایجاد کند.'); return }
  }
  const tasks = buildTasks(actorId, input)
  commit({ ...state, tasks: [...tasks, ...state.tasks] })
  tasks.forEach((task) => demoNotify(task.assigneeId, 'وظیفه جدید به شما واگذار شد', `«${task.title}» با مهلت ${formatNotificationDate(task.deadline)} به شما واگذار شد.`, 'TASK', `/tasks/${task.id}`))
  toast.success('وظیفه ثبت شد', tasks[0].title)
  return tasks[0]
}


export function demoUpdateTaskStatus(principal: CapabilityPrincipal | null | undefined, taskId: string, status: TaskView['status']) {
  const task = state.tasks.find((item) => item.id === taskId)
  if (!task) { toast.error('پیدا نشد', 'وظیفه موردنظر در دسترس نیست.'); return false }
  const gate = allowed(principal, Capabilities.TASK_UPDATE_SELF) || allowed(principal, Capabilities.TASK_REVIEW)
  if (!gate) return denied(Capabilities.TASK_REVIEW)
  const principalUserId = (principal as { userId?: string } | null | undefined)?.userId
  if (!principalUserId || !canActOnTask(task, principalUserId)) return denied(Capabilities.TASK_UPDATE_SELF)
  if (!allowed(principal, Capabilities.TASK_REVIEW) && principalUserId && task.assigneeId !== principalUserId) return denied(Capabilities.TASK_UPDATE_SELF)
  if (task.status === 'COMPLETED' || task.status === 'OVERDUE') { toast.warning('وضعیت قابل تغییر نیست.'); return false }
  const updated = { ...task, status, overdue: false }
  commit({ ...state, tasks: state.tasks.map((item) => item.id === taskId ? updated : item) })
  if (updated.creatorId && updated.creatorId !== principalUserId) demoNotify(updated.creatorId, 'وضعیت وظیفه تغییر کرد', `وضعیت «${updated.title}» توسط ${updated.assigneeName} به‌روزرسانی شد.`, 'TASK', `/tasks/${updated.id}`)
  toast.success('وضعیت وظیفه تغییر کرد', updated.title)
  return true
}

export interface CreateTaskAttachmentPayload { name: string; mimeType: string; sizeBytes: number; dataUrl?: string }
const MAX_LOCAL_ATTACHMENT_BYTES = 512 * 1024
const MAX_LOCAL_ATTACHMENT_DATA = 3 * 1024 * 1024

/** Persists small task attachments in the existing store. The payload field is
    deliberately optional so the same metadata maps directly to backend files later. */
export function demoAddTaskAttachments(principal: CapabilityPrincipal | null | undefined, taskId: string, actorId: string, inputs: readonly CreateTaskAttachmentPayload[]) {
  if (!allowed(principal, Capabilities.FILE_MANAGE)) return denied(Capabilities.FILE_MANAGE)
  const task = state.tasks.find((item) => item.id === taskId)
  if (!task || !canActOnTask(task, actorId)) { toast.error('دسترسی غیرمجاز', 'این وظیفه در محدوده دسترسی شما نیست.'); return false }
  if (!inputs.length) return []
  if (inputs.some((file) => !file.name.trim() || file.sizeBytes <= 0 || file.sizeBytes > MAX_LOCAL_ATTACHMENT_BYTES)) {
    toast.warning('فایل نامعتبر است', 'حداکثر حجم هر پیوست برای ذخیره محلی ۵۱۲ کیلوبایت است.'); return false
  }
  const currentDataSize = state.files.reduce((total, file) => total + (file.dataUrl?.length ?? 0), 0)
  const incomingDataSize = inputs.reduce((total, file) => total + (file.dataUrl?.length ?? 0), 0)
  if (currentDataSize + incomingDataSize > MAX_LOCAL_ATTACHMENT_DATA) {
    toast.warning('فضای ذخیره محلی کافی نیست', 'برای جلوگیری از عبور از محدودیت localStorage، پیوست‌های قبلی را مدیریت کنید.'); return false
  }
  const uploadedAt = now()
  const files: StoredFileView[] = inputs.map((file, index) => ({
    id: `file-task-${Date.now()}-${index}`,
    name: file.name.trim().replace(/[\\/]/g, '-'),
    mimeType: file.mimeType || 'application/octet-stream',
    sizeBytes: file.sizeBytes,
    uploaderId: actorId,
    uploaderName: nameOf(actorId),
    uploadedAt,
    entityType: 'TASK',
    entityId: taskId,
    dataUrl: file.dataUrl,
  }))
  commit({ ...state, files: [...files, ...state.files] })
  toast.success('پیوست ذخیره شد', `${files.length} فایل به «${task.title}» اضافه شد.`)
  return files
}

export function demoRemoveTaskAttachment(principal: CapabilityPrincipal | null | undefined, taskId: string, fileId: string, actorId: string) {
  if (!allowed(principal, Capabilities.FILE_MANAGE)) return denied(Capabilities.FILE_MANAGE)
  const task = state.tasks.find((item) => item.id === taskId)
  const file = state.files.find((item) => item.id === fileId && item.entityType === 'TASK' && item.entityId === taskId)
  if (!task || !file || !canActOnTask(task, actorId)) return false
  commit({ ...state, files: state.files.filter((item) => item.id !== fileId) })
  toast.success('پیوست حذف شد', file.name)
  return true
}

// ---------------------------------------------------------------------------
// REPORTS
// ---------------------------------------------------------------------------
export interface CreateReportPayload {
  title: string
  summary: string
  department?: string
  period?: string
  type?: string
  draft?: boolean
  /** Meeting this report answers to (picked in the form or inherited from a task). */
  meetingId?: string
  /** Resolution task this report closes out. */
  taskId?: string
}

/* ---------------------------------------------------------------------------
   Approval chain
   An employee's report is reviewed by their department manager first and only
   reaches the CEO once that manager has approved it. A department manager has
   nobody between them and the CEO, so their report skips the first desk. At any
   desk the reviewer may send it back, which returns it to the author for
   correction rather than ending the workflow.
   --------------------------------------------------------------------------- */

/** The desk a freshly submitted report must land on, based on who wrote it. */
export function reportEntryStage(authorId: string): 'DEPARTMENT' | 'EXECUTIVE' {
  return findDemoUser(authorId)?.role === 'EMPLOYEE' ? 'DEPARTMENT' : 'EXECUTIVE'
}

export interface ReportViewer { userId: string; departmentId?: string; roles: readonly string[] }

/** The single visibility policy used by report lists and direct detail routes. */
export function demoReportsForViewer(reports: readonly ReportView[], viewer: ReportViewer): readonly ReportView[] {
  if (viewer.roles.includes('MAIN_MANAGER') || viewer.roles.includes('CEO')) {
    return reports.filter((report) => report.stage === 'EXECUTIVE' || report.stage === 'COMPLETED')
  }
  if (viewer.roles.includes('DEPARTMENT_MANAGER')) {
    return reports.filter((report) => {
      if (report.authorId === viewer.userId) return true
      const author = findDemoUser(report.authorId)
      return author?.role === 'EMPLOYEE' && report.departmentId === viewer.departmentId && report.stage !== 'DRAFT' && report.stage !== 'AUTHOR'
    })
  }
  return reports.filter((report) => report.authorId === viewer.userId)
}

/** Whether `principal` is the reviewer this report is currently waiting on.
    Approval rights alone are not enough: a manager must not sign off a report
    that is still queued for a different desk. */
export function canReviewReportNow(principal: CapabilityPrincipal | null | undefined, viewer: { userId: string; departmentId?: string; roles: readonly string[] }, report: ReportView): boolean {
  if (!allowed(principal, Capabilities.REPORT_REVIEW)) return false
  /* Nobody reviews their own work, whatever their role. */
  if (report.authorId === viewer.userId) return false
  if (report.stage === 'DEPARTMENT') return viewer.roles.includes('DEPARTMENT_MANAGER') && (!viewer.departmentId || viewer.departmentId === report.departmentId)
  if (report.stage === 'EXECUTIVE') return viewer.roles.includes('MAIN_MANAGER') || viewer.roles.includes('CEO')
  return false
}

export function demoCreateReport(principal: CapabilityPrincipal | null | undefined, actorId: string, input: CreateReportPayload) {
  if (!allowed(principal, Capabilities.REPORT_CREATE)) return denied(Capabilities.REPORT_CREATE)
  if (!input.title.trim() || !input.summary.trim()) { toast.warning('عنوان و خلاصه گزارش الزامی است.'); return }
  /* When the author reports against a resolution task, the meeting is derived
     from that task — the reviewer must never have to guess the origin. */
  const task = input.taskId ? state.tasks.find((item) => item.id === input.taskId) : undefined
  const meetingId = input.meetingId ?? task?.meetingId
  const actor = findDemoUser(actorId)
  const departmentId = actor?.departmentId ?? input.department ?? ''
  const report: ReportView = {
    id: `rpt-${Date.now()}`,
    code: nextCode('RPT'),
    title: input.title.trim(),
    summary: input.summary.trim(),
    authorId: actorId,
    authorName: nameOf(actorId),
    departmentId,
    departmentName: departmentNameOf(departmentId) || '',
    period: input.period?.trim() || 'پیش‌فرض',
    type: input.type ?? 'عملکردی',
    priority: 'NORMAL',
    status: input.draft ? 'DRAFT' : 'SUBMITTED',
    stage: input.draft ? 'DRAFT' : reportEntryStage(actorId),
    reviews: [],
    submittedAt: now(),
    meetingId,
    meetingTitle: meetingTitleOf(meetingId),
    taskId: task?.id,
    taskTitle: task?.title,
  }
  commit({ ...state, reports: [report, ...state.reports] })
  toast.success(input.draft ? 'پیش‌نویس ذخیره شد' : 'گزارش ارسال شد', input.draft ? report.title : `${report.title} — ارسال به ${report.stage === 'DEPARTMENT' ? 'مدیر واحد' : 'مدیر عامل'}`)
  if (!input.draft) {
    const dept = findDemoDepartment(report.departmentId)
    const deptManager = dept?.managerId
    if (report.stage === 'DEPARTMENT' && deptManager) demoNotify(deptManager, 'گزارش جدید منتظر بررسی', `${report.authorName} گزارش «${report.title}» را ارسال کرده است.`, 'REPORT', `/reports/${report.id}`)
    if (report.stage === 'EXECUTIVE') demoNotify('usr-ceo', 'گزارش جدید مدیر عامل', `${report.authorName} گزارش «${report.title}» را برای تأیید نهایی ارسال کرده است.`, 'REPORT', `/reports/${report.id}`)
  }
  return report
}

/** Re-submits a report that came back for correction, sending it to the desk it
    must start from again. */
export function demoResubmitReport(principal: CapabilityPrincipal | null | undefined, reportId: string, summary?: string) {
  if (!allowed(principal, Capabilities.REPORT_CREATE)) return denied(Capabilities.REPORT_CREATE)
  const target = state.reports.find((item) => item.id === reportId)
  if (!target) { toast.error('پیدا نشد', 'گزارش موردنظر در دسترس نیست.'); return false }
  if (target.stage !== 'AUTHOR' && target.stage !== 'DRAFT') { toast.warning('این گزارش در انتظار اصلاح نیست.'); return false }
  const updated: ReportView = {
    ...target,
    summary: summary?.trim() || target.summary,
    status: 'SUBMITTED',
    stage: reportEntryStage(target.authorId),
    submittedAt: now(),
  }
  commit({ ...state, reports: state.reports.map((item) => item.id === reportId ? updated : item) })
  toast.success('گزارش دوباره ارسال شد', `${updated.title} — ${updated.stage === 'DEPARTMENT' ? 'مدیر واحد' : 'مدیر عامل'}`)
  return true
}

/** Records one decision in the chain.
    Approving at the department desk forwards the report to the CEO; approving at
    the executive desk closes it. Returning it at either desk sends it back to
    the author, whose correction restarts the chain. */
export function demoReviewReport(principal: CapabilityPrincipal | null | undefined, reportId: string, approved: boolean, comment?: string, reviewerId?: string) {
  if (!allowed(principal, Capabilities.REPORT_REVIEW)) return denied(Capabilities.REPORT_REVIEW)
  const target = state.reports.find((item) => item.id === reportId)
  if (!target) { toast.error('پیدا نشد', 'گزارش موردنظر در دسترس نیست.'); return false }
  const actor = reviewerId ?? ''
  const reviewer = findDemoUser(actor)
  const reviewerRoles = reviewer?.role === 'CEO' ? ['MAIN_MANAGER'] : reviewer ? [reviewer.role] : []
  if (!canReviewReportNow(principal, { userId: actor, departmentId: reviewer?.departmentId, roles: reviewerRoles }, target)) {
    toast.error('دسترسی غیرمجاز', 'این گزارش در صف بررسی شما نیست.'); return false
  }
  if (target.stage !== 'DEPARTMENT' && target.stage !== 'EXECUTIVE') { toast.warning('این گزارش در مرحله بررسی نیست.'); return false }
  if (!approved && !comment?.trim()) { toast.warning('توضیح اصلاح لازم است.'); return false }

  const stage = target.stage
  const entry = {
    id: `rev-${Date.now()}`,
    stage,
    reviewerId: actor,
    reviewerName: nameOf(actor),
    decision: approved ? 'APPROVED' as const : 'RETURNED' as const,
    comment: comment?.trim() || undefined,
    decidedAt: now(),
  }
  /* When the department manager approves an employee's report, it is finalized
     (COMPLETED) — it does NOT get forwarded to the CEO. Returning at the
     executive desk sends an employee-authored report back to the department
     manager rather than straight to the author. */
  const nextStage: ReportView['stage'] = approved
    ? 'COMPLETED'
    : stage === 'EXECUTIVE' && reportEntryStage(target.authorId) === 'DEPARTMENT'
      ? 'DEPARTMENT'
      : 'AUTHOR'
  const nextStatus: ReportView['status'] = approved ? 'APPROVED' : 'REJECTED'
  const updated: ReportView = { ...target, stage: nextStage, status: nextStatus, reviews: [...target.reviews, entry] }

  commit({ ...state, reports: state.reports.map((item) => item.id === reportId ? updated : item) })
  toast.success(
    approved ? 'گزارش تأیید شد' : 'گزارش برای اصلاح بازگشت داده شد',
    updated.title,
  )
  if (!approved) {
    demoNotify(target.authorId, 'گزارش برای اصلاح بازگشت داده شد', `گزارش «${target.title}» توسط ${nameOf(actor)} برای اصلاح بازگشت داده شده است.`, 'REPORT', `/reports/${reportId}`)
  }
  if (approved) {
    demoNotify(target.authorId, 'گزارش تأیید شد', `گزارش «${target.title}» توسط ${stage === 'DEPARTMENT' ? 'مدیر واحد' : 'مدیرعامل'} تأیید شده است.`, 'REPORT', `/reports/${reportId}`)
  }
  return true
}

/** Reports waiting on the given viewer's desk. */
export function demoReportsAwaiting(reports: readonly ReportView[], viewer: { userId: string; departmentId?: string; roles: readonly string[] }): readonly ReportView[] {
  const executive = viewer.roles.includes('MAIN_MANAGER') || viewer.roles.includes('CEO')
  const departmental = viewer.roles.includes('DEPARTMENT_MANAGER')
  return reports.filter((report) => {
    if (report.authorId === viewer.userId) return false
    if (report.stage === 'EXECUTIVE') return executive
    if (report.stage === 'DEPARTMENT') return departmental && (!viewer.departmentId || viewer.departmentId === report.departmentId)
    return false
  })
}

// ---------------------------------------------------------------------------
// MEETINGS
// ---------------------------------------------------------------------------
export interface CreateMeetingPayload {
  title: string
  purpose?: string
  description?: string
  startTime: string
  endTime?: string
  type?: string
  mode?: string
  location?: string
  onlineUrl?: string
  departmentId?: string
  participantIds?: readonly string[]
  agendaItems?: readonly { title: string; description?: string; durationMinutes: number }[]
}

export type UpdateMeetingPayload = Partial<Omit<CreateMeetingPayload, 'agendaItems'>> & { agendaItems?: CreateMeetingPayload['agendaItems'] }

/**
 * Centralised unique-name check for meetings. Trims whitespace and compares
 * case-insensitively so that "جلسه مدیران" and "  جلسه مدیران  " are treated
 * as duplicates. The optional `excludeMeetingId` is only used in edit flows
 * — never in create or recreate.
 */
export function isMeetingNameUnique(name: string, excludeMeetingId?: string): boolean {
  const normalised = name.trim().toLocaleLowerCase('fa')
  if (!normalised) return false
  return !state.meetings.some(
    (meeting) => meeting.id !== excludeMeetingId && meeting.title.trim().toLocaleLowerCase('fa') === normalised,
  )
}

/**
 * Maps an existing MeetingView to CreateMeetingPayload for the recreate flow.
 * Name and Date (startTime) are intentionally omitted — the user must provide
 * fresh values for both. All other transferable fields are deep-cloned.
 */
export function meetingToCreateFormValues(meeting: MeetingView): CreateMeetingPayload {
  const agendaItems = state.meetingAgendaItems
    .filter((item) => item.meetingId === meeting.id)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      title: item.title,
      description: item.description,
      durationMinutes: item.durationMinutes,
    }))
  return {
    title: '',
    purpose: meeting.purpose,
    description: meeting.description,
    startTime: '',
    endTime: meeting.endTime,
    type: meeting.type,
    mode: meeting.mode,
    location: meeting.location,
    onlineUrl: meeting.onlineUrl,
    departmentId: meeting.departmentId,
    participantIds: [...meeting.participantIds],
    agendaItems: agendaItems.map((item) => ({ ...item, description: item.description })),
  }
}

export function demoCreateMeeting(actorId: string, input: CreateMeetingPayload) {
  if (!input.title.trim() || !input.startTime) { toast.warning('عنوان و زمان شروع جلسه لازم است.'); return }
  if (!isMeetingNameUnique(input.title)) { toast.warning('جلسه‌ای با این نام قبلاً وجود دارد. لطفاً نام دیگری انتخاب کنید.'); return }
  if (!input.endTime) { toast.warning('زمان پایان جلسه الزامی است.'); return }
  if (new Date(input.endTime).getTime() < new Date(input.startTime).getTime()) { toast.warning('زمان پایان نمی‌تواند قبل از زمان شروع باشد.'); return }
  const departmentId = input.departmentId ?? findDemoUser(actorId)?.departmentId
  const meeting: MeetingView = {
    id: `mtg-${Date.now()}`,
    code: nextCode('MTG'),
    title: input.title.trim(),
    type: (input.type ?? 'INTERNAL') as MeetingView['type'],
    mode: (input.mode ?? 'IN_PERSON') as MeetingView['mode'],
    typeLabel: meetingTypeLabels[(input.type ?? 'INTERNAL') as MeetingView['type']],
    modeLabel: meetingModeLabels[(input.mode ?? 'IN_PERSON') as MeetingView['mode']],
    status: 'SCHEDULED',
    purpose: input.purpose?.trim() ?? '',
    description: input.description?.trim() ?? '',
    organizerId: actorId,
    organizerName: nameOf(actorId),
    departmentId: departmentId ?? '',
    departmentName: departmentNameOf(departmentId).trim() ? departmentNameOf(departmentId) : 'واحد نامشخص',
    location: input.location ?? '',
    onlineUrl: input.onlineUrl,
    startTime: input.startTime,
    endTime: input.endTime ?? '',
    createdAt: now(),
    updatedAt: now(),
    requiresApproval: false,
    participantIds: input.participantIds ?? [],
    participantCount: (input.participantIds ?? []).length,
    durationMinutes: input.endTime ? Math.max(0, Math.round((new Date(input.endTime).getTime() - new Date(input.startTime).getTime()) / 60000)) : 60,
  }
  const agendaItems: MeetingAgendaRecord[] = (input.agendaItems ?? [])
    .filter((item) => item.title.trim())
    .map((item, index) => ({ id: `agenda-${meeting.id}-${index + 1}`, meetingId: meeting.id, order: index + 1, title: item.title.trim(), description: item.description?.trim(), durationMinutes: Math.max(5, item.durationMinutes || 15), completed: false }))
  commit({ ...state, meetings: [meeting, ...state.meetings], meetingAgendaItems: [...state.meetingAgendaItems, ...agendaItems] })
  toast.success('جلسه زمان‌بندی شد', meeting.title)
  for (const participantId of meeting.participantIds) {
    demoNotify(participantId, 'جلسه جدید دعوت شدید', `شما به جلسه «${meeting.title}» دعوت شده‌اید.`, 'MEETING', `/meetings/${meeting.id}`)
  }
  return meeting
}

/**
 * Saves a meeting as a DRAFT (پیش‌نویس). Unlike `demoCreateMeeting` which
 * immediately schedules, this lets the creator review and finalise later
 * via `demoScheduleMeeting`.
 */
export function demoSaveMeetingDraft(actorId: string, input: CreateMeetingPayload): MeetingView | undefined {
  if (!input.title.trim()) { toast.warning('عنوان جلسه لازم است.'); return }
  if (!isMeetingNameUnique(input.title)) { toast.warning('جلسه‌ای با این نام قبلاً وجود دارد. لطفاً نام دیگری انتخاب کنید.'); return }
  const departmentId = input.departmentId ?? findDemoUser(actorId)?.departmentId
  const meeting: MeetingView = {
    id: `mtg-${Date.now()}`,
    code: nextCode('MTG'),
    title: input.title.trim(),
    type: (input.type ?? 'INTERNAL') as MeetingView['type'],
    mode: (input.mode ?? 'IN_PERSON') as MeetingView['mode'],
    typeLabel: meetingTypeLabels[(input.type ?? 'INTERNAL') as MeetingView['type']],
    modeLabel: meetingModeLabels[(input.mode ?? 'IN_PERSON') as MeetingView['mode']],
    status: 'DRAFT',
    purpose: input.purpose?.trim() ?? '',
    description: input.description?.trim() ?? '',
    organizerId: actorId,
    organizerName: nameOf(actorId),
    departmentId: departmentId ?? '',
    departmentName: departmentNameOf(departmentId).trim() ? departmentNameOf(departmentId) : 'واحد نامشخص',
    location: input.location ?? '',
    onlineUrl: input.onlineUrl,
    startTime: input.startTime,
    endTime: input.endTime ?? '',
    createdAt: now(),
    updatedAt: now(),
    requiresApproval: false,
    participantIds: input.participantIds ?? [],
    participantCount: (input.participantIds ?? []).length,
    durationMinutes: input.endTime ? Math.max(0, Math.round((new Date(input.endTime).getTime() - new Date(input.startTime).getTime()) / 60000)) : 60,
  }
  const agendaItems: MeetingAgendaRecord[] = (input.agendaItems ?? [])
    .filter((item) => item.title.trim())
    .map((item, index) => ({ id: `agenda-${meeting.id}-${index + 1}`, meetingId: meeting.id, order: index + 1, title: item.title.trim(), description: item.description?.trim(), durationMinutes: Math.max(5, item.durationMinutes || 15), completed: false }))
  commit({ ...state, meetings: [meeting, ...state.meetings], meetingAgendaItems: [...state.meetingAgendaItems, ...agendaItems] })
  toast.success('جلسه به‌عنوان پیش‌نویس ذخیره شد', meeting.title)
  return meeting
}

export function demoChangeMeetingStatus(meetingId: string, status: MeetingView['status']) {
  const target = state.meetings.find((item) => item.id === meetingId)
  if (!target) { toast.error('پیدا نشد', 'جلسه موردنظر در دسترس نیست.'); return false }
  const updated = { ...target, status }
  commit({ ...state, meetings: state.meetings.map((item) => item.id === meetingId ? updated : item) })
  toast.success('وضعیت جلسه بروزرسانی شد', updated.title)
  return true
}

/** Updates the canonical meeting record used by lists, workspaces and calendar. */
export function demoUpdateMeeting(meetingId: string, input: UpdateMeetingPayload) {
  const target = state.meetings.find((item) => item.id === meetingId)
  if (!target) { toast.error('پیدا نشد', 'جلسه موردنظر در دسترس نیست.'); return false }
  if (target.status === 'COMPLETED' || target.status === 'CANCELLED') { toast.warning('جلسه پایان‌یافته یا لغو‌شده قابل ویرایش نیست.'); return false }
  const title = input.title === undefined ? target.title : input.title.trim()
  if (!title) { toast.warning('عنوان جلسه الزامی است.'); return false }
  if (input.title !== undefined && !isMeetingNameUnique(title, meetingId)) { toast.warning('جلسه‌ای با این نام قبلاً وجود دارد. لطفاً نام دیگری انتخاب کنید.'); return false }
  const startTime = input.startTime ?? target.startTime
  const endTime = input.endTime ?? target.endTime
  if (!Number.isFinite(new Date(startTime).getTime()) || !Number.isFinite(new Date(endTime).getTime()) || new Date(endTime).getTime() < new Date(startTime).getTime()) {
    toast.warning('تاریخ یا ساعت جلسه معتبر نیست.'); return false
  }
  const type = (input.type ?? target.type) as MeetingView['type']
  const mode = (input.mode ?? target.mode) as MeetingView['mode']
  const participantIds = input.participantIds ?? target.participantIds
  const departmentId = input.departmentId ?? target.departmentId
  const updated: MeetingView = {
    ...target,
    title,
    purpose: input.purpose === undefined ? target.purpose : input.purpose.trim(),
    description: input.description === undefined ? target.description : input.description.trim(),
    type,
    typeLabel: meetingTypeLabels[type],
    mode,
    modeLabel: meetingModeLabels[mode],
    location: input.location === undefined ? target.location : input.location,
    onlineUrl: input.onlineUrl === undefined ? target.onlineUrl : input.onlineUrl,
    departmentId,
    departmentName: departmentNameOf(departmentId),
    participantIds,
    participantCount: participantIds.length,
    startTime,
    endTime,
    durationMinutes: Math.max(0, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000)),
    updatedAt: now(),
  }
  const agendaItems = input.agendaItems === undefined ? state.meetingAgendaItems : [
    ...state.meetingAgendaItems.filter((item) => item.meetingId !== meetingId),
    ...input.agendaItems.filter((item) => item.title.trim()).map((item, index) => ({ id: `agenda-${meetingId}-${index + 1}`, meetingId, order: index + 1, title: item.title.trim(), description: item.description?.trim(), durationMinutes: Math.max(5, item.durationMinutes || 15), completed: false })),
  ]
  commit({
    ...state,
    meetings: state.meetings.map((item) => item.id === meetingId ? updated : item),
    meetingAgendaItems: agendaItems,
    resolutions: state.resolutions.map((item) => item.meetingId === meetingId ? { ...item, meetingTitle: updated.title } : item),
    tasks: state.tasks.map((item) => item.meetingId === meetingId ? { ...item, meetingTitle: updated.title } : item),
  })
  demoNotifyUsers([...new Set([...target.participantIds, ...participantIds])], 'جلسه به‌روزرسانی شد', `زمان یا اطلاعات جلسه «${updated.title}» تغییر کرد.`, 'MEETING', `/meetings/${meetingId}`)
  toast.success('جلسه به‌روزرسانی شد', updated.title)
  /* Immediately recalculate time-sensitive statuses so the badge reflects the
     new schedule without waiting for the next 1-second clock tick. */
  demoSyncSchedule()
  return updated
}

/** Saves the edited schedule on the canonical meeting and promotes a draft. */
export function demoScheduleMeeting(meetingId: string, input: UpdateMeetingPayload) {
  const target = state.meetings.find((item) => item.id === meetingId)
  if (!target || target.status !== 'DRAFT') { toast.warning('فقط جلسه پیش‌نویس قابل زمان‌بندی است.'); return false }
  const updated = demoUpdateMeeting(meetingId, input)
  if (!updated) return false
  const scheduled = { ...updated, status: 'SCHEDULED' as const, updatedAt: now() }
  commit({ ...state, meetings: state.meetings.map((item) => item.id === meetingId ? scheduled : item) })
  demoNotifyUsers(scheduled.participantIds, 'جلسه زمان‌بندی شد', `جلسه «${scheduled.title}» برای ${formatNotificationDate(scheduled.startTime)} زمان‌بندی شد.`, 'MEETING', `/meetings/${meetingId}`)
  toast.success('پیش‌نویس به جلسه زمان‌بندی‌شده تبدیل شد', scheduled.title)
  demoSyncSchedule()
  return scheduled
}

/** Removes only the meeting-owned records. Delegated tasks/resolutions remain as accountable history. */
export function demoRemoveMeeting(meetingId: string) {
  const target = state.meetings.find((item) => item.id === meetingId)
  if (!target) return false
  const meetingWorkspaces = { ...state.meetingWorkspaces }
  delete meetingWorkspaces[meetingId]
  commit({
    ...state,
    meetings: state.meetings.filter((item) => item.id !== meetingId),
    meetingAgendaItems: state.meetingAgendaItems.filter((item) => item.meetingId !== meetingId),
    meetingWorkspaces,
  })
  demoNotifyUsers(target.participantIds, 'جلسه حذف شد', `جلسه «${target.title}» از برنامه حذف شد.`, 'MEETING')
  toast.success('جلسه حذف شد', target.title)
  return true
}

export function demoDecideMeetingRequest(id: string, approved: boolean) {
  const target = state.meetingRequests.find((item) => item.id === id)
  if (!target) { toast.error('پیدا نشد', 'درخواست جلسه در دسترس نیست.'); return false }
  const updated = { ...target, status: approved ? 'APPROVED' as const : 'REJECTED' as const }
  commit({ ...state, meetingRequests: state.meetingRequests.map((item) => item.id === id ? updated : item) })
  toast.success(approved ? 'درخواست جلسه تأیید شد' : 'درخواست جلسه رد شد', updated.title)
  return true
}

/** Find the live workspace state for a meeting (creating a default when absent). */
export function demoMeetingWorkspace(meetingId: string): MeetingWorkspaceState {
  return state.meetingWorkspaces[meetingId] ?? { minutes: '', events: [] }
}

let workspaceSequence = 1
function nextWorkspaceEvent(meetingId: string, actorId: string, action: string, metadata?: string): MeetingWorkspaceEvent {
  workspaceSequence += 1
  return { id: `wse-${Date.now()}-${workspaceSequence}`, meetingId, actorId, action, createdAt: now(), metadata }
}

function commitWorkspace(meetingId: string, patch: Partial<MeetingWorkspaceState>) {
  const current = state.meetingWorkspaces[meetingId] ?? { minutes: '', events: [] }
  commit({ ...state, meetingWorkspaces: { ...state.meetingWorkspaces, [meetingId]: { ...current, ...patch } } })
}

function appendWorkspaceEvent(meetingId: string, event: MeetingWorkspaceEvent) {
  const current = state.meetingWorkspaces[meetingId] ?? { minutes: '', events: [] }
  commit({ ...state, meetingWorkspaces: { ...state.meetingWorkspaces, [meetingId]: { ...current, events: [...current.events, event] } } })
}

/** Secretary begins the live meeting session (joins window + grants edit). Business logic stays in the page hook. */
export function demoStartMeeting(meetingId: string, actorId: string): boolean {
  const meeting = state.meetings.find((item) => item.id === meetingId)
  if (!meeting) { toast.error('پیدا نشد', 'جلسه موردنظر در دسترس نیست.'); return false }
  if (!isStartable(meeting.status)) { toast.warning('این جلسه در وضعیت قابل شروع نیست.'); return false }
  const stamp = Date.now()
  if (stamp < new Date(meeting.startTime).getTime() || stamp >= new Date(meeting.endTime).getTime()) {
    toast.warning('شروع جلسه فقط در بازه واقعی برگزاری مجاز است.'); return false
  }
  const updated = { ...meeting, status: 'IN_PROGRESS' as const, updatedAt: now() }
  commitWorkspace(meetingId, { startedAt: now() })
  appendWorkspaceEvent(meetingId, nextWorkspaceEvent(meetingId, actorId, 'جلسه آغاز شد', 'دبیر جلسه وارد شد'))
  commit({ ...state, meetings: state.meetings.map((item) => item.id === meetingId ? updated : item) })
  toast.success('جلسه آغاز شد', updated.title)
  return true
}

/** Finish the meeting: mark COMPLETED, persist minutes and timestamp the closing event. */
export function demoFinishMeeting(meetingId: string, actorId: string, minutes: string): boolean {
  const meeting = state.meetings.find((item) => item.id === meetingId)
  if (!meeting) { toast.error('پیدا نشد', 'جلسه موردنظر در دسترس نیست.'); return false }
  if (meeting.status !== 'IN_PROGRESS') { toast.warning('فقط جلسه در حال برگزاری قابل پایان است.'); return false }
  const updated = { ...meeting, status: 'COMPLETED' as const, updatedAt: now() }
  commitWorkspace(meetingId, { finishedAt: now(), minutes })
  appendWorkspaceEvent(meetingId, nextWorkspaceEvent(meetingId, actorId, 'جلسه به پایان رسید', 'صورت‌جلسه نهایی شد'))
  commit({ ...state, meetings: state.meetings.map((item) => item.id === meetingId ? updated : item) })
  materializeResolutionTasks(meetingId, actorId)
  toast.success('جلسه پایان یافت', updated.title)
  return true
}

/** Save live minutes content into the workspace record (draft autosave). */
export function demoUpdateMeetingMinutes(meetingId: string, minutes: string, actorId?: string): void {
  commitWorkspace(meetingId, { minutes })
  if (actorId) appendWorkspaceEvent(meetingId, nextWorkspaceEvent(meetingId, actorId, 'صورت‌جلسه بروزرسانی شد', 'ویرایش زنده'))
}

// ---------------------------------------------------------------------------
// AUTOMATIC MEETING LIFECYCLE
// A scheduled meeting must open by itself the moment its start time arrives —
// nobody should have to press a button for the clock to be right. The same
// sweep closes sessions whose end time has passed and flags overdue work.
// ---------------------------------------------------------------------------
const isStartable = (status: MeetingView['status']) => status === 'SCHEDULED' || status === 'APPROVED'

/** Derives the time-sensitive status without replacing explicit terminal/draft states. */
export function meetingStatusAt(meeting: MeetingView, reference: Date = new Date()): MeetingView['status'] {
  if (meeting.status === 'DRAFT' || meeting.status === 'PENDING_APPROVAL' || meeting.status === 'CANCELLED' || meeting.status === 'REJECTED' || meeting.status === 'COMPLETED') return meeting.status
  const stamp = reference.getTime()
  const start = new Date(meeting.startTime).getTime()
  const end = meeting.endTime ? new Date(meeting.endTime).getTime() : start + meeting.durationMinutes * 60_000
  if (!Number.isFinite(start) || !Number.isFinite(end)) return meeting.status
  if (stamp >= end) return 'COMPLETED'
  if (meeting.status === 'IN_PROGRESS') return 'IN_PROGRESS'
  if (stamp >= start && isStartable(meeting.status)) return 'IN_PROGRESS'
  return meeting.status
}

/** Advances every meeting/task whose scheduled moment has arrived. Idempotent:
    calling it repeatedly (it runs on a timer) only commits when something
    actually changed, so it never triggers a render loop. */
export function demoSyncSchedule(reference: Date = new Date()): boolean {
  const stamp = reference.getTime()
  let changed = false

  const meetings = state.meetings.map((meeting) => {
    const status = meetingStatusAt(meeting, reference)
    if (status === meeting.status) return meeting
    changed = true
    return { ...meeting, status, updatedAt: toLocalIso(reference) }
  })

  const workspaces = { ...state.meetingWorkspaces }
  meetings.forEach((meeting, index) => {
    if (meeting.status === state.meetings[index]?.status) return
    const current = workspaces[meeting.id] ?? { minutes: '', events: [] }
    if (meeting.status === 'IN_PROGRESS') workspaces[meeting.id] = { ...current, startedAt: current.startedAt ?? meeting.startTime, events: [...current.events, { id: `wse-auto-${meeting.id}`, meetingId: meeting.id, actorId: meeting.organizerId, action: 'جلسه به‌صورت خودکار آغاز شد', createdAt: toLocalIso(reference), metadata: 'رسیدن به زمان شروع' }] }
    if (meeting.status === 'COMPLETED') workspaces[meeting.id] = { ...current, finishedAt: current.finishedAt ?? meeting.endTime }
  })

  /* Deadlines are evaluated in the same pass so the "overdue" badge on tasks and
     resolutions is always consistent with the clock. */
  const tasks = state.tasks.map((task) => {
    if (task.status === 'COMPLETED' || task.status === 'OVERDUE') return task
    if (new Date(task.deadline).getTime() >= stamp) return task
    changed = true
    return { ...task, status: 'OVERDUE' as const, overdue: true }
  })
  const resolutions = state.resolutions.map((resolution) => {
    const task = tasks.find((item) => item.id === resolution.taskId)
    const status = task?.status ?? resolution.status
    if (status === resolution.status) return resolution
    changed = true
    return { ...resolution, status }
  })

  if (!changed) return false
  const lifecycleChanges = meetings.flatMap((meeting, index) => {
    const previous = state.meetings[index]
    return previous && previous.status !== meeting.status ? [{ meeting, previousStatus: previous.status }] : []
  })
  commit({ ...state, meetings, meetingWorkspaces: workspaces, tasks, resolutions })
  lifecycleChanges.forEach(({ meeting, previousStatus }) => {
    if (meeting.status === 'IN_PROGRESS') {
      demoNotifyUsers(meeting.participantIds, 'جلسه آغاز شد', `جلسه «${meeting.title}» اکنون در حال برگزاری است.`, 'MEETING', `/meetings/${meeting.id}/workspace`)
    } else if (meeting.status === 'COMPLETED' && previousStatus !== 'COMPLETED') {
      materializeResolutionTasks(meeting.id, meeting.organizerId)
      demoNotifyUsers(meeting.participantIds, 'جلسه برگزار شد', `جلسه «${meeting.title}» به پایان رسید و مستندات آن در دسترس است.`, 'MEETING', `/meetings/${meeting.id}`)
    }
  })
  return true
}

// ---------------------------------------------------------------------------
// RESOLUTIONS («مصوبات»)
// ---------------------------------------------------------------------------
export interface CreateResolutionPayload {
  title: string
  description?: string
  assignees: readonly string[]
  dueDate: string
  priority?: string
}

/** Creates the assignee tasks exactly once, after the originating meeting ends. */
function materializeResolutionTasks(meetingId: string, actorId: string): TaskView[] {
  const pending = state.resolutions.filter((item) => item.meetingId === meetingId && !item.taskId)
  if (!pending.length) return []
  const tasks = pending.map((resolution) => ({
    ...buildTasks(actorId || resolution.createdById, {
      title: resolution.title,
      description: resolution.description,
      assignees: [resolution.assigneeId],
      priority: resolution.priority,
      deadline: resolution.dueDate,
      meetingId,
    })[0],
    id: `tsk-${resolution.id}`,
  }))
  const taskByResolution = new Map(pending.map((resolution, index) => [resolution.id, tasks[index]]))
  commit({
    ...state,
    tasks: [...tasks, ...state.tasks],
    resolutions: state.resolutions.map((resolution) => {
      const task = taskByResolution.get(resolution.id)
      return task ? { ...resolution, taskId: task.id } : resolution
    }),
  })
  tasks.forEach((task) => demoNotify(task.assigneeId, 'وظیفه مصوبه به شما واگذار شد', `«${task.title}» پس از پایان جلسه برای شما ایجاد شد.`, 'TASK', `/tasks/${task.id}`))
  return tasks
}

/** Records a resolution in the meeting store. Its task is materialized only
    after the meeting has actually ended. */
export function demoCreateResolution(principal: CapabilityPrincipal | null | undefined, meetingId: string, actorId: string, input: CreateResolutionPayload) {
  if (!allowed(principal, Capabilities.DECISION_CREATE)) return denied(Capabilities.DECISION_CREATE)
  const meeting = state.meetings.find((item) => item.id === meetingId)
  if (!meeting) { toast.error('پیدا نشد', 'جلسه موردنظر در دسترس نیست.'); return }
  const actor = findDemoUser(actorId)
  const mayManageMeeting = actor?.role === 'CEO' || actor?.role === 'SECRETARY' || meeting.organizerId === actorId || meeting.participantIds.includes(actorId) || (actor?.role === 'DEPARTMENT_MANAGER' && actor.departmentId === meeting.departmentId)
  if (!mayManageMeeting) { toast.error('دسترسی غیرمجاز', 'این جلسه در محدوده دسترسی شما نیست.'); return }
  const actualStatus = meetingStatusAt(meeting)
  if (actualStatus !== 'IN_PROGRESS') { toast.warning('ثبت مصوبه فقط در بازه واقعی برگزاری جلسه فعال است.'); return }
  if (!input.title.trim() || !input.assignees.length || !input.dueDate) { toast.warning('عنوان مصوبه، مسئول و مهلت انجام لازم است.'); return }

  const resolutions: MeetingResolutionView[] = input.assignees.map((assigneeId, index) => ({
    id: `dec-${Date.now()}-${index}`,
    meetingId,
    meetingTitle: meeting.title,
    title: input.title.trim(),
    description: (input.description ?? '').trim(),
    assigneeId,
    assigneeName: nameOf(assigneeId),
    createdById: actorId,
    createdByName: nameOf(actorId),
    priority: (input.priority ?? 'NORMAL') as MeetingResolutionView['priority'],
    dueDate: input.dueDate,
    status: 'PENDING' as const,
    createdAt: now(),
  }))

  commit({
    ...state,
    resolutions: [...resolutions, ...state.resolutions],
    meetingWorkspaces: {
      ...state.meetingWorkspaces,
      [meetingId]: {
        ...(state.meetingWorkspaces[meetingId] ?? { minutes: '', events: [] }),
        events: [...(state.meetingWorkspaces[meetingId]?.events ?? []), nextWorkspaceEvent(meetingId, actorId, 'مصوبه ثبت شد', `${input.title.trim()} — ${resolutions.map((item) => item.assigneeName).join('، ')}`)],
      },
    },
  })
  demoNotifyUsers(resolutions.map((item)=>item.assigneeId),'مصوبه جدید برای شما ثبت شد',`مصوبه «${input.title.trim()}» در جلسه «${meeting.title}» به شما واگذار شد.`,'MEETING',`/meetings/${meeting.id}/workspace`)
  toast.success('مصوبه ثبت شد', `${input.title.trim()} → ${resolutions.map((item) => item.assigneeName).join('، ')}`)
  return resolutions
}

/** Keeps a resolution and its delegated task in lock-step. */
export function demoUpdateResolutionStatus(principal: CapabilityPrincipal | null | undefined, resolutionId: string, status: MeetingResolutionView['status']) {
  const resolution = state.resolutions.find((item) => item.id === resolutionId)
  if (!resolution) { toast.error('پیدا نشد', 'مصوبه موردنظر در دسترس نیست.'); return false }
  if (!resolution.taskId) { toast.warning('پس از پایان جلسه و ایجاد وظیفه، وضعیت اقدام قابل تغییر است.'); return false }
  if (!allowed(principal, Capabilities.DECISION_EDIT) && !allowed(principal, Capabilities.TASK_UPDATE_SELF)) return denied(Capabilities.DECISION_EDIT)
  const principalUserId = (principal as { userId?: string } | null | undefined)?.userId
  if (!allowed(principal, Capabilities.DECISION_EDIT) && principalUserId && resolution.assigneeId !== principalUserId) return denied(Capabilities.TASK_UPDATE_SELF)
  commit({
    ...state,
    resolutions: state.resolutions.map((item) => item.id === resolutionId ? { ...item, status } : item),
    tasks: state.tasks.map((item) => item.id === resolution.taskId ? { ...item, status, overdue: status === 'OVERDUE' } : item),
  })
  toast.success('وضعیت مصوبه بروزرسانی شد', resolution.title)
  return true
}

/** Secretary/meeting editors can correct the editable resolution fields after a meeting.
    The delegated task is updated in the same commit, so both surfaces stay identical. */
export function demoUpdateResolution(principal: CapabilityPrincipal | null | undefined, resolutionId: string, patch: Partial<Pick<MeetingResolutionView, 'title' | 'description' | 'assigneeId' | 'dueDate' | 'priority'>>) {
  if (!allowed(principal, Capabilities.DECISION_EDIT) && !allowed(principal, Capabilities.DECISION_CREATE)) return denied(Capabilities.DECISION_EDIT)
  const resolution = state.resolutions.find((item) => item.id === resolutionId)
  if (!resolution) return false
  const title = patch.title?.trim() || resolution.title
  const assigneeId = patch.assigneeId || resolution.assigneeId
  const updated: MeetingResolutionView = {
    ...resolution,
    ...patch,
    title,
    assigneeId,
    assigneeName: nameOf(assigneeId),
  }
  commit({
    ...state,
    resolutions: state.resolutions.map((item) => item.id === resolutionId ? updated : item),
    tasks: state.tasks.map((item) => item.id === resolution.taskId ? {
      ...item,
      title: updated.title,
      description: updated.description,
      assigneeId: updated.assigneeId,
      assigneeName: updated.assigneeName,
      departmentId: findDemoUser(updated.assigneeId)?.departmentId ?? item.departmentId,
      departmentName: departmentNameOf(findDemoUser(updated.assigneeId)?.departmentId ?? item.departmentId),
      deadline: updated.dueDate,
      priority: updated.priority,
    } : item),
  })
  demoNotify(updated.assigneeId, 'مصوبه به‌روزرسانی شد', `اطلاعات مصوبه «${updated.title}» تغییر کرد.`, updated.taskId ? 'TASK' : 'MEETING', updated.taskId ? `/tasks/${updated.taskId}` : `/meetings/${updated.meetingId}/workspace`)
  toast.success(updated.taskId ? 'مصوبه و وظیفه مرتبط به‌روزرسانی شدند' : 'مصوبه به‌روزرسانی شد', updated.title)
  return true
}

/** Removes a resolution together with the task it delegated. */
export function demoRemoveResolution(principal: CapabilityPrincipal | null | undefined, resolutionId: string) {
  if (!allowed(principal, Capabilities.DECISION_EDIT)) return denied(Capabilities.DECISION_EDIT)
  const resolution = state.resolutions.find((item) => item.id === resolutionId)
  if (!resolution) return false
  commit({
    ...state,
    resolutions: state.resolutions.filter((item) => item.id !== resolutionId),
    tasks: state.tasks.filter((item) => item.id !== resolution.taskId),
  })
  toast.success('مصوبه حذف شد', resolution.title)
  return true
}

/** Resolutions of one meeting, newest first. */
export const demoResolutionsOfMeeting = (meetingId: string, resolutions: readonly MeetingResolutionView[]) =>
  resolutions.filter((item) => item.meetingId === meetingId)


// ---------------------------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------------------------
/** Returns notifications for a given user, newest first. */
export const demoNotificationsForUser = (userId: string, notifications: readonly NotificationRecord[]) =>
  notifications.filter((item) => item.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

/** Unread count for the header badge. */
export const demoUnreadNotificationCount = (userId: string, notifications: readonly NotificationRecord[]) =>
  notifications.filter((item) => item.userId === userId && !item.read).length

/** Mark one or more notifications as read. */
export function demoMarkNotificationsRead(notificationIds: readonly string[]) {
  if (!notificationIds.length) return
  commit({
    ...state,
    notifications: state.notifications.map((item) => notificationIds.includes(item.id) ? { ...item, read: true } : item),
  })
}

/** Mark all of a user's notifications as read. */
export function demoMarkAllNotificationsRead(userId: string) {
  commit({
    ...state,
    notifications: state.notifications.map((item) => item.userId === userId ? { ...item, read: true } : item),
  })
}

/** Creates a notification record and appends it to the store (used by demo actions). */
function demoNotify(userId: string, title: string, body: string, category: NotificationRecord['category'], link?: string) {
  const record: NotificationRecord = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    title,
    body,
    category,
    priority: 'NORMAL',
    read: false,
    createdAt: now(),
    link,
  }
  commit({ ...state, notifications: [record, ...state.notifications] })
}

/** Public event bridge for UI workflows that already commit to this store. */
export function demoNotifyUsers(userIds: readonly string[], title: string, body: string, category: NotificationRecord['category'], link?: string) {
  [...new Set(userIds)].forEach((userId) => demoNotify(userId, title, body, category, link))
}
