/**
 * MeetingTopicsPanel — displays meeting topics with active topic selection
 * during the meeting and audio playback by time range after the meeting.
 *
 * After-meeting playback uses the shared AudioPlayer component that
 * delegates to useAudioEngine.  All topics share the same master audio
 * URL; each topic plays a [startMs, endMs] segment of it.
 */

import { memo, useCallback } from 'react'
import { EmptyState, StatusBadge } from '../../../components/ui'
import { WorkPanel } from '../../../components/work'
import { formatRecordingTime } from '../hooks/useMasterRecording'
import { AudioPlayer } from './AudioPlayer'
import type { TopicSegment } from '../types'

/** Pre-existing agenda item from the demo store. */
export interface TopicItem {
  id: string
  title: string
  order: number
  description?: string
  durationMinutes: number
}

/* ------------------------------------------------------------------ */
/*  During-meeting: topic list with active selection                   */
/* ------------------------------------------------------------------ */

export interface MeetingTopicsPanelProps {
  topics: readonly TopicItem[]
  /** Segments recorded so far (may be partial during the meeting). */
  segments: readonly TopicSegment[]
  /** ID of the currently active topic, if any. */
  activeTopicId?: string
  /** Whether recording is running. */
  recording: boolean
  /** Can the user manage topics (secretary/manager). */
  canManage: boolean
  /** Select or start a topic. */
  onSelectTopic(topicId: string): void
}

export function MeetingTopicsPanel({
  topics,
  segments,
  activeTopicId,
  recording,
  canManage,
  onSelectTopic,
}: MeetingTopicsPanelProps) {
  const getSegment = useCallback(
    (topicId: string) => segments.find(s => s.topicId === topicId),
    [segments],
  )

  return (
    <WorkPanel
      title="موضوعات جلسه"
      icon="workflow"
      count={topics.length}
      description="موضوعات از قبل تعریف شده‌اند. با انتخاب هر موضوع، زمان شروع و پایان آن ثبت می‌شود."
    >
      {topics.length === 0 ? (
        <EmptyState
          variant="inline"
          icon="workflow"
          title="موضوعی تعریف نشده است"
          description="موضوعات جلسه هنگام ایجاد جلسه ثبت می‌شوند."
        />
      ) : (
        <ul className="meeting-topics__list">
          {topics.map((topic, index) => {
            const segment = getSegment(topic.id)
            const isActive = activeTopicId === topic.id
            return (
              <li
                key={topic.id}
                className={`meeting-topics__item${isActive ? ' meeting-topics__item--active' : ''}${segment ? ' meeting-topics__item--done' : ''}`}
              >
                <div className="meeting-topics__head">
                  <span className="meeting-topics__order">{index + 1}</span>
                  <span className="meeting-topics__title">{topic.title}</span>
                  {isActive && <StatusBadge tone="success" label="فعال" size="sm" />}
                  {segment && !isActive && (
                    <StatusBadge tone="info" label="ثبت‌شده" size="sm" />
                  )}
                </div>
                {segment && (
                  <span className="meeting-topics__time" dir="ltr">
                    {formatRecordingTime(segment.startMs)} → {formatRecordingTime(segment.endMs)}
                  </span>
                )}
                {canManage && recording && !segment && (
                  <button
                    type="button"
                    className="btn btn--sm btn--secondary"
                    onClick={() => onSelectTopic(topic.id)}
                    disabled={isActive}
                  >
                    {isActive ? 'در حال بررسی' : 'انتخاب موضوع'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </WorkPanel>
  )
}

/* ------------------------------------------------------------------ */
/*  After-meeting: topic audio playback using shared AudioPlayer       */
/* ------------------------------------------------------------------ */

export interface TopicPlaybackPanelProps {
  topics: readonly TopicItem[]
  segments: readonly TopicSegment[]
  masterAudioUrl: string | null
}

export const TopicPlaybackPanel = memo(function TopicPlaybackPanel({
  topics,
  segments,
  masterAudioUrl,
}: TopicPlaybackPanelProps) {
  if (!masterAudioUrl || segments.length === 0) return null

  return (
    <WorkPanel
      title="پخش صوتی موضوعات"
      icon="workflow"
      count={segments.length}
      description="هر موضوع فقط بخشی از فایل صوتی اصلی است."
    >
      <ul className="meeting-topics__playback-list">
        {segments.map((segment) => {
          const topic = topics.find(t => t.id === segment.topicId)
          const title = topic?.title ?? 'سایر موارد'
          return (
            <li key={segment.id} className="meeting-topics__playback-item">
              <AudioPlayer
                src={masterAudioUrl}
                label={title}
                startSec={segment.startMs / 1000}
                endSec={segment.endMs / 1000}
              />
            </li>
          )
        })}
      </ul>
    </WorkPanel>
  )
})
