import type { Minutes } from '../../../domain/entities'
import { AppError } from '../../../errors'
import { authorize, can, type AuthorizedPrincipal } from '../../../security'
import { Capabilities } from '../../../security/permissions'
import type { ActivityService } from '../../../services'
import type { MeetingDataRepository, MinutesDataRepository } from '../repositories'
import type { CreateMinutesInput } from '../types'

export class MinutesService {
  private readonly minutes: MinutesDataRepository
  private readonly meetings: MeetingDataRepository
  private readonly activity: ActivityService
  constructor(minutes: MinutesDataRepository, meetings: MeetingDataRepository, activity: ActivityService) { this.minutes = minutes; this.meetings = meetings; this.activity = activity }
  async createMinutes(actor: AuthorizedPrincipal, input: CreateMinutesInput) { authorize(actor, Capabilities.MINUTES_CREATE); this.validate(input.content); if (!await this.meetings.findById(input.meetingId)) throw new AppError('NOT_FOUND', 'جلسه پیدا نشد.'); if (await this.minutes.findByMeeting(input.meetingId)) throw new AppError('VALIDATION_ERROR', 'صورت‌جلسه قبلاً ایجاد شده است.'); const item: Minutes = { id: crypto.randomUUID(), meetingId: input.meetingId, content: input.content.trim(), status: 'DRAFT', createdBy: actor.userId, createdAt: new Date().toISOString() }; await this.minutes.create(item); await this.activity.record({ actorId: actor.userId, action: 'MINUTES_CREATED', entityType: 'minutes', entityId: item.id, after: item }); return item }
  async updateMinutes(actor: AuthorizedPrincipal, meetingId: string, content: string) { const current = await this.require(meetingId); const capability = current.status === 'FINAL' ? Capabilities.MINUTES_EDIT_FINAL : Capabilities.MINUTES_EDIT; authorize(actor, capability); this.validate(content); const updated = await this.minutes.update({ ...current, content: content.trim() }); await this.activity.record({ actorId: actor.userId, action: current.status === 'FINAL' ? 'MINUTES_EDITED_AFTER_FINALIZATION' : 'MINUTES_UPDATED', entityType: 'minutes', entityId: current.id, before: current, after: updated }); if (current.status === 'FINAL') await this.notifyParticipants(meetingId, 'صورت‌جلسه نهایی ویرایش شد'); return updated }
  async finalizeMinutes(actor: AuthorizedPrincipal, meetingId: string) { authorize(actor, Capabilities.MINUTES_FINALIZE); const current = await this.require(meetingId); if (current.status === 'FINAL') return current; const updated = await this.minutes.update({ ...current, status: 'FINAL' }); await this.activity.record({ actorId: actor.userId, action: 'MINUTES_FINALIZED', entityType: 'minutes', entityId: current.id, before: current, after: updated }); await this.notifyParticipants(meetingId, 'صورت‌جلسه نهایی شد'); return updated }
  async getMinutes(actor: AuthorizedPrincipal, meetingId: string) { if (!can(actor, Capabilities.MEETING_VIEW) && !can(actor, Capabilities.MINUTES_EDIT)) throw new AppError('PERMISSION_ERROR', 'مجوز مشاهده صورت‌جلسه را ندارید.'); return this.require(meetingId) }
  private validate(content: string) { if (!content.trim()) throw new AppError('VALIDATION_ERROR', 'متن صورت‌جلسه الزامی است.') }
  private async require(meetingId: string) { const item = await this.minutes.findByMeeting(meetingId); if (!item) throw new AppError('NOT_FOUND', 'صورت‌جلسه پیدا نشد.'); return item }
  private async notifyParticipants(meetingId: string, title: string) { const ids = (await this.meetings.findParticipants(meetingId)).map((item) => item.userId); await this.activity.notify(ids, { title, message: 'برای مشاهده جزئیات به سامانه مراجعه کنید.', priority: 'HIGH' }) }
}
