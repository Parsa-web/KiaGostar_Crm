/**
 * useSpeechDictation — live Persian speech-to-text on the Web Speech API.
 *
 * Design notes:
 *  - The mic is opened with getUserMedia first (noiseSuppression,
 *    echoCancellation, autoGainControl, mono) so the recognizer receives an
 *    already-cleaned track and we can show a real input-level meter.
 *  - maxAlternatives = 3 and the alternative with the highest confidence wins.
 *  - Interim results are streamed out through onInterim so the caller can show
 *    them in the real field while the user is still speaking. The caller
 *    rewrites them in place from a stable anchor, so a revised guess never
 *    deletes text that was already final.
 *  - A single failure must never kill dictation: only permission / service /
 *    language / missing-device errors are fatal, everything else is retried
 *    with exponential backoff.
 *  - A watchdog restarts a session that is alive but has stopped producing
 *    results, and rotates the session before Chrome's own time limit.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { convertDictation, previewDictation } from '../utils/persianDictation'

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
  /** Finalised, punctuated text. Append it and move the anchor. */
  onCommit(text: string): void
  /** Current in-progress guess. Render it after the anchor; it will be revised. */
  onInterim(text: string): void
}

export interface UseSpeechDictationResult {
  supported: boolean
  status: DictationStatus
  listening: boolean
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

export function useSpeechDictation({ lang = 'fa-IR', onCommit, onInterim }: UseSpeechDictationOptions): UseSpeechDictationResult {
  const [supported] = useState<boolean>(() => isDictationSupported())
  const [status, setStatus] = useState<DictationStatus>(() => (isDictationSupported() ? 'idle' : 'unsupported'))
  const [level, setLevel] = useState(0)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const launchRef = useRef<(() => void) | null>(null)
  const commitRef = useRef(onCommit)
  const interimRef = useRef(onInterim)
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

  useEffect(() => {
    commitRef.current = onCommit
  }, [onCommit])
  useEffect(() => {
    interimRef.current = onInterim
  }, [onInterim])

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
          finalised += `${best.transcript} `
          lastConfidence = best.confidence
        } else {
          pending += best.transcript
        }
      }

      const raw = finalised.trim()
      if (raw) {
        const converted = convertDictation(raw, carryRef.current)
        carryRef.current = converted.carry
        if (converted.text) commitRef.current(converted.text)
        if (lastConfidence !== null && Number.isFinite(lastConfidence) && lastConfidence > 0) setConfidence(lastConfidence)
        // The finalised part is now part of the anchor; only the still-open
        // guess may remain on screen.
        hasInterimRef.current = false
        interimRef.current('')
      }

      const preview = pending.trim() ? previewDictation(carryRef.current ? `${carryRef.current} ${pending}` : pending) : ''
      hasInterimRef.current = preview.length > 0
      interimRef.current(preview)
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
      // An open guess that never became final is dropped, so the field keeps
      // only text the recognizer actually confirmed.
      if (hasInterimRef.current) {
        hasInterimRef.current = false
        interimRef.current('')
      }
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
    }
    if (hasInterimRef.current) {
      hasInterimRef.current = false
      interimRef.current('')
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
    level,
    confidence,
    error,
    notice,
    start,
    stop,
    toggle,
  }
}
