import type { Decision, Meeting, MeetingParticipant, Minutes } from '../../../domain/entities'

export interface MeetingDataRepository {
  create(meeting: Meeting): Promise<Meeting>
  update(meeting: Meeting): Promise<Meeting>
  findById(id: string): Promise<Meeting | null>
  findAll(): Promise<readonly Meeting[]>
  addParticipant(participant: MeetingParticipant): Promise<MeetingParticipant>
  removeParticipant(meetingId: string, userId: string): Promise<void>
  findParticipants(meetingId: string): Promise<readonly MeetingParticipant[]>
}
export interface MinutesDataRepository {
  create(minutes: Minutes): Promise<Minutes>
  update(minutes: Minutes): Promise<Minutes>
  findByMeeting(meetingId: string): Promise<Minutes | null>
}
export interface DecisionDataRepository {
  create(decision: Decision): Promise<Decision>
  update(decision: Decision): Promise<Decision>
  findById(id: string): Promise<Decision | null>
  findByMeeting(meetingId: string): Promise<readonly Decision[]>
}
