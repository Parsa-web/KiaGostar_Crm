import type { Decision, Meeting, MeetingParticipant, Minutes } from '../../../domain/entities'
import type { DecisionDataRepository, MeetingDataRepository, MinutesDataRepository } from './contracts'

export class InMemoryMeetingRepository implements MeetingDataRepository {
  private readonly meetings = new Map<string, Meeting>()
  private readonly participants = new Map<string, MeetingParticipant>()
  async create(item: Meeting) { this.meetings.set(item.id, structuredClone(item)); return item }
  async update(item: Meeting) { this.meetings.set(item.id, structuredClone(item)); return item }
  async findById(id: string) { return this.meetings.get(id) ?? null }
  async findAll() { return [...this.meetings.values()] }
  async addParticipant(item: MeetingParticipant) { this.participants.set(item.id, structuredClone(item)); return item }
  async removeParticipant(meetingId: string, userId: string) { for (const [id, item] of this.participants) if (item.meetingId === meetingId && item.userId === userId) this.participants.delete(id) }
  async findParticipants(meetingId: string) { return [...this.participants.values()].filter((item) => item.meetingId === meetingId) }
}
export class InMemoryMinutesRepository implements MinutesDataRepository {
  private readonly records = new Map<string, Minutes>()
  async create(item: Minutes) { this.records.set(item.meetingId, structuredClone(item)); return item }
  async update(item: Minutes) { this.records.set(item.meetingId, structuredClone(item)); return item }
  async findByMeeting(meetingId: string) { return this.records.get(meetingId) ?? null }
}
export class InMemoryDecisionRepository implements DecisionDataRepository {
  private readonly records = new Map<string, Decision>()
  async create(item: Decision) { this.records.set(item.id, structuredClone(item)); return item }
  async update(item: Decision) { this.records.set(item.id, structuredClone(item)); return item }
  async findById(id: string) { return this.records.get(id) ?? null }
  async findByMeeting(meetingId: string) { return [...this.records.values()].filter((item) => item.meetingId === meetingId) }
}
