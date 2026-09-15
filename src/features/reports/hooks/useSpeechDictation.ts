/**
 * useSpeechDictation — live Persian speech-to-text on the Web Speech API.
 *
 * Why it is built this way:
 *  - The mic is opened with getUserMedia first (noiseSuppression,
 *    echoCancellation, autoGainControl, mono) so the recognizer receives an
 *    already-cleaned track and we can show a real input-level meter.
 *  - maxAlternatives = 3 and the alternative with the highest confidence wins.
 *  - A single failure must never kill dictation. Errors are classified:
 *    only permission / service / language errors are fatal, everything else is
 *    retried with exponential backoff.
 *  - A watchdog restarts a session that is alive but has stopped producing
 *    results, and rotates the session before Chrome's own time limit, because
 *    a stale session silently stops recognising anything.
 *  - Duplicate final chunks (the recognizer re-emits them around restarts) are
 *    dropped, and unfinished spoken commands are carried across chunks.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { convertDictation, previewDictation, type DictationCommand } from '../utils/persianDictation'

export type DictationStatus = 'unsupported' | 'idle' | 'starting' | 'listening' | 'recovering' | 'error'

interface SpeechAlternativeLike { readonly transcript: string; readonly confidence: number }
interface SpeechResultLike { readonly isFinal: boolean; readonly length: number; readonly [index: number]: SpeechAlternativeLike }
interface SpeechResultListLike { readonly length: number; readonly [index: number]: SpeechResultLike }
interface SpeechEventLike { readonly resultIndex: number; readonly results: SpeechResultListLike }
interface SpeechErrorEventLike { readonly error: string; readonly message?: string }
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: (() => void) | null
  onend: (() => void) | null
  onresult: ((event: SpeechEventLike) => void) | null
  onerror: ((event: SpeechErrorEventLike) => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const scope = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

export function isDictationSupported(): boolean {
  return getRecognitionCtor() !== null
}

/** Errors the user must fix; dictation stops. */
const FATAL_ERRORS: Readonly<Record<string, string>> = {
  'not-allowed': 'دسترسی به میکروفن داده نشد. از نوار آدرس مرورگر اجازهٔ میکروفن را فعال کنید.',
  'service-not-allowed': 'سرویس تبدیل گفتار در این مرورگر مجاز نیست.',
  'language-not-supported': 'زبان فارسی در این مرورگر پشتیبانی نمی‌شود.',
  'audio-capture': 'میکروفنی یافت نشد. اتصال میکروفن را بررسی کنید.',
}

const WATCHDOG_INTERVAL_MS = 3000
/** No result for this long while listening means the session is stale. */
const STALE_AFTER_MS = 9000
/** Chrome caps a session at about a minute; rotate earlier, only when idle. */
const ROTATE_AFTER_MS = 45000
const MAX_RETRIES = 8

export interface UseSpeechDictationOptions {
  lang?: string
  /** Called with each finalised, normalised chunk of text. */
  onCommit(text: string): void
  /** Called for dictated editing commands («حذف کلمه», «حذف جمله»). */
  onCommand?(command: DictationCommand): void
}

export interface UseSpeechDictationResult {
  supported: boolean
  status: DictationStatus
  listening: boolean
  interim: string
  level: number
  confidence: number | null
  /** Fatal problem; dictation stopped. */
  error: string | null
  /** Recoverable problem being retried in the background. */
  notice: string | null
  start(): void
  stop(): void
  toggle(): void
}

export function useSpeechDictation({ lang = 'fa-IR', onCommit, onCommand }: UseSpeechDictationOptions): UseSpeechDictationResult {
  const [supported] = useState<boolean>(() => isDictationSupported())
  const [status, setStatus] = useState<DictationStatus>(() => (isDictationSupported() ? 'idle' : 'unsupported'))
  const [interim, setInterim] = useState('')
  const [level, setLevel] = useState(0)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const launchRef = useRef<(() => void) | null>(null)
  const commitRef = useRef(onCommit)
  const commandRef = useRef(onCommand)
  const wantedRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const frameRef = useRef(0)
  const levelRef = useRef(0)
  const restartTimerRef = useRef(0)
  const watchdogRef = useRef(0)
  const retriesRef = useRef(0)
  const lastResultAtRef = useRef(0)
  const sessionStartedAtRef = useRef(0)
  const hasInterimRef = useRef(false)
  const carryRef = useRef('')
  const lastChunkRef = useRef({ text: '', at: 0 })

  useEffect(() => {
    commitRef.current = onCommit
  }, [onCommit])
  useEffect(() => {
    commandRef.current = onCommand
  }, [onCommand])

  const stopMeter = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
    }
    const context = audioContextRef.current
    audioContextRef.current = null
    if (context) void context.close().catch(() => undefined)
    levelRef.current = 0
    setLevel(0)
  }, [])

  const startMeter = useCallback((stream: MediaStream) => {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return
    const context = new AudioCtor()
    audioContextRef.current = context
    const analyser = context.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.8
    context.createMediaStreamSource(stream).connect(analyser)
    const buffer = new Float32Array(analyser.fftSize)
    const tick = () => {
      analyser.getFloatTimeDomainData(buffer)
      let sum = 0
      for (let i = 0; i < buffer.length; i += 1) sum += buffer[i] * buffer[i]
      const next = Math.min(1, Math.sqrt(sum / buffer.length) * 4)
      if (Math.abs(next - levelRef.current) > 0.04) {
        levelRef.current = next
        setLevel(next)
      }
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [])

  const launch = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 3

    recognition.onstart = () => {
      sessionStartedAtRef.current = Date.now()
      lastResultAtRef.current = Date.now()
      setStatus('listening')
    }

    recognition.onresult = (event) => {
      lastResultAtRef.current = Date.now()
      retriesRef.current = 0
      setNotice(null)
      let pending = ''
      let finalised = ''
      let lastConfidence: number | null = null
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        let best = result[0]
        for (let alt = 1; alt < result.length; alt += 1) {
          const candidate = result[alt]
          if (candidate && candidate.confidence > best.confidence) best = candidate
        }
        if (!best) continue
        if (result.isFinal) {
          finalised += best.transcript + ' '
          lastConfidence = best.confidence
        } else {
          pending += best.transcript
        }
      }

      const raw = finalised.trim()
      if (raw) {
        const now = Date.now()
        const duplicate = raw === lastChunkRef.current.text && now - lastChunkRef.current.at < 1500
        lastChunkRef.current = { text: raw, at: now }
        if (!duplicate) {
          const converted = convertDictation(raw, carryRef.current)
          carryRef.current = converted.carry
          if (converted.text) commitRef.current(converted.text)
          for (const command of converted.commands) commandRef.current?.(command)
          if (lastConfidence !== null && Number.isFinite(lastConfidence) && lastConfidence > 0) setConfidence(lastConfidence)
        }
      }

      const preview = pending ? previewDictation(carryRef.current ? `${carryRef.current} ${pending}` : pending) : ''
      hasInterimRef.current = preview.length > 0
      setInterim(preview)
    }

    recognition.onerror = (event) => {
      const fatal = FATAL_ERRORS[event.error]
      if (fatal) {
        wantedRef.current = false
        setError(fatal)
        setNotice(null)
        setStatus('error')
        return
      }
      // Recoverable: a pause in speech, a dropped connection or our own
      // restart. Keep the intent flag so onend relaunches the session.
      if (event.error === 'network') setNotice('اتصال سرویس گفتار موقتاً قطع شد؛ در حال اتصال مجدد…')
    }

    recognition.onend = () => {
      recognitionRef.current = null
      hasInterimRef.current = false
      setInterim('')
      if (!wantedRef.current) {
        setStatus((previous) => (previous === 'error' ? previous : 'idle'))
        return
      }
      if (retriesRef.current >= MAX_RETRIES) {
        wantedRef.current = false
        setError('ارتباط با سرویس تبدیل گفتار برقرار نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.')
        setStatus('error')
        return
      }
      const delay = Math.min(2500, 200 * 2 ** retriesRef.current)
      retriesRef.current += 1
      setStatus((previous) => (previous === 'listening' ? 'recovering' : previous))
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = 0
        if (wantedRef.current) launchRef.current?.()
      }, delay)
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      /* start() throws while the previous session is closing; onend relaunches. */
    }
  }, [lang])

  useEffect(() => {
    launchRef.current = launch
  }, [launch])

  const start = useCallback(() => {
    if (!supported) {
      setStatus('unsupported')
      return
    }
    if (wantedRef.current) return
    wantedRef.current = true
    retriesRef.current = 0
    carryRef.current = ''
    lastChunkRef.current = { text: '', at: 0 }
    setError(null)
    setNotice(null)
    setConfidence(null)
    setStatus('starting')
    void (async () => {
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true, channelCount: 1 },
          })
          streamRef.current = stream
          startMeter(stream)
        }
      } catch {
        wantedRef.current = false
        setStatus('error')
        setError(FATAL_ERRORS['not-allowed'])
        return
      }
      if (!wantedRef.current) return
      launchRef.current?.()

      // Watchdog: a session can stay "open" yet stop returning results, which
      // is exactly the state where dictation looked permanently broken.
      if (watchdogRef.current) window.clearInterval(watchdogRef.current)
      watchdogRef.current = window.setInterval(() => {
        if (!wantedRef.current) return
        const now = Date.now()
        const recognition = recognitionRef.current
        if (!recognition) return
        const stale = now - lastResultAtRef.current > STALE_AFTER_MS
        const rotate = now - sessionStartedAtRef.current > ROTATE_AFTER_MS && !hasInterimRef.current
        if (!stale && !rotate) return
        recognitionRef.current = null
        try {
          recognition.abort()
        } catch {
          /* noop */
        }
        lastResultAtRef.current = now
        setStatus('recovering')
        if (!restartTimerRef.current) {
          restartTimerRef.current = window.setTimeout(() => {
            restartTimerRef.current = 0
            if (wantedRef.current) launchRef.current?.()
          }, 250)
        }
      }, WATCHDOG_INTERVAL_MS)
    })()
  }, [startMeter, supported])

  const stop = useCallback(() => {
    wantedRef.current = false
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current)
      restartTimerRef.current = 0
    }
    if (watchdogRef.current) {
      window.clearInterval(watchdogRef.current)
      watchdogRef.current = 0
    }
    // Flush a command prefix still waiting for its second word.
    if (carryRef.current) {
      const flushed = convertDictation('', carryRef.current, { flush: true })
      carryRef.current = ''
      if (flushed.text) commitRef.current(flushed.text)
      for (const command of flushed.commands) commandRef.current?.(command)
    }
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (recognition) {
      try {
        recognition.stop()
      } catch {
        try {
          recognition.abort()
        } catch {
          /* already dead */
        }
      }
    }
    stopMeter()
    streamRef.current?.getTracks().forEach((track) => {
      try {
        track.stop()
      } catch {
        /* noop */
      }
    })
    streamRef.current = null
    hasInterimRef.current = false
    setInterim('')
    setNotice(null)
    setStatus((previous) => (previous === 'error' ? previous : 'idle'))
  }, [stopMeter])

  const toggle = useCallback(() => {
    if (wantedRef.current) stop()
    else start()
  }, [start, stop])

  const stopRef = useRef(stop)
  useEffect(() => {
    stopRef.current = stop
  }, [stop])
  useEffect(() => () => { stopRef.current() }, [])

  return {
    supported,
    status,
    listening: status === 'listening' || status === 'starting' || status === 'recovering',
    interim,
    level,
    confidence,
    error,
    notice,
    start,
    stop,
    toggle,
  }
}
