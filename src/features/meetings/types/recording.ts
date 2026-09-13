/**
 * Data models for meeting audio recording and topic segmentation.
 *
 * These types are intentionally separated from UI components so they can be
 * reused by storage, service, and presentation layers without coupling.
 */

/** Master audio recording metadata stored alongside the audio blob. */
export interface MeetingRecording {
  id: string
  meetingId: string
  mimeType: string
  durationMs: number
  startedAt: string
  endedAt?: string
  blob: Blob
}

/** Time range of a single topic inside the master recording. */
export interface TopicSegment {
  id: string
  meetingId: string
  topicId: string
  startMs: number
  endMs: number
  durationMs: number
}

/** Runtime state of a topic while the meeting is in progress. */
export interface ActiveTopicState {
  topicId: string
  startMs: number
}
