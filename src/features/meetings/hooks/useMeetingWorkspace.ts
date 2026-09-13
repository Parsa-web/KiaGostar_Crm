import { useCallback, useEffect, useMemo, useState } from 'react'
import { toAppError } from '../../../errors'
import { demoMeetingWorkspace, demoUpdateMeetingMinutes, useDemoState } from '../../../demo'
import { VoiceService } from '../services'

const MINUTES_STORAGE_PREFIX = 'kiagostar.meeting-live-drafts.'

/** Draft persistence helper — localStorage mirror of the live workspace minutes, keyed by meeting id. */
export class MeetingDraftStorage {
  private readonly storage: Storage | null
  constructor(private readonly meetingId: string) {
    this.storage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage : null
  }
  private key() { return `${MINUTES_STORAGE_PREFIX}${this.meetingId}` }
  load(): string {
    if (!this.storage) return ''
    try { return this.storage.getItem(this.key()) ?? '' } catch { return '' }
  }
  save(content: string) { if (!this.storage) return; try { this.storage.setItem(this.key(), content) } catch { /* storage full — safe to ignore */ } }
  clear() { if (!this.storage) return; try { this.storage.removeItem(this.key()) } catch { /* noop */ } }
}

const MAX_HISTORY = 50

export const useMeetingWorkspace = (meetingId: string, initialMinutes?: string) => {
  const storeWorkspace = useDemoState().meetingWorkspaces[meetingId] ?? demoMeetingWorkspace(meetingId)
  const service = useMemo(() => new VoiceService('fa-IR'), [])
  const [minutes, setMinutes] = useState<string>(() => initialMinutes ?? storeWorkspace.minutes)
  const [history, setHistory] = useState<readonly string[]>([initialMinutes ?? storeWorkspace.minutes])
  const [cursor, setCursor] = useState(0)
  const [saved, setSaved] = useState(true)
  /* Only the start failure lives in React state. The transcript itself is read
     through `useVoiceSnapshot` inside `VoiceControls`, so a partial result
     re-renders that one component rather than this whole workspace. */
  const [startError, setStartError] = useState<string | null>(null)

  useEffect(() => {
    // Remove the now-obsolete engine preference from browsers that used the
    // former local recognizer. It is never read or persisted again.
    try { window.localStorage.removeItem('kiagostar.speech-engine') } catch { /* storage unavailable */ }
    return () => { service.dispose() }
  }, [service])

  const startVoice = useCallback(() => {
    setStartError(null)
    try { service.startRecording() } catch (cause) { setStartError(toAppError(cause).message) }
  }, [service])
  const pauseVoice = useCallback(() => service.pauseRecording(), [service])
  const resumeVoice = useCallback(() => service.resumeRecording(), [service])
  const stopVoice = useCallback(() => service.stopRecording(), [service])
  const clearVoice = useCallback(() => { setStartError(null); service.clearTranscript() }, [service])

  const updateMinutes = (content: string) => {
    setMinutes(content)
    setCursor(0)
    setSaved(false)
    setHistory((current) => [content, ...current].slice(0, MAX_HISTORY))
  }
  const persistMinutes = () => {
    if (saved) return
    demoUpdateMeetingMinutes(meetingId, minutes)
    setSaved(true)
  }
  const undo = () => {
    if (cursor + 1 >= history.length) return
    const next = cursor + 1
    setCursor(next)
    setMinutes(history[next])
  }
  const redo = () => {
    if (cursor <= 0) return
    const next = cursor - 1
    setCursor(next)
    setMinutes(history[next])
  }
  /* Defaults to the committed text: inserting a half-recognised phrase into the
     official minutes is never what the secretary wants. */
  const insertTranscript = (chunk?: string) => {
    const value = (chunk ?? service.getFinalTranscript()).trim()
    if (!value) return
    updateMinutes(minutes ? `${minutes}\n${value}` : value)
  }

  return {
    workspace: storeWorkspace, minutes, saved,
    /* The service is handed to `VoiceControls` so it can subscribe on its own;
       nothing about the transcript passes through this hook's render. */
    voiceService: service, voiceSupported: service.isSupported(), voiceStartError: startError,
    startVoice, pauseVoice, resumeVoice, stopVoice, clearVoice,
    updateMinutes, persistMinutes, insertTranscript, undo, redo,
    canUndo: cursor + 1 < history.length, canRedo: cursor > 0,
  }
}
