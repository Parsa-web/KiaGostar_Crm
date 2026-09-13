import type { Decision } from '../../../domain/entities'
import { AppError } from '../../../errors'
import { authorize, type AuthorizedPrincipal } from '../../../security'
import { Capabilities } from '../../../security/permissions'
import type { ActivityService } from '../../../services'
import type { DecisionDataRepository, MeetingDataRepository, MinutesDataRepository } from '../repositories'

export type CreateDecisionInput = Pick<Decision, 'meetingId' | 'departmentId' | 'title' | 'description'>
export class DecisionService {
  private readonly decisions: DecisionDataRepository
  private readonly minutes: MinutesDataRepository
  private readonly meetings: MeetingDataRepository
  private readonly activity: ActivityService
  constructor(decisions: DecisionDataRepository, minutes: MinutesDataRepository, meetings: MeetingDataRepository, activity: ActivityService) { this.decisions = decisions; this.minutes = minutes; this.meetings = meetings; this.activity = activity }
  async createDecision(actor: AuthorizedPrincipal, input: CreateDecisionInput) { authorize(actor, Capabilities.DECISION_CREATE); this.validate(input); const minutes = await this.minutes.findByMeeting(input.meetingId); if (minutes?.status !== 'FINAL') throw new AppError('VALIDATION_ERROR', 'تصمیم فقط پس از نهایی‌شدن صورت‌جلسه قابل ثبت است.'); const item: Decision = { ...input, id: crypto.randomUUID(), title: input.title.trim(), description: input.description.trim(), status: 'APPROVED', createdAt: new Date().toISOString() }; await this.decisions.create(item); await this.activity.record({ actorId: actor.userId, action: 'DECISION_CREATED', entityType: 'decision', entityId: item.id, after: item }); return item }
  async updateFinalDecision(actor: AuthorizedPrincipal, id: string, input: Pick<Decision, 'title' | 'description'>) { authorize(actor, Capabilities.DECISION_EDIT_FINAL); this.validate({ ...input, meetingId: 'existing', departmentId: 'existing' }); const current = await this.decisions.findById(id); if (!current) throw new AppError('NOT_FOUND', 'تصمیم پیدا نشد.'); const updated = await this.decisions.update({ ...current, title: input.title.trim(), description: input.description.trim() }); await this.activity.record({ actorId: actor.userId, action: 'DECISION_MODIFIED', entityType: 'decision', entityId: id, before: current, after: updated }); const recipients = (await this.meetings.findParticipants(current.meetingId)).map((item) => item.userId); await this.activity.notify(recipients, { title: 'تصمیم جلسه تغییر کرد', message: updated.title, priority: 'HIGH' }); return updated }
  async getMeetingDecisions(actor: AuthorizedPrincipal, meetingId: string) { authorize(actor, Capabilities.DECISION_VIEW); return this.decisions.findByMeeting(meetingId) }
  private validate(input: CreateDecisionInput) { if (!input.meetingId || !input.departmentId || !input.title.trim() || !input.description.trim()) throw new AppError('VALIDATION_ERROR', 'اطلاعات تصمیم کامل نیست.') }
}
