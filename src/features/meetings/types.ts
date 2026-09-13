import type { Meeting, Minutes } from '../../domain/entities'

export type CreateMeetingInput = Pick<Meeting, 'title' | 'description' | 'startTime' | 'endTime'>
export type UpdateMeetingInput = Partial<CreateMeetingInput>
export interface MeetingFilters { search?: string; status?: Meeting['status']; date?: string }
export type CreateMinutesInput = Pick<Minutes, 'meetingId' | 'content'>
