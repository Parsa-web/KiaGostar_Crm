import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, EmptyState, Icon, StatusBadge } from '../../../components/ui'
import { WorkPanel } from '../../../components/work'
import { ConfirmDialog } from '../../../components/ui'
import { formatPersianDate } from '../../../core/utils'
import {
  demoCreateResolution, demoFinishMeeting, demoRemoveResolution, demoStartMeeting,
  demoUpdateResolution, demoUpdateResolutionStatus, demoSyncSchedule,
  meetingParticipants, meetingStatusAt,
  meetingStatusLabels, useDemoState, userOptions,
  type MeetingView,
} from '../../../demo'

import type { AuthorizedPrincipal } from '../../../security/accessControl'
import { Capabilities } from '../../../security/permissions'
import { can } from '../../../security/can'
import { MeetingDraftStorage } from '../hooks'
import { ResolutionsPanel, type ResolutionDraft } from '../components'
import { MeetingTopicsPanel, TopicPlaybackPanel } from '../components/MeetingTopicsPanel'
import { RecordingStatusPanel } from '../components/RecordingStatusPanel'
import { TranscriptPlaceholder } from '../components/TranscriptPlaceholder'
import { AudioPlayer } from '../components/AudioPlayer'
import { useMasterRecording } from '../hooks/useMasterRecording'
import type { TopicSegment, ActiveTopicState } from '../types'
import * as AudioRepo from '../repositories/meetingAudioRepository'
import { meetingStatusTone } from '../components/meetingTokens'

const JOIN_WINDOW_BEFORE_MS = 15 * 60 * 1000

const nowWithinWindow = (meeting: MeetingView) => {
  const now = Date.now()
  return now >= new Date(meeting.startTime).getTime() - JOIN_WINDOW_BEFORE_MS && now <= new Date(meeting.endTime).getTime()
}
const canStartMeetingNow = (meeting: MeetingView) => Date.now() >= new Date(meeting.startTime).getTime() && Date.now() <= new Date(meeting.endTime).getTime()

export interface LiveMeetingWorkspacePageProps {
  meeting: MeetingView
  auth: AuthorizedPrincipal
  onExit(): void
  onNotifications?(participantIds: readonly string[], input: { title: string; description: string }): void
  onAudit?(action: string, before?: unknown, after?: unknown): void
  onOpenTask?(taskId: string): void
}

export function LiveMeetingWorkspacePage({ meeting, auth, onExit, onNotifications, onAudit, onOpenTask }: LiveMeetingWorkspacePageProps) {
  const store = useDemoState()

  /* ---- Draft storage (for persistence of in-progress notes) ---- */
  const draftStorage = useMemo(() => new MeetingDraftStorage(meeting.id), [meeting.id])
  const participants = useMemo(() => meetingParticipants(meeting.id), [meeting.id])
  const isSecretaryOnMeeting = useMemo(() => auth.roles.includes('SECRETARY') || participants.some((p) => p.userId === auth.userId && p.role === 'SECRETARY'), [participants, auth.roles, auth.userId])
  const isManager = useMemo(() => auth.roles.includes('MAIN_MANAGER') || auth.roles.includes('DEPARTMENT_MANAGER'), [auth.roles])
  const canManage = isSecretaryOnMeeting || isManager || can(auth, Capabilities.MEETING_MANAGE)
  const actualStatus = meetingStatusAt(meeting)

  /* ---- Topics from agenda (read from the reactive store, not the static seed) ---- */
  const agendaTopics = useMemo(() =>
    store.meetingAgendaItems
      .filter((item) => item.meetingId === meeting.id)
      .slice()
      .sort((a, b) => a.order - b.order),
    [store.meetingAgendaItems, meeting.id],
  )

  /* ---- Master recording ---- */
  const recording = useMasterRecording()

  /* ---- Topic state ---- */
  const [activeTopic, setActiveTopic] = useState<ActiveTopicState | null>(null)
  const [topicSegments, setTopicSegments] = useState<readonly TopicSegment[]>([])

  /* ---- Saved recording / segments (loaded from IndexedDB) ---- */
  const [savedRecording, setSavedRecording] = useState<Blob | null>(null)
  const [savedSegments, setSavedSegments] = useState<readonly TopicSegment[]>([])
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  /* ---- UI state ---- */
  const [joined, setJoined] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const audioUrlRef = useRef<string | null>(null)
  /** Pending save data — set when End Meeting is confirmed, consumed by the
   *  effect that watches `recording.blob` after the recorder stops. */
  const pendingSaveRef = useRef<{ segments: readonly TopicSegment[]; elapsedMs: number } | null>(null)

  const ready = Boolean(actualStatus === 'IN_PROGRESS' || (actualStatus === 'COMPLETED' && (isSecretaryOnMeeting || isManager)) || (nowWithinWindow(meeting) && actualStatus !== 'CANCELLED' && actualStatus !== 'REJECTED'))
  const denied = !meeting.participantIds.includes(auth.userId) && !participants.some((p) => p.userId === auth.userId) && !isManager && !isSecretaryOnMeeting
  const statusLabel = meetingStatusLabels[meeting.status]

  /* ---- Cleanup audio URL on unmount ---- */
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) { URL.revokeObjectURL(audioUrlRef.current); audioUrlRef.current = null }
    }
  }, [])

  /* ---- Save recording to IndexedDB after stop completes ---- */
  useEffect(() => {
    if (recording.status !== 'completed' || !pendingSaveRef.current) return
    const { segments, elapsedMs } = pendingSaveRef.current
    pendingSaveRef.current = null

    const blob = recording.blob
    console.log('[WS] Save effect — blob:', blob ? `${blob.size} bytes` : 'NULL')

    if (!blob || blob.size === 0) {
      console.warn('[WS] Blob is null or empty — nothing to save')
      return
    }

    // 1. Immediately set audioUrl from the in-memory blob so the player
    //    works even if IndexedDB save fails.
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    const url = URL.createObjectURL(blob)
    audioUrlRef.current = url
    setAudioUrl(url)
    setSavedRecording(blob)
    console.log('[WS] audioUrl set from in-memory blob')

    // 2. Persist to IndexedDB for recovery after page refresh.
    ;(async () => {
      try {
        const saved = await AudioRepo.saveRecording({
          id: `rec-${meeting.id}`,
          meetingId: meeting.id,
          mimeType: blob.type,
          durationMs: elapsedMs,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          blob,
        })
        console.log('[WS] IndexedDB saveRecording:', saved ? 'SUCCESS' : 'FAILED')
        if (saved) {
          // Verify with a round-trip read
          const verified = await AudioRepo.getRecording(meeting.id)
          console.log('[WS] IndexedDB verify getRecording:', verified ? `found (${verified.blob.size} bytes)` : 'NOT FOUND')
        }
      } catch (err) {
        console.error('[WS] IndexedDB save error:', err)
      }
    })()

    if (segments.length > 0) {
      AudioRepo.saveTopicSegments(segments).then(() => {
        setSavedSegments(segments)
        setTopicSegments(segments)
        console.log('[WS] Topic segments saved:', segments.length)
      }).catch(() => { /* noop */ })
    }
  }, [recording.status, recording.blob, meeting.id])

  /* ---- Load saved recording from IndexedDB on mount (for completed meetings) ---- */
  useEffect(() => {
    if (actualStatus !== 'COMPLETED') return
    let cancelled = false
    async function loadSaved() {
      try {
        const [rec, segs] = await Promise.all([
          AudioRepo.getRecording(meeting.id),
          AudioRepo.getTopicSegments(meeting.id),
        ])
        if (cancelled) return
        if (rec?.blob) {
          setSavedRecording(rec.blob)
          if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
          const url = URL.createObjectURL(rec.blob)
          audioUrlRef.current = url
          setAudioUrl(url)
        }
        if (segs.length) setSavedSegments(segs)
      } catch {
        // Storage failure — gracefully degrade
      }
    }
    loadSaved()
    return () => { cancelled = true }
  }, [meeting.id, actualStatus])

  /* ---- Start meeting handler ---- */
  const handleStart = useCallback(async () => {
    const canStart = canManage && (meeting.status === 'SCHEDULED' || meeting.status === 'APPROVED') && canStartMeetingNow(meeting)
    if (!canStart) return
    const ok = demoStartMeeting(meeting.id, auth.userId)
    if (!ok) return

    // Start recording (requests mic permission)
    await recording.start()

    const ids = meeting.participantIds
    onNotifications?.(ids, { title: 'جلسه آغاز شد', description: `میز کار زنده «${meeting.title}» فعال شد.` })
    onAudit?.('MEETING_STARTED', { meetingId: meeting.id, status: 'SCHEDULED' }, { meetingId: meeting.id, status: 'IN_PROGRESS' })
  }, [meeting, auth.userId, canManage, recording, onNotifications, onAudit])

  /* ---- Select / switch topic ---- */
  const handleSelectTopic = useCallback((topicId: string) => {
    if (recording.status !== 'recording') return
    // Close the previous active topic
    if (activeTopic) {
      const seg: TopicSegment = {
        id: `seg-${meeting.id}-${activeTopic.topicId}`,
        meetingId: meeting.id,
        topicId: activeTopic.topicId,
        startMs: activeTopic.startMs,
        endMs: recording.elapsedMs,
        durationMs: recording.elapsedMs - activeTopic.startMs,
      }
      if (seg.durationMs > 0) {
        setTopicSegments(prev => {
          const filtered = prev.filter(s => s.topicId !== activeTopic.topicId)
          return [...filtered, seg].sort((a, b) => a.startMs - b.startMs)
        })
      }
    }
    // Start new topic
    setActiveTopic({ topicId, startMs: recording.elapsedMs })
  }, [activeTopic, recording.status, recording.elapsedMs, meeting.id])

  /* ---- End meeting handler ---- */
  const handleFinish = useCallback(() => {
    const currentElapsed = recording.elapsedMs

    // 1. Close active topic
    let finalSegments: TopicSegment[]
    if (activeTopic) {
      const seg: TopicSegment = {
        id: `seg-${meeting.id}-${activeTopic.topicId}`,
        meetingId: meeting.id,
        topicId: activeTopic.topicId,
        startMs: activeTopic.startMs,
        endMs: currentElapsed,
        durationMs: currentElapsed - activeTopic.startMs,
      }
      finalSegments = [...topicSegments, seg].filter(s => s.durationMs > 0).sort((a, b) => a.startMs - b.startMs)
      setActiveTopic(null)
    } else {
      finalSegments = topicSegments.filter(s => s.durationMs > 0)
    }

    console.log('[WS] handleFinish — recording.status:', recording.status, 'blob:', recording.blob?.size, 'segments:', finalSegments.length)

    // 2. Handle recording based on current state
    if (recording.status === 'recording' || recording.status === 'paused') {
      // Recording is still running → stop it. The save effect will fire
      // when onstop sets the blob and status to 'completed'.
      pendingSaveRef.current = { segments: finalSegments, elapsedMs: currentElapsed }
      recording.stop()
      console.log('[WS] stop() called — save effect will fire on onstop')
    } else if (recording.blob && recording.blob.size > 0) {
      // Recording was already stopped (blob exists in memory) → save directly.
      console.log('[WS] Recording already stopped — saving existing blob directly')
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
      const url = URL.createObjectURL(recording.blob)
      audioUrlRef.current = url
      setAudioUrl(url)
      setSavedRecording(recording.blob)
      AudioRepo.saveRecording({
        id: `rec-${meeting.id}`,
        meetingId: meeting.id,
        mimeType: recording.blob.type,
        durationMs: currentElapsed,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        blob: recording.blob,
      }).catch(() => { /* noop */ })
      if (finalSegments.length > 0) {
        AudioRepo.saveTopicSegments(finalSegments).catch(() => { /* noop */ })
      }
    } else {
      // No recording or empty blob — save segments only
      console.log('[WS] No recording blob — saving segments only')
      if (finalSegments.length > 0) {
        AudioRepo.saveTopicSegments(finalSegments).catch(() => { /* noop */ })
      }
    }

    // 3. Mark meeting as finished
    const ok = demoFinishMeeting(meeting.id, auth.userId, '')
    if (!ok) {
      console.warn('[WS] demoFinishMeeting failed — recording was still saved if available')
    }

    draftStorage.clear()

    const ids = meeting.participantIds
    onNotifications?.(ids, { title: 'جلسه به پایان رسید', description: `جلسه «${meeting.title}» پایان یافت.` })
    onAudit?.('MEETING_FINISHED', { meetingId: meeting.id, status: 'IN_PROGRESS' }, { meetingId: meeting.id, status: 'COMPLETED' })
    setConfirmFinish(false)
  }, [activeTopic, topicSegments, recording, meeting, auth.userId, draftStorage, onNotifications, onAudit])

  /* ---- Resolutions ---- */
  const resolutions = useMemo(() => store.resolutions.filter((item) => item.meetingId === meeting.id), [store.resolutions, meeting.id])
  const assigneeOptions = useMemo(() => userOptions, [])
  const hasResolutionPermission = can(auth, Capabilities.DECISION_CREATE) || can(auth, Capabilities.DECISION_EDIT) || can(auth, Capabilities.DECISION_EDIT_FINAL)
  const canCreateResolutions = canManage && hasResolutionPermission && actualStatus === 'IN_PROGRESS'
  const canEditResolutions = canManage && hasResolutionPermission && (actualStatus === 'IN_PROGRESS' || actualStatus === 'COMPLETED')

  const handleCreateResolution = (draft: ResolutionDraft) => {
    const created = demoCreateResolution(auth, meeting.id, auth.userId, {
      title: draft.title, description: draft.description,
      assignees: draft.assignees, dueDate: draft.dueDate, priority: draft.priority,
    })
    if (!Array.isArray(created) || !created.length) return
    onNotifications?.(draft.assignees, { title: 'مصوبه جدید ثبت شد', description: `«${draft.title}» در جلسه «${meeting.title}» ثبت شد.` })
    onAudit?.('MEETING_RESOLUTION_CREATED', undefined, { meetingId: meeting.id, title: draft.title, assignees: draft.assignees })
  }

  /* ---- Determine which segments to show (during or after meeting) ---- */
  const displaySegments = actualStatus === 'COMPLETED'
    ? (savedSegments.length > 0 ? savedSegments : topicSegments)
    : topicSegments

  return <div className="meeting-live">
    <LiveMeetingHeader meeting={meeting} statusLabel={statusLabel} onExit={onExit} onStart={canManage && (meeting.status === 'SCHEDULED' || meeting.status === 'APPROVED') && canStartMeetingNow(meeting) ? handleStart : undefined} onFinish={canManage && meeting.status === 'IN_PROGRESS' ? () => setConfirmFinish(true) : undefined} />
    {meeting.status !== 'IN_PROGRESS' && meeting.status !== 'COMPLETED' && <LiveTimeBoard meeting={meeting} />}
    {!joined ? (
      <JoinGate ready={ready && !denied} denied={denied} onJoin={() => setJoined(true)} meeting={meeting} />
    ) : (
      <div className="meeting-live__layout">
        <section className="meeting-live__main">
          {/* ---- DURING MEETING ---- */}
          {actualStatus === 'IN_PROGRESS' && (
            <>
              {/* Recording Status */}
              <RecordingStatusPanel
                status={recording.status}
                elapsedMs={recording.elapsedMs}
                error={recording.error}
                canStart={recording.status === 'idle'}
                canPause={recording.status === 'recording'}
                canResume={recording.status === 'paused'}
                canStop={recording.status === 'recording' || recording.status === 'paused'}
                onStart={async () => { await recording.start() }}
                onPause={recording.pause}
                onResume={recording.resume}
                onStop={recording.stop}
              />

              {/* Topics Panel */}
              <MeetingTopicsPanel
                topics={agendaTopics}
                segments={topicSegments}
                activeTopicId={activeTopic?.topicId}
                recording={recording.status === 'recording'}
                canManage={canManage}
                onSelectTopic={handleSelectTopic}
              />

              {/* Resolutions */}
              <ResolutionsPanel
                resolutions={resolutions}
                assigneeOptions={assigneeOptions}
                canCreate={canCreateResolutions}
                canEdit={canEditResolutions}
                onCreate={handleCreateResolution}
                onUpdate={(id, draft) => demoUpdateResolution(auth, id, { title: draft.title, description: draft.description, assigneeId: draft.assignees[0], dueDate: draft.dueDate, priority: draft.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' })}
                onStatusChange={(id, status) => demoUpdateResolutionStatus(auth, id, status)}
                onRemove={canEditResolutions ? (id) => demoRemoveResolution(auth, id) : undefined}
                onOpenTask={onOpenTask}
              />
            </>
          )}

          {/* ---- AFTER MEETING ---- */}
          {actualStatus === 'COMPLETED' && (
            <>
              {/* Meeting Audio — always visible for diagnosis */}
              <WorkPanel
                title="صدای جلسه"
                icon="report"
                description="فایل صوتی کامل جلسه"
              >
                {audioUrl ? (
                  <>
                    <AudioPlayer
                      src={audioUrl}
                      label="صدای اصلی جلسه"
                    />
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginBlockStart: 'var(--space-3)' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const a = document.createElement('a')
                          a.href = audioUrl
                          a.download = `meeting-audio-${meeting.id}.webm`
                          a.click()
                        }}
                      >
                        دانلود فایل صوتی
                      </Button>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    variant="inline"
                    icon="report"
                    title="فایل صوتی جلسه پیدا نشد"
                    description="فایل صوتی هنوز ذخیره نشده یا در بازیابی مشکلی پیش آمده است."
                  />
                )}
              </WorkPanel>

              {/* Topic Audio Playback */}
              <TopicPlaybackPanel
                topics={agendaTopics}
                segments={displaySegments}
                masterAudioUrl={audioUrl}
              />

              {/* Transcript Placeholder */}
              <TranscriptPlaceholder />

              {/* Resolutions */}
              <ResolutionsPanel
                resolutions={resolutions}
                assigneeOptions={assigneeOptions}
                canCreate={canCreateResolutions}
                canEdit={canEditResolutions}
                onCreate={handleCreateResolution}
                onUpdate={(id, draft) => demoUpdateResolution(auth, id, { title: draft.title, description: draft.description, assigneeId: draft.assignees[0], dueDate: draft.dueDate, priority: draft.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' })}
                onStatusChange={(id, status) => demoUpdateResolutionStatus(auth, id, status)}
                onRemove={canEditResolutions ? (id) => demoRemoveResolution(auth, id) : undefined}
                onOpenTask={onOpenTask}
              />
            </>
          )}

          {/* ---- BEFORE MEETING ---- */}
          {actualStatus !== 'IN_PROGRESS' && actualStatus !== 'COMPLETED' && (
            <>
              {/* Meeting Info */}
              <WorkPanel title="اطلاعات جلسه" icon="calendar">
                <ul className="meeting-live__status-list">
                  <li><span>وضعیت</span><StatusBadge tone={meetingStatusTone(meeting.status)} label={statusLabel} size="sm" /></li>
                  <li><span>زمان شروع</span>{formatPersianDate(meeting.startTime, { dateStyle: 'medium', timeStyle: 'short' })}</li>
                  <li><span>زمان پایان</span>{formatPersianDate(meeting.endTime, { dateStyle: 'medium', timeStyle: 'short' })}</li>
                  <li><span>محل برگزاری</span>{meeting.location}</li>
                  <li><span>شرکت‌کنندگان</span>{participants.length} نفر</li>
                </ul>
              </WorkPanel>

              {/* Topics List (read-only) */}
              {agendaTopics.length > 0 && (
                <WorkPanel title="موضوعات جلسه" icon="workflow" count={agendaTopics.length}>
                  <ol className="meeting-topics__list">
                    {agendaTopics.map((topic, index) => (
                      <li key={topic.id} className="meeting-topics__item">
                        <div className="meeting-topics__head">
                          <span className="meeting-topics__order">{index + 1}</span>
                          <span className="meeting-topics__title">{topic.title}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </WorkPanel>
              )}
            </>
          )}
        </section>

        <aside className="meeting-live__aside">
          <WorkPanel title="وضعیت جلسه" icon="workflow">
            <ul className="meeting-live__status-list">
              <li><span>وضعیت</span><StatusBadge tone={meetingStatusTone(meeting.status)} label={statusLabel} size="sm" /></li>
              <li><span>شرکت‌کنندگان</span>{participants.length} نفر</li>
              <li><span>حاضر</span>{participants.filter((p) => p.attendance === 'PRESENT').length} نفر</li>
              {actualStatus === 'IN_PROGRESS' && recording.status === 'recording' && (
                <li><span>ضبط</span><StatusBadge tone="success" label="فعال" size="sm" /></li>
              )}
              {actualStatus === 'IN_PROGRESS' && recording.status === 'paused' && (
                <li><span>ضبط</span><StatusBadge tone="warning" label="متوقف" size="sm" /></li>
              )}
            </ul>
          </WorkPanel>
        </aside>
      </div>
    )}
    <ConfirmDialog
      open={confirmFinish}
      onCancel={() => setConfirmFinish(false)}
      onConfirm={handleFinish}
      title="پایان جلسه؟"
      description="ضبط صوتی متوقف شده، موضوع فعال بسته می‌شود و فایل صوتی ذخیره خواهد شد."
      confirmLabel="پایان جلسه"
      cancelLabel="ادامه جلسه"
    />
  </div>
}

/* ------------------------------------------------------------------ */
/*  Sub-components (unchanged from original)                           */
/* ------------------------------------------------------------------ */

function LiveMeetingHeader({ meeting, statusLabel, onExit, onStart, onFinish }: { meeting: MeetingView; statusLabel: string; onExit(): void; onStart?(): void; onFinish?(): void }) {
  return <header className="meeting-live__header">
    <div className="meeting-live__identity">
      <button type="button" className="ui-icon-button" onClick={onExit} aria-label="بازگشت"><Icon name="arrow-back" size="sm" /></button>
      <div>
        <h1 className="meeting-live__title">{meeting.title}</h1>
        <p className="meeting-live__meta"><span>{meeting.code}</span><span>{meeting.location}</span></p>
      </div>
    </div>
    <div className="meeting-live__status">
      <StatusBadge tone={meetingStatusTone(meeting.status)} label={statusLabel} size="sm" />
      <span className="meeting-live__schedule">{formatPersianDate(meeting.startTime, { timeStyle: 'short' })} تا {formatPersianDate(meeting.endTime, { timeStyle: 'short' })}</span>
      {onStart && <Button size="sm" variant="success" onClick={onStart}>شروع جلسه</Button>}
      {onFinish && <Button size="sm" variant="warning" onClick={onFinish}>پایان جلسه</Button>}
    </div>
  </header>
}

function JoinGate({ ready, denied, onJoin, meeting }: { ready: boolean; denied: boolean; onJoin(): void; meeting: MeetingView }) {
  return <section className="meeting-live__gate">
    <EmptyState
      icon="alert"
      title={denied ? 'ورود به جلسه مجاز نیست' : ready ? 'جلسه برای ورود آماده است' : 'هنوز زمان ورود به جلسه نرسیده است'}
      description={denied
        ? 'فقط اعضای شرکت‌کننده و مدیران می‌توانند وارد میز کار زنده این جلسه شوند.'
        : ready
          ? 'پنجره ورود از ۱۵ دقیقه پیش از شروع جلسه باز است. وارد شوید تا دبیر فضای زنده را آغاز کند.'
          : `جلسه در ${formatPersianDate(meeting.startTime, { dateStyle: 'medium', timeStyle: 'short' })} برگزار می‌شود. پنجره ورود ۱۵ دقیقه پیش از شروع باز می‌شود.`}
    />
    {!denied && <Button disabled={!ready} onClick={onJoin}>ورود به میز کار جلسه</Button>}
  </section>
}

function LiveTimeBoard({ meeting }: { meeting: MeetingView }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => { const stamp = Date.now(); setNow(stamp); demoSyncSchedule(new Date(stamp)) }
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [])
  const start = new Date(meeting.startTime).getTime()
  if (!Number.isFinite(start) || now >= start) return null
  const total = Math.max(0, start - now)
  const hours = Math.floor(total / 3_600_000)
  const mins = Math.floor((total % 3_600_000) / 60_000)
  const secs = Math.floor((total % 60_000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return <div className="meeting-live__timer">
    <div className="meeting-live__timer-label">زمان مانده تا شروع جلسه</div>
    <div className="meeting-live__timer-digits" dir="ltr" aria-label={`${hours} ساعت، ${mins} دقیقه و ${secs} ثانیه`}><span>{pad(hours)}</span><i>:</i><span>{pad(mins)}</span><i>:</i><span>{pad(secs)}</span></div>
    <div className="meeting-live__timer-meta">{formatPersianDate(new Date(now), { dateStyle: 'medium' })}</div>
  </div>
}
