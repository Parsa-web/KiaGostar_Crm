import type { Meeting } from '../../../domain/entities'
import { AppError } from '../../../errors'
import { authorize, type AuthorizedPrincipal } from '../../../security'
import { Capabilities } from '../../../security/permissions'
import type { ActivityService } from '../../../services'
import type { MeetingDataRepository } from '../repositories'
import type { CreateMeetingInput, MeetingFilters, UpdateMeetingInput } from '../types'

export class MeetingService {
  private readonly meetings: MeetingDataRepository
  private readonly activity: ActivityService
  constructor(meetings: MeetingDataRepository, activity: ActivityService) { this.meetings = meetings; this.activity = activity }
  async createMeeting(actor: AuthorizedPrincipal, input: CreateMeetingInput, participantIds: readonly string[] = []) {
    authorize(actor, Capabilities.MEETING_CREATE); this.validate(input)
    if (actor.roles.includes('EMPLOYEE')) throw new AppError('PERMISSION_ERROR', 'کارمند اجازه ایجاد جلسه ندارد.')
    const meeting: Meeting = { ...input, id: crypto.randomUUID(), title: input.title.trim(), createdBy: actor.userId, status: 'SCHEDULED', createdAt: new Date().toISOString() }
    await this.meetings.create(meeting)
    await Promise.all([...new Set(participantIds)].map((userId) => this.meetings.addParticipant({ id: crypto.randomUUID(), meetingId: meeting.id, userId })))
    await this.activity.record({ actorId: actor.userId, action: 'MEETING_CREATED', entityType: 'meeting', entityId: meeting.id, after: meeting })
    await this.activity.notify(participantIds, { title: 'جلسه جدید', message: meeting.title, priority: 'NORMAL' })
    return meeting
  }
  async updateMeeting(actor: AuthorizedPrincipal, id: string, input: UpdateMeetingInput) { authorize(actor, Capabilities.MEETING_MANAGE); const current = await this.require(id); if (current.status === 'COMPLETED' || current.status === 'CANCELLED') throw new AppError('VALIDATION_ERROR', 'جلسه پایان‌یافته قابل ویرایش نیست.'); this.validate({ ...current, ...input }); const updated = await this.meetings.update({ ...current, ...input, title: input.title?.trim() ?? current.title }); await this.auditChange(actor, 'MEETING_UPDATED', current, updated); await this.notifyParticipants(id, 'جلسه ویرایش شد', updated.title); return updated }
  async getMeeting(actor: AuthorizedPrincipal, id: string) { authorize(actor, Capabilities.MEETING_VIEW); const meeting = await this.require(id); if (!(await this.canView(actor, meeting))) throw new AppError('ACCESS_DENIED', 'اجازه مشاهده این جلسه را ندارید.'); return meeting }
  async getMeetings(actor: AuthorizedPrincipal, filters: MeetingFilters = {}) { authorize(actor, Capabilities.MEETING_VIEW); const all = await this.meetings.findAll(); const visible = actor.roles.includes('MAIN_MANAGER') ? all : (await Promise.all(all.map(async (item) => (await this.canView(actor, item)) ? item : null))).filter((item) => item !== null); const search = filters.search?.trim().toLocaleLowerCase('fa'); return visible.filter((item) => (!search || item.title.toLocaleLowerCase('fa').includes(search)) && (!filters.status || item.status === filters.status) && (!filters.date || item.startTime.startsWith(filters.date))) }
  async addParticipant(actor: AuthorizedPrincipal, meetingId: string, userId: string) { authorize(actor, Capabilities.MEETING_MANAGE); await this.require(meetingId); const existing = await this.meetings.findParticipants(meetingId); if (existing.some((item) => item.userId === userId)) return existing.find((item) => item.userId === userId)!; const item = await this.meetings.addParticipant({ id: crypto.randomUUID(), meetingId, userId }); await this.activity.notify([userId], { title: 'دعوت به جلسه', message: 'شما به یک جلسه افزوده شدید.', priority: 'NORMAL' }); return item }
  async removeParticipant(actor: AuthorizedPrincipal, meetingId: string, userId: string) { authorize(actor, Capabilities.MEETING_MANAGE); await this.require(meetingId); await this.meetings.removeParticipant(meetingId, userId) }
  async startMeeting(actor: AuthorizedPrincipal, id: string) { return this.transition(actor, id, ['DRAFT', 'SCHEDULED'], 'IN_PROGRESS') }
  async completeMeeting(actor: AuthorizedPrincipal, id: string) { return this.transition(actor, id, ['IN_PROGRESS'], 'COMPLETED') }
  async cancelMeeting(actor: AuthorizedPrincipal, id: string) { const result = await this.transition(actor, id, ['DRAFT', 'SCHEDULED', 'IN_PROGRESS'], 'CANCELLED'); await this.notifyParticipants(id, 'جلسه لغو شد', result.title); return result }
  async sendReminder(actor: AuthorizedPrincipal, id: string) { authorize(actor, Capabilities.MEETING_MANAGE); const meeting = await this.require(id); if (meeting.status !== 'SCHEDULED') throw new AppError('VALIDATION_ERROR', 'یادآوری فقط برای جلسه زمان‌بندی‌شده ارسال می‌شود.'); await this.notifyParticipants(id, 'یادآوری جلسه', meeting.title) }
  private async transition(actor: AuthorizedPrincipal, id: string, from: readonly Meeting['status'][], status: Meeting['status']) { authorize(actor, Capabilities.MEETING_MANAGE); const item = await this.require(id); if (!from.includes(item.status)) throw new AppError('VALIDATION_ERROR', 'تغییر وضعیت جلسه مجاز نیست.'); const updated = await this.meetings.update({ ...item, status }); await this.auditChange(actor, `MEETING_${status}`, item, updated); return updated }
  private validate(input: Pick<Meeting, 'title' | 'startTime' | 'endTime'>) { if (!input.title.trim() || !input.startTime) throw new AppError('VALIDATION_ERROR', 'عنوان و زمان شروع جلسه الزامی است.'); if (input.endTime && Date.parse(input.endTime) <= Date.parse(input.startTime)) throw new AppError('VALIDATION_ERROR', 'زمان پایان باید پس از شروع باشد.') }
  private async require(id: string) { const item = await this.meetings.findById(id); if (!item) throw new AppError('NOT_FOUND', 'جلسه پیدا نشد.'); return item }
  private async canView(actor: AuthorizedPrincipal, meeting: Meeting) { if (meeting.createdBy === actor.userId) return true; return (await this.meetings.findParticipants(meeting.id)).some((item) => item.userId === actor.userId) }
  private async notifyParticipants(id: string, title: string, message: string) { const users = (await this.meetings.findParticipants(id)).map((item) => item.userId); await this.activity.notify(users, { title, message, priority: 'NORMAL' }) }
  private async auditChange(actor: AuthorizedPrincipal, action: string, before: Meeting, after: Meeting) { await this.activity.record({ actorId: actor.userId, action, entityType: 'meeting', entityId: after.id, before, after }) }
}
