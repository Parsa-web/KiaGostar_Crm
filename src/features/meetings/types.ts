import type { Meeting, Minutes } from '../../domain/entities'

export type CreateMeetingInput = Pick<Meeting, 'title' | 'description' | 'startTime' | 'endTime'>
export type UpdateMeetingInput = Partial<CreateMeetingInput>
export interface MeetingFilters { search?: string; status?: Meeting['status']; date?: string }
export type CreateMinutesInput = Pick<Minutes, 'meetingId' | 'content'>

/** Stored master audio recording of a meeting (IndexedDB record). */
export interface MeetingRecording {
  /** Storage key, always `rec-${meetingId}`. */
  id: string
  meetingId: string
  mimeType: string
  durationMs: number
  startedAt: string
  endedAt: string
  blob: Blob
}

/** A time range of the master recording that belongs to one agenda topic. */
export interface TopicSegment {
  /** Storage key, always `seg-${meetingId}-${topicId}`. */
  id: string
  meetingId: string
  topicId: string
  startMs: number
  endMs: number
  durationMs: number
}

/** The topic currently being discussed while recording is running. */
export interface ActiveTopicState {
  topicId: string
  startMs: number
}
