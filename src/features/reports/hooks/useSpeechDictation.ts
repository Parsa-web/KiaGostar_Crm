/**
 * useSpeechDictation — live Persian speech-to-text on the Web Speech API.
 *
 * DEVICE OWNERSHIP RULE (do not break this):
 * SpeechRecognition is the ONLY consumer of the microphone here. We never open
 * a getUserMedia capture of the same device — not before the session, not
 * afterwards for a level meter. A second capture leaves the first session
 * working but starves every later one (silence timeout, session rotation),
 * which looks exactly like "the mic hears me but nothing is transcribed".
 * The level meter is therefore derived from the recognizer's own speech
 * events instead of from raw audio.
 *
 * Session lifecycle: every relaunch goes through one scheduler guarded by a
 * generation counter, so handlers of a superseded session can never spawn a
 * competing recognition object. Sessions that end after a successful start
 * (normal silence timeout) relaunch freely; only sessions that never started
 * count towards the failure limit.
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
  onaudiostart: (() => void) | null
  onsoundstart: (() => void) | null
  onsoundend: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
  onnomatch: (() => void) | null
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
  'not-allowed': '\u062f\u0633\u062a\u0631\u0633\u06cc \u0628\u0647 \u0645\u06cc\u06a9\u0631\u0648\u0641\u0646 \u062f\u0627\u062f\u0647 \u0646\u0634\u062f. \u0627\u0632 \u0646\u0648\u0627\u0631 \u0622\u062f\u0631\u0633 \u0645\u0631\u0648\u0631\u06af\u0631 \u0627\u062c\u0627\u0632\u0647\u0654 \u0645\u06cc\u06a9\u0631\u0648\u0641\u0646 \u0631\u0627 \u0641\u0639\u0627\u0644 \u06a9\u0646\u06cc\u062f.',
  'service-not-allowed': '\u0633\u0631\u0648\u06cc\u0633 \u062a\u0628\u062f\u06cc\u0644 \u06af\u0641\u062a\u0627\u0631 \u062f\u0631 \u0627\u06cc\u0646 \u0645\u0631\u0648\u0631\u06af\u0631 \u0645\u062c\u0627\u0632 \u0646\u06cc\u0633\u062a.',
  'language-not-supported': '\u0632\u0628\u0627\u0646 \u0641\u0627\u0631\u0633\u06cc \u062f\u0631 \u0627\u06cc\u0646 \u0645\u0631\u0648\u0631\u06af\u0631 \u067e\u0634\u062a\u06cc\u0628\u0627\u0646\u06cc \u0646\u0645\u06cc\u200c\u0634\u0648\u062f.',
  'audio-capture': '\u0645\u06cc\u06a9\u0631\u0648\u0641\u0646\u06cc \u06cc\u0627\u0641\u062a \u0646\u0634\u062f. \u0627\u062a\u0635\u0627\u0644 \u0645\u06cc\u06a9\u0631\u0648\u0641\u0646 \u0631\u0627 \u0628\u0631\u0631\u0633\u06cc \u06a9\u0646\u06cc\u062f.',
}

const NETWORK_NOTICE = '\u0627\u062a\u0635\u0627\u0644 \u0633\u0631\u0648\u06cc\u0633 \u06af\u0641\u062a\u0627\u0631 \u0645\u0648\u0642\u062a\u0627\u064b \u0642\u0637\u0639 \u0634\u062f\u061b \u062f\u0631 \u062d\u0627\u0644 \u0627\u062a\u0635\u0627\u0644 \u0645\u062c\u062f\u062f\u2026'
const FAILED_START_MESSAGE = '\u0627\u0631\u062a\u0628\u0627\u0637 \u0628\u0627 \u0633\u0631\u0648\u06cc\u0633 \u062a\u0628\u062f\u06cc\u0644 \u06af\u0641\u062a\u0627\u0631 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062f. \u0627\u062a\u0635\u0627\u0644 \u0627\u06cc\u0646\u062a\u0631\u0646\u062a \u0631\u0627 \u0628\u0631\u0631\u0633\u06cc \u06a9\u0646\u06cc\u062f \u0648 \u062f\u0648\u0628\u0627\u0631\u0647 \u062a\u0644\u0627\u0634 \u06a9\u0646\u06cc\u062f.'

const WATCHDOG_INTERVAL_MS = 4000
/** Only a session that produces no event at all for this long is considered dead. */
const DEAD_AFTER_MS = 20000
/** Chrome caps a session at about a minute; rotate earlier, and only when idle. */
const ROTATE_AFTER_MS = 50000
/** Consecutive sessions that never reached onstart before giving up. */
const MAX_FAILED_STARTS = 6
/**
 * Noise gate: a final hypothesis of one or two words whose reported confidence
 * is this low is an artefact of background noise, not speech. Zero confidence
 * is NOT filtered, because Chrome legitimately reports 0 for many finals.
 */
const NOISE_CONFIDENCE_FLOOR = 0.12
const NOISE_MAX_WORDS = 2
/** Meter value while the recognizer reports active speech. */
const SPEAKING_LEVEL = 0.95
const QUIET_LEVEL = 0.05

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
  /** Speech-activity level derived from the recognizer, not from a raw capture. */
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
  const launchRef = useRef<((generation: number) => void) | null>(null)
  const commitRef = useRef(onCommit)
  const interimRef = useRef(onInterim)
  const wantedRef = useRef(false)
  /** Incremented whenever a session is superseded; stale handlers bail out. */
  const generationRef = useRef(0)
  const restartTimerRef = useRef(0)
  const watchdogRef = useRef(0)
  const failedStartsRef = useRef(0)
  const startedRef = useRef(false)
  const lastEventAtRef = useRef(0)
  const lastSpeechAtRef = useRef(0)
  const sessionStartedAtRef = useRef(0)
  const hasInterimRef = useRef(false)
  const carryRef = useRef('')

  useEffect(() => {
    commitRef.current = onCommit
  }, [onCommit])
  useEffect(() => {
    interimRef.current = onInterim
  }, [onInterim])

  /** Single relaunch scheduler: one pending timer, ever. */
  const scheduleRelaunch = useCallback((delay: number) => {
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current)
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = 0
      if (wantedRef.current) launchRef.current?.(generationRef.current)
    }, delay)
  }, [])

  const launch = useCallback(
    (generation: number) => {
      const Ctor = getRecognitionCtor()
      if (!Ctor || generation !== generationRef.current) return
      const recognition = new Ctor()
      recognition.lang = lang
      recognition.continuous = true
      recognition.interimResults = true
      // More hypotheses give the confidence-based picker a better chance in a
      // noisy room; only the best one is ever used.
      recognition.maxAlternatives = 5
      startedRef.current = false
      lastEventAtRef.current = Date.now()

      const isCurrent = () => generation === generationRef.current

      recognition.onstart = () => {
        if (!isCurrent()) return
        startedRef.current = true
        failedStartsRef.current = 0
        sessionStartedAtRef.current = Date.now()
        lastEventAtRef.current = Date.now()
        setStatus('listening')
        setNotice(null)
      }

      recognition.onaudiostart = () => {
        if (isCurrent()) lastEventAtRef.current = Date.now()
      }

      // Speech activity drives the meter. No audio capture, no contention.
      recognition.onspeechstart = () => {
        if (!isCurrent()) return
        lastEventAtRef.current = Date.now()
        lastSpeechAtRef.current = Date.now()
        setLevel(SPEAKING_LEVEL)
      }

      recognition.onspeechend = () => {
        if (!isCurrent()) return
        lastEventAtRef.current = Date.now()
        setLevel(QUIET_LEVEL)
      }

      recognition.onsoundstart = () => {
        if (isCurrent()) lastEventAtRef.current = Date.now()
      }

      recognition.onsoundend = () => {
        if (isCurrent()) lastEventAtRef.current = Date.now()
      }

      // Pure noise produces nomatch. It is not an error and must not restart
      // or reset anything.
      recognition.onnomatch = () => {
        if (isCurrent()) lastEventAtRef.current = Date.now()
      }

      recognition.onresult = (event) => {
        if (!isCurrent()) return
        const now = Date.now()
        lastEventAtRef.current = now
        lastSpeechAtRef.current = now
        setLevel(SPEAKING_LEVEL)

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
          const transcript = best.transcript.trim()
          if (!transcript) continue
          if (result.isFinal) {
            const words = transcript.split(/\s+/).length
            const noise = best.confidence > 0 && best.confidence < NOISE_CONFIDENCE_FLOOR && words <= NOISE_MAX_WORDS
            if (noise) continue
            finalised += `${transcript} `
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
          hasInterimRef.current = false
          interimRef.current('')
        }

        const preview = pending.trim() ? previewDictation(carryRef.current ? `${carryRef.current} ${pending}` : pending) : ''
        hasInterimRef.current = preview.length > 0
        interimRef.current(preview)
      }

      recognition.onerror = (event) => {
        if (!isCurrent()) return
        lastEventAtRef.current = Date.now()
        const fatal = FATAL_ERRORS[event.error]
        if (fatal) {
          wantedRef.current = false
          generationRef.current += 1
          setError(fatal)
          setNotice(null)
          setStatus('error')
          return
        }
        // 'no-speech', 'aborted' and transient network drops are normal during
        // a long dictation; onend relaunches the session.
        if (event.error === 'network') setNotice(NETWORK_NOTICE)
      }

      recognition.onend = () => {
        if (!isCurrent()) return
        recognitionRef.current = null
        setLevel(QUIET_LEVEL)
        if (hasInterimRef.current) {
          hasInterimRef.current = false
          interimRef.current('')
        }
        if (!wantedRef.current) {
          setStatus((previous) => (previous === 'error' ? previous : 'idle'))
          return
        }
        if (startedRef.current) {
          // A healthy session ended (usually a silence timeout). Relaunch fast
          // and do NOT count it as a failure, otherwise quiet thinking pauses
          // would eventually lock dictation out completely.
          setStatus('recovering')
          scheduleRelaunch(200)
          return
        }
        failedStartsRef.current += 1
        if (failedStartsRef.current >= MAX_FAILED_STARTS) {
          wantedRef.current = false
          generationRef.current += 1
          setError(FAILED_START_MESSAGE)
          setStatus('error')
          return
        }
        setStatus('recovering')
        scheduleRelaunch(Math.min(2000, 300 * 2 ** failedStartsRef.current))
      }

      recognitionRef.current = recognition
      try {
        recognition.start()
      } catch {
        // start() throws if the previous object is still closing; onend of that
        // object, or the watchdog, will retry.
        scheduleRelaunch(400)
      }
    },
    [lang, scheduleRelaunch],
  )

  useEffect(() => {
    launchRef.current = launch
  }, [launch])

  /** Abort the live session and start a fresh one under a new generation. */
  const hardRestart = useCallback(() => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    generationRef.current += 1
    if (recognition) {
      try {
        recognition.abort()
      } catch {
        /* noop */
      }
    }
    lastEventAtRef.current = Date.now()
    setStatus('recovering')
    scheduleRelaunch(250)
  }, [scheduleRelaunch])

  const start = useCallback(() => {
    if (!supported) {
      setStatus('unsupported')
      return
    }
    if (wantedRef.current) return
    wantedRef.current = true
    generationRef.current += 1
    failedStartsRef.current = 0
    carryRef.current = ''
    setError(null)
    setNotice(null)
    setConfidence(null)
    setLevel(QUIET_LEVEL)
    setStatus('starting')
    launchRef.current?.(generationRef.current)

    if (watchdogRef.current) window.clearInterval(watchdogRef.current)
    watchdogRef.current = window.setInterval(() => {
      if (!wantedRef.current) return
      const now = Date.now()
      // Let the meter fall back to quiet when speech stops without an event.
      if (now - lastSpeechAtRef.current > 1500) setLevel((previous) => (previous > QUIET_LEVEL ? QUIET_LEVEL : previous))
      if (!recognitionRef.current) {
        if (!restartTimerRef.current) scheduleRelaunch(200)
        return
      }
      const dead = now - lastEventAtRef.current > DEAD_AFTER_MS
      const rotate = startedRef.current && now - sessionStartedAtRef.current > ROTATE_AFTER_MS && !hasInterimRef.current
      if (dead || rotate) hardRestart()
    }, WATCHDOG_INTERVAL_MS)
  }, [hardRestart, scheduleRelaunch, supported])

  const stop = useCallback(() => {
    wantedRef.current = false
    generationRef.current += 1
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
    setLevel(0)
    setNotice(null)
    setStatus((previous) => (previous === 'error' ? previous : 'idle'))
  }, [])

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
