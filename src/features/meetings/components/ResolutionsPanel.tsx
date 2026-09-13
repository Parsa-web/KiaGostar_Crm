import { useMemo, useState } from 'react'
import { Button, DatePicker, EmptyState, Icon, MultiSelect, Select, StatusBadge, TextArea, TextField } from '../../../components/ui'

import { WorkPanel } from '../../../components/work'
import { formatPersianDate } from '../../../core/utils'
import type { MeetingResolutionView } from '../../../demo'

/**
 * «مصوبات» — resolutions taken during a live meeting.
 *
 * The manager or the secretary writes a resolution while the session is running
 * and delegates it to one or more attendees. Submitting stores the resolution;
 * the canonical store creates its matching task after the meeting ends.
 */

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'کم' },
  { value: 'NORMAL', label: 'عادی' },
  { value: 'HIGH', label: 'زیاد' },
  { value: 'CRITICAL', label: 'بحرانی' },
]

const STATUS_LABELS: Readonly<Record<MeetingResolutionView['status'], string>> = {
  PENDING: 'در انتظار اقدام', IN_PROGRESS: 'در حال انجام', COMPLETED: 'انجام‌شده', OVERDUE: 'خارج از مهلت',
}
const STATUS_TONE: Readonly<Record<MeetingResolutionView['status'], 'info' | 'warning' | 'success' | 'danger'>> = {
  PENDING: 'info', IN_PROGRESS: 'warning', COMPLETED: 'success', OVERDUE: 'danger',
}
const PRIORITY_LABELS: Readonly<Record<MeetingResolutionView['priority'], string>> = {
  LOW: 'کم', NORMAL: 'عادی', HIGH: 'زیاد', CRITICAL: 'بحرانی',
}

export interface ResolutionDraft {
  title: string
  description: string
  assignees: readonly string[]
  dueDate: string
  priority: string
}

export interface ResolutionsPanelProps {
  resolutions: readonly MeetingResolutionView[]
  /** Attendees that may receive a resolution (usually the meeting participants). */
  assigneeOptions: readonly { value: string; label: string }[]
  /** Only the organiser/secretary/manager may delegate; everyone else reads. */
  canCreate: boolean
  canEdit: boolean
  onCreate(draft: ResolutionDraft): void
  onUpdate?(resolutionId: string, draft: ResolutionDraft): void
  onStatusChange?(resolutionId: string, status: MeetingResolutionView['status']): void
  onRemove?(resolutionId: string): void
  onOpenTask?(taskId: string): void
}

const EMPTY_DRAFT: ResolutionDraft = { title: '', description: '', assignees: [], dueDate: '', priority: 'NORMAL' }

export function ResolutionsPanel({ resolutions, assigneeOptions, canCreate, canEdit, onCreate, onUpdate, onStatusChange, onRemove, onOpenTask }: ResolutionsPanelProps) {
  const [draft, setDraft] = useState<ResolutionDraft>(EMPTY_DRAFT)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()

  const done = useMemo(() => resolutions.filter((item) => item.status === 'COMPLETED').length, [resolutions])

  const submit = () => {
    if (!draft.title.trim()) { setError('عنوان مصوبه را بنویسید.'); return }
    if (!draft.assignees.length) { setError('مسئول اجرای مصوبه را انتخاب کنید.'); return }
    if (!draft.dueDate) { setError('مهلت انجام مصوبه را مشخص کنید.'); return }
    setError(undefined)
    if (editingId && onUpdate) onUpdate(editingId, draft)
    else onCreate(draft)
    setDraft(EMPTY_DRAFT)
    setEditingId(undefined)
    setOpen(false)
  }

  return <WorkPanel
    title="مصوبات جلسه"
    icon="check-square"
    count={resolutions.length}
    description="تصمیم‌های جلسه به‌همراه مسئول و مهلت اجرا؛ هر مصوبه پس از پایان جلسه به وظیفه تبدیل می‌شود."
    actions={canCreate
      ? <Button size="sm" variant={open ? 'ghost' : 'primary'} onClick={() => { setOpen((state) => !state); setEditingId(undefined); setDraft(EMPTY_DRAFT); setError(undefined) }}>
        {open ? 'انصراف' : 'ثبت مصوبه جدید'}
      </Button>
      : undefined}>

    {resolutions.length > 0 && <p className="text-muted meeting-resolutions__summary">
      {done} مصوبه از {resolutions.length} مصوبه این جلسه انجام شده است.
    </p>}

    {open && (editingId ? canEdit : canCreate) && <div className="meeting-resolutions__form">
      <TextField
        label="عنوان مصوبه"
        required
        value={draft.title}
        onChange={(event) => setDraft((state) => ({ ...state, title: event.target.value }))}
        placeholder="مثال: تهیه گزارش فروش سه‌ماهه"
      />
      <TextArea
        label="شرح اقدام"
        rows={3}
        value={draft.description}
        onChange={(event) => setDraft((state) => ({ ...state, description: event.target.value }))}
        placeholder="جزئیات کاری که باید انجام شود"
      />
      <div className="meeting-resolutions__form-row">
        <MultiSelect
          label="مسئول اجرا"
          required
          value={draft.assignees}
          options={assigneeOptions}
          onChange={(values) => setDraft((state) => ({ ...state, assignees: values }))}
          placeholder="انتخاب کارمند"
        />

        <Select
          label="اولویت"
          value={draft.priority}
          options={PRIORITY_OPTIONS}
          onChange={(value) => setDraft((state) => ({ ...state, priority: String(value) }))}
        />
        <DatePicker
          label="مهلت انجام"
          required
          value={draft.dueDate || undefined}
          onChange={(value) => setDraft((state) => ({ ...state, dueDate: value ?? '' }))}
          helperText="تاریخ بر پایه تقویم شمسی"
        />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="meeting-resolutions__form-actions">
        <Button size="sm" onClick={submit}>{editingId ? 'ذخیره تغییرات' : 'ثبت مصوبه'}</Button>
        <Button size="sm" variant="ghost" onClick={() => { setDraft(EMPTY_DRAFT); setEditingId(undefined); setOpen(false); setError(undefined) }}>انصراف</Button>
      </div>
    </div>}

    {resolutions.length === 0
      ? <EmptyState variant="inline" icon="check-square" title="هنوز مصوبه‌ای ثبت نشده است" description={canCreate ? 'با دکمه «ثبت مصوبه جدید» تصمیم‌های جلسه را واگذار کنید.' : 'ثبت مصوبه با شروع واقعی جلسه برای مدیر و منشی فعال می‌شود.'} />
      : <ul className="meeting-resolutions__list">
        {resolutions.map((resolution) => <li key={resolution.id} className="meeting-resolutions__item">
          <div className="meeting-resolutions__head">
            <strong>{resolution.title}</strong>
            <StatusBadge tone={STATUS_TONE[resolution.status]} label={STATUS_LABELS[resolution.status]} size="sm" />
          </div>
          {resolution.description && <p className="text-muted">{resolution.description}</p>}
          <p className="meeting-resolutions__meta text-muted">
            <span><Icon name="user" size="xs" /> {resolution.assigneeName}</span>
            <span><Icon name="clock" size="xs" /> مهلت: {formatPersianDate(resolution.dueDate, { dateStyle: 'medium' })}</span>
            <span><Icon name="alert" size="xs" /> {PRIORITY_LABELS[resolution.priority]}</span>

            <span><Icon name="calendar" size="xs" /> جلسه: {resolution.meetingTitle}</span>
          </p>
          <div className="meeting-resolutions__actions">
            {onUpdate && canEdit && <Button size="sm" variant="text" onClick={() => { setEditingId(resolution.id); setDraft({title:resolution.title,description:resolution.description,assignees:[resolution.assigneeId],dueDate:resolution.dueDate,priority:resolution.priority}); setOpen(true); setError(undefined) }}>ویرایش</Button>}
            {onOpenTask && resolution.taskId && <Button size="sm" variant="text" onClick={() => onOpenTask(resolution.taskId!)}>مشاهده وظیفه</Button>}
            {onStatusChange && resolution.taskId && resolution.status !== 'COMPLETED' && <Button size="sm" variant="text" onClick={() => onStatusChange(resolution.id, resolution.status === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED')}>
              {resolution.status === 'PENDING' ? 'شروع اقدام' : 'اتمام مصوبه'}
            </Button>}
            {onRemove && canEdit && <Button size="sm" variant="text" className="is-danger" onClick={() => onRemove(resolution.id)}>حذف</Button>}

          </div>
        </li>)}
      </ul>}
  </WorkPanel>
}
