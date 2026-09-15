/**
 * useSpeechDictation — live Persian speech-to-text on the Web Speech API.
 *
 * Accuracy / robustness decisions:
 *  - The mic is opened with getUserMedia first (noiseSuppression,
 *    echoCancellation, autoGainControl, mono) so the recognizer receives an
 *    already-cleaned track and we can show a real input-level meter.
 *  - maxAlternatives = 3 and the highest-confidence alternative wins.
 *  - Chrome ends a session after a few seconds of silence; while the user has
 *    not pressed stop we relaunch, so long dictations survive natural pauses.
 *  - Only final results mutate the field; interim text is returned separately,
 *    so nothing is ever written twice.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeDictatedText } from '../utils/persianDictation'

export type DictationStatus = 'unsupported' | 'idle' | 'starting' | 'listening' | 'error'

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

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  'not-allowed': 'دسترسی به میکروفن داده نشد. از نوار آدرس مرورگر اجازه دسترسی را فعال کنید.',
  'service-not-allowed': 'سرویس تبدیل گفتار در این مرورگر مجاز نیست.',
  'audio-capture': 'میکروفنی یافت نشد. اتصال میکروفن را بررسی کنید.',
  network: 'ارتباط با سرویس تبدیل گفتار قطع شد. اتصال اینترنت را بررسی کنید.',
  'language-not-supported': 'زبان فارسی در این مرورگر پشتیبانی نمی‌شود.',
}

export interface UseSpeechDictationOptions {
  lang?: string
  /** Called with each finalised, normalised chunk of text. */
  onCommit(text: string): void
}

export interface UseSpeechDictationResult {
  supported: boolean
  status: DictationStatus
  listening: boolean
  interim: string
  level: number
  confidence: number | null
  error: string | null
  start(): void
  stop(): void
  toggle(): void
}

export function useSpeechDictation({ lang = 'fa-IR', onCommit }: UseSpeechDictationOptions): UseSpeechDictationResult {
  const [supported] = useState<boolean>(() => isDictationSupported())
  const [status, setStatus] = useState<DictationStatus>(() => (isDictationSupported() ? 'idle' : 'unsupported'))
  const [interim, setInterim] = useState('')
  const [level, setLevel] = useState(0)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const launchRef = useRef<(() => void) | null>(null)
  const commitRef = useRef(onCommit)
  const wantedRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const frameRef = useRef(0)
  const levelRef = useRef(0)
  const restartRef = useRef(0)

  useEffect(() => {
    commitRef.current = onCommit
  }, [onCommit])

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
      setStatus('listening')
      setError(null)
    }

    recognition.onresult = (event) => {
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
      if (finalised.trim()) {
        const clean = normalizeDictatedText(finalised)
        if (clean) commitRef.current(clean)
        if (lastConfidence !== null && Number.isFinite(lastConfidence) && lastConfidence > 0) setConfidence(lastConfidence)
      }
      setInterim(normalizeDictatedText(pending, { keepTrailingSpace: true }))
    }

    recognition.onerror = (event) => {
      // A pause in speech or our own stop() must not look like a failure.
      if (event.error === 'no-speech' || event.error === 'aborted') return
      wantedRef.current = false
      setError(ERROR_MESSAGES[event.error] ?? 'تبدیل گفتار به متن با خطا متوقف شد.')
      setStatus('error')
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setInterim('')
      if (!wantedRef.current) {
        setStatus((previous) => (previous === 'error' ? previous : 'idle'))
        return
      }
      restartRef.current = window.setTimeout(() => {
        restartRef.current = 0
        if (wantedRef.current) launchRef.current?.()
      }, 250)
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      /* start() throws when a session is still closing; onend recovers. */
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
    setError(null)
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
        setError(ERROR_MESSAGES['not-allowed'])
        return
      }
      if (!wantedRef.current) return
      launchRef.current?.()
    })()
  }, [startMeter, supported])

  const stop = useCallback(() => {
    wantedRef.current = false
    if (restartRef.current) {
      window.clearTimeout(restartRef.current)
      restartRef.current = 0
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
    setInterim('')
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
    listening: status === 'listening' || status === 'starting',
    interim,
    level,
    confidence,
    error,
    start,
    stop,
    toggle,
  }
}
