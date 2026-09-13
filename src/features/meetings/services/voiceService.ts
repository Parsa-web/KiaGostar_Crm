import { AppError } from '../../../errors'
import { foldPersianText, normalizePersianTranscript } from './persianTranscript'

interface RecognitionAlternative { readonly transcript: string; readonly confidence?: number }
interface RecognitionResult extends ArrayLike<RecognitionAlternative> { readonly isFinal: boolean; readonly 0: RecognitionAlternative }
interface RecognitionEvent { readonly resultIndex: number; readonly results: ArrayLike<RecognitionResult> }
interface SpeechRecognitionLike {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives?: number
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void; abort?(): void
}
type RecognitionConstructor = new () => SpeechRecognitionLike
type RecognitionWindow = Window & {
  SpeechRecognition?: RecognitionConstructor
  webkitSpeechRecognition?: RecognitionConstructor
}

export type VoiceStatus = 'idle' | 'recording' | 'paused'

/** Immutable view of the engine, cheap enough to hand to `useSyncExternalStore`. */
export interface VoiceSnapshot {
  readonly status: VoiceStatus
  readonly finalText: string
  readonly interimText: string
  readonly error: string | null
}

/** `aborted` fires on our own restarts; it is not a failure the user needs to see. */
const BENIGN_ERRORS = new Set(['aborted', 'no-speech'])
const FATAL_ERRORS: Readonly<Record<string, string>> = {
  'not-allowed': 'دسترسی میکروفن رد شد.',
  'service-not-allowed': 'سرویس تشخیص گفتار در این مرورگر مجاز نیست.',
  'audio-capture': 'میکروفنی یافت نشد.',
  'network': 'تشخیص گفتار به اینترنت نیاز دارد؛ اتصال را بررسی کنید.',
}
/* Just long enough for Chromium to release the previous session. Anything
   larger is audio the meeting never gets transcribed. */
const SESSION_TIMEOUT_DELAY_MS = 120
/** A session that ends this fast has failed rather than timed out, so repeated
 *  fast ends are counted and the loop is cut instead of spinning forever. */
const MIN_HEALTHY_SESSION_MS = 900
const MAX_CONSECUTIVE_FAILURES = 4


export class VoiceService {
  private recognition: SpeechRecognitionLike | null = null
  /** Committed text: every chunk here has already been through the Persian
   *  pipeline exactly once and is never reprocessed. */
  private transcribed = ''
  /** Live text for the current utterance; replaced wholesale on every event so
   *  it can never duplicate what is already committed. */
  private interim = ''
  private listeners = new Set<(transcript: string, recording: boolean) => void>()
  private status: VoiceStatus = 'idle'
  private lastError: string | null = null
  /** Guards against two sessions running at once, which the Web Speech API
   *  answers with an immediate `aborted` on both. */
  private starting = false
  private restartTimer: ReturnType<typeof setTimeout> | null = null
  private sessionStartedAt = 0
  private consecutiveFailures = 0
  /** Highest final result index consumed in the current session. Indices reset
   *  on every restart, so this is what stops a re-emitted result from being
   *  appended twice. */
  private finalCursor = 0
  /* Composed text and snapshot are cached because every subscriber used to
     rebuild both on every audio frame. */
  private composed = ''
  private composedDirty = true
  private snapshot: VoiceSnapshot = { status: 'idle', finalText: '', interimText: '', error: null }
  private snapshotDirty = true
  private textListeners = new Set<() => void>()
  private readonly language: string
  private readonly supported: boolean

  /* ---------- Audio recording (MediaRecorder) ---------- */
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private audioBlob: Blob | null = null
  private audioStream: MediaStream | null = null

  constructor(language = 'fa-IR') {
    this.language = language
    this.supported = typeof window !== 'undefined' && Boolean(this.recognitionConstructor())
  }

  private recognitionConstructor(): RecognitionConstructor | undefined {
    if (typeof window === 'undefined') return undefined
    const browser = window as RecognitionWindow
    return browser.SpeechRecognition ?? browser.webkitSpeechRecognition
  }

  private createSession(): SpeechRecognitionLike {
    const Constructor = this.recognitionConstructor()
    if (!Constructor) throw new AppError('UNKNOWN_ERROR', 'مرورگر شما تبدیل گفتار به متن را پشتیبانی نمی‌کند.')
    const recognition = new Constructor()
    recognition.lang = this.language
    /* Long dictation with live feedback: keep the session open across pauses
       and stream partial results so the operator sees words as they land. */
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => this.handleResult(event)
    recognition.onerror = (event) => this.handleError(event.error)
    recognition.onend = () => this.handleEnd()
    return recognition
  }

  private handleResult(event: RecognitionEvent): void {
    /* A healthy result means the session is working, so the failure budget for
       restart loops is reset. */
    this.consecutiveFailures = 0
    let pendingInterim = ''
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      if (!result) continue
      const raw = result[0]?.transcript ?? ''
      if (!result.isFinal) { pendingInterim += raw; continue }
      /* Already-consumed indices are skipped: some engines re-deliver the whole
         result list, and appending it again is exactly the duplication bug. */
      if (index < this.finalCursor) continue
      this.finalCursor = index + 1
      const chunk = normalizePersianTranscript(raw)
      if (chunk) this.transcribed = this.transcribed ? `${this.transcribed} ${chunk}` : chunk
    }
    const nextInterim = foldPersianText(pendingInterim)
    /* Engines re-fire `onresult` with an unchanged partial while the speaker
       holds a syllable; bailing here keeps those frames off the render path. */
    if (nextInterim === this.interim) return
    this.interim = nextInterim
    this.emit()
  }

  private handleError(error: string): void {
    if (BENIGN_ERRORS.has(error)) {
      return
    }
    const message = FATAL_ERRORS[error]
    this.lastError = message ?? 'تشخیص گفتار با خطا مواجه شد.'
    /* A permission or device fault cannot be recovered by restarting. */
    this.status = 'idle'
    this.teardown()
    this.emit()
  }

  private handleEnd(): void {
    const wasHealthy = Date.now() - this.sessionStartedAt >= MIN_HEALTHY_SESSION_MS
    this.recognition = null
    this.starting = false
    if (this.status !== 'recording') { this.emit(); return }
    if (!wasHealthy) this.consecutiveFailures += 1
    if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      this.status = 'idle'
      this.lastError = 'ضبط به دلیل قطع مکرر متوقف شد؛ دوباره تلاش کنید.'
      this.teardown()
      this.emit()
      return
    }
    /* Chromium ends a continuous session on its own after roughly a minute of
       audio, so an intentional recording is restarted rather than stopped. */
    this.scheduleRestart(SESSION_TIMEOUT_DELAY_MS)
    this.emit()
  }

  private scheduleRestart(delay = SESSION_TIMEOUT_DELAY_MS): void {
    if (this.restartTimer !== null) return
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null
      if (this.status !== 'recording') return
      this.launch()
    }, delay)
  }

  /** Single entry point for opening a session; refuses to run twice. */
  private launch(): void {
    if (this.starting || this.recognition) return
    this.starting = true
    let recognition: SpeechRecognitionLike
    try {
      recognition = this.createSession()
    } catch (cause) {
      this.starting = false
      throw cause
    }
    this.recognition = recognition
    this.finalCursor = 0
    this.sessionStartedAt = Date.now()
    try {
      recognition.start()
    } catch (cause) {
      /* An `InvalidStateError` here means the engine still holds the previous
         session; the pending `onend` will trigger the retry. */
      this.starting = false
      this.recognition = null
      throw cause
    }
    this.starting = false
  }

  private clearRestartTimer(): void {
    if (this.restartTimer === null) return
    clearTimeout(this.restartTimer)
    this.restartTimer = null
  }

  /** Detaches handlers and stops the engine. */
  private teardown(): void {
    this.clearRestartTimer()
    const current = this.recognition
    this.recognition = null
    this.starting = false
    if (current) {
      current.onresult = null; current.onerror = null; current.onend = null
      /* `abort` drops the session immediately; `stop` would wait for a final
         result we have already detached from. */
      try { if (current.abort) current.abort(); else current.stop() } catch { /* already stopped */ }
    }
  }

  startRecording() {
    if (!this.supported) throw new AppError('UNKNOWN_ERROR', 'مرورگر شما تبدیل گفتار به متن را پشتیبانی نمی‌کند.')
    if (this.status === 'recording') return
    this.clearRestartTimer()
    this.status = 'recording'
    this.lastError = null
    this.consecutiveFailures = 0
    this.audioBlob = null
    try {
      this.launch()
      this.startAudioRecording()
      this.emit()
    } catch (cause) {
      this.status = 'idle'
      this.lastError = cause instanceof Error ? cause.message : 'شروع ضبط ممکن نیست.'
      this.teardown()
      this.emit()
      throw new AppError('UNKNOWN_ERROR', this.lastError)
    }
  }

  pauseRecording() {
    if (this.status !== 'recording') return
    /* Set the status first: `onend` reads it to decide whether to restart. */
    this.status = 'paused'
    this.clearRestartTimer()
    const current = this.recognition
    if (!current) { this.emit(); return }
    try { current.stop() } catch { this.status = 'recording' }
    this.emit()
  }

  resumeRecording() {
    if (this.status !== 'paused') return
    this.status = 'idle'
    this.startRecording()
  }

  stopRecording() {
    if (this.status === 'idle') return
    this.status = 'idle'
    /* Whatever was mid-sentence is committed so a stop never loses words. */
    this.commitInterim()
    this.stopAudioRecording()
    this.teardown()
    this.emit()
  }

  private commitInterim(): void {
    const pending = normalizePersianTranscript(this.interim)
    this.interim = ''
    if (!pending) return
    this.transcribed = this.transcribed ? `${this.transcribed} ${pending}` : pending
  }

  clearTranscript() { this.transcribed = ''; this.interim = ''; this.finalCursor = 0; this.lastError = null; this.invalidate(); this.emit() }

  /** Marks the cached text and snapshot stale; the next read rebuilds them. */
  private invalidate() { this.composedDirty = true; this.snapshotDirty = true }

  /** Committed text plus the live tail. Recomputed only when something actually
   *  changed, so N subscribers cost one concat rather than N. */
  getTranscript() {
    if (this.composedDirty) {
      this.composed = this.interim ? `${this.transcribed} ${this.interim}`.trim() : this.transcribed
      this.composedDirty = false
    }
    return this.composed
  }
  /** Committed text only — safe to write into the minutes. */
  getFinalTranscript() { return this.transcribed }
  /** The phrase currently being recognised; replaced on every frame. */
  getInterimTranscript() { return this.interim }
  /** Stable object identity between changes, so `useSyncExternalStore` and
   *  `memo` can both bail out without a deep compare. */
  getSnapshot(): VoiceSnapshot {
    if (this.snapshotDirty) {
      this.snapshot = { status: this.status, finalText: this.transcribed, interimText: this.interim, error: this.lastError }
      this.snapshotDirty = false
    }
    return this.snapshot
  }
  getStatus(): VoiceStatus { return this.status }
  getError(): string | null { return this.lastError }
  isSupported(): boolean { return this.supported }
  subscribe(listener: (transcript: string, recording: boolean) => void) { this.listeners.add(listener); listener(this.getTranscript(), this.status === 'recording'); return () => { this.listeners.delete(listener) } }
  /** Argument-free subscription for `useSyncExternalStore`. */
  subscribeToChanges(listener: () => void) { this.textListeners.add(listener); return () => { this.textListeners.delete(listener) } }
  /** Releases the engine; call from a component teardown. */
  dispose() { this.stopAudioRecording(); this.status = 'idle'; this.teardown(); this.listeners.clear(); this.textListeners.clear() }

  /* -------- Audio recording (MediaRecorder) -------- */

  /** Starts capturing actual audio via MediaRecorder alongside speech recognition. */
  async startAudioRecording(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') return
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true } })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      this.mediaRecorder = new MediaRecorder(this.audioStream, { mimeType })
      this.audioChunks = []
      this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.audioChunks.push(e.data) }
      this.mediaRecorder.onstop = () => { this.audioBlob = new Blob(this.audioChunks, { type: mimeType }); this.audioChunks = [] }
      this.mediaRecorder.start(1000) // collect in 1-second chunks
    } catch {
      /* Microphone access denied — speech recognition may still work, so we
         silently degrade rather than blocking the whole recording session. */
    }
  }

  /** Stops audio capture and finalises the audio blob. */
  stopAudioRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop()
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop())
      this.audioStream = null
    }
  }

  /** Returns the recorded audio as a Blob, or null if nothing has been recorded. */
  getAudioBlob(): Blob | null { return this.audioBlob }

  /** Downloads the recorded audio as a .webm file. */
  downloadAudio(filename?: string): void {
    const blob = this.audioBlob
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename ?? `meeting-audio-${Date.now()}.webm`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Returns true if a recorded audio blob is available for download. */
  hasAudioRecording(): boolean { return this.audioBlob !== null && this.audioBlob.size > 0 }
  private emit() {
    this.invalidate()
    this.textListeners.forEach((listener) => listener())
    if (!this.listeners.size) return
    const active = this.status === 'recording'
    const transcript = this.getTranscript()
    this.listeners.forEach((listener) => listener(transcript, active))
  }
}
