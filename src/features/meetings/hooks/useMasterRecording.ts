/**
 * useMasterRecording — manages a single MediaRecorder for the entire meeting.
 *
 * Design constraints:
 *  - Only ONE MediaRecorder exists at any time.
 *  - Start / Pause / Resume / Stop are idempotent.
 *  - The stream is released on unmount or explicit stop.
 *  - MIME type is negotiated at startup via isTypeSupported.
 *  - stop() triggers recorder.stop(); the onstop handler (which fires AFTER
 *    the final dataavailable event) builds the blob and sets state.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export type MasterRecordingStatus = 'idle' | 'recording' | 'paused' | 'completed'

export interface MasterRecordingState {
  status: MasterRecordingStatus
  /** Milliseconds elapsed since recording started (resets on stop). */
  elapsedMs: number
  /** The final audio blob, available after status becomes 'completed'. */
  blob: Blob | null
  /** Error message if something went wrong. */
  error: string | null
}

const SUPPORTED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
]

function pickMimeType(): string {
  for (const mime of SUPPORTED_MIME_TYPES) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) return mime
  }
  return 'audio/webm'
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

export { formatMs as formatRecordingTime }

export interface UseMasterRecordingReturn extends MasterRecordingState {
  /** Request mic permission and start recording. Idempotent. */
  start(): Promise<void>
  /** Pause without finalizing. Idempotent. */
  pause(): void
  /** Resume after pause. Idempotent. */
  resume(): void
  /** Stop and finalize the recording. Idempotent. */
  stop(): void
}

export function useMasterRecording(): UseMasterRecordingReturn {
  const [status, setStatus] = useState<MasterRecordingStatus>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickerRef = useRef<number | 0>(0)
  const startedAtRef = useRef(0)
  const pausedElapsedRef = useRef(0)
  const mimeTypeRef = useRef('')

  const clearTicker = useCallback(() => {
    if (tickerRef.current) { cancelAnimationFrame(tickerRef.current); tickerRef.current = 0 }
  }, [])

  const startTicker = useCallback(() => {
    clearTicker()
    const tick = () => {
      const now = Date.now()
      const base = startedAtRef.current
      if (base > 0) setElapsedMs(pausedElapsedRef.current + (now - base))
      tickerRef.current = requestAnimationFrame(tick)
    }
    tickerRef.current = requestAnimationFrame(tick)
  }, [clearTicker])

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => { try { t.stop() } catch { /* noop */ } })
    streamRef.current = null
    recorderRef.current = null
  }, [])

  const start = useCallback(async () => {
    if (status === 'recording' || status === 'paused') return
    setError(null)
    setBlob(null)
    chunksRef.current = []
    pausedElapsedRef.current = 0
    setElapsedMs(0)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
      })
      streamRef.current = stream
      const mime = pickMimeType()
      mimeTypeRef.current = mime
      console.log('[REC] Starting MediaRecorder with mime:', mime)
      const recorder = new MediaRecorder(stream, { mimeType: mime })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
          console.log('[REC] Chunk:', e.data.size, 'bytes, total:', chunksRef.current.length)
        }
      }

      // onstop fires AFTER the final dataavailable event, so all chunks
      // are available when we build the blob here.
      recorder.onstop = () => {
        console.log('[REC] onstop — chunks:', chunksRef.current.length)
        const chunks = chunksRef.current
        chunksRef.current = []
        const finalBlob = chunks.length > 0
          ? new Blob(chunks, { type: mime })
          : null
        console.log('[REC] Blob:', finalBlob ? `${finalBlob.size} bytes, type=${finalBlob.type}` : 'NULL')
        cleanupStream()
        clearTicker()
        setBlob(finalBlob)
        setElapsedMs(prev => prev)
        setStatus('completed')
      }

      recorder.onerror = () => {
        console.error('[REC] MediaRecorder error')
        setError('خطا در ضبط صدا.')
        cleanupStream()
        clearTicker()
        setStatus('idle')
      }

      recorderRef.current = recorder
      recorder.start(1000)
      startedAtRef.current = Date.now()
      setStatus('recording')
      startTicker()
      console.log('[REC] Recording started')
    } catch (err: unknown) {
      console.error('[REC] Failed to start:', err)
      const msg = err instanceof DOMException
        ? err.name === 'NotAllowedError' ? 'دسترسی میکروفن رد شد.'
          : err.name === 'NotFoundError' ? 'میکروفنی یافت نشد.'
          : err.message || 'شروع ضبط ممکن نیست.'
        : 'شروع ضبط ممکن نیست.'
      setError(msg)
      cleanupStream()
      setStatus('idle')
    }
  }, [status, cleanupStream, clearTicker, startTicker])

  const pause = useCallback(() => {
    if (status !== 'recording') return
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return
    pausedElapsedRef.current += Date.now() - startedAtRef.current
    startedAtRef.current = 0
    recorder.pause()
    clearTicker()
    setStatus('paused')
    console.log('[REC] Paused')
  }, [status, clearTicker])

  const resume = useCallback(() => {
    if (status !== 'paused') return
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'paused') return
    recorder.resume()
    startedAtRef.current = Date.now()
    setStatus('recording')
    startTicker()
    console.log('[REC] Resumed')
  }, [status, startTicker])

  /**
   * Stop the MediaRecorder. The `onstop` handler (set in start()) fires
   * AFTER the browser delivers the final dataavailable event, so the blob
   * is built with ALL chunks including the last one.
   */
  const stop = useCallback(() => {
    if (status === 'idle' || status === 'completed') {
      console.log('[REC] stop() ignored — status:', status)
      return
    }
    const recorder = recorderRef.current
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
      console.log('[REC] stop() — calling recorder.stop()')
      try { recorder.stop() } catch { /* already stopped */ }
    } else {
      // Recorder gone (e.g. stream killed) — finalize with whatever we have.
      console.log('[REC] stop() — recorder unavailable, finalizing chunks')
      const chunks = chunksRef.current
      chunksRef.current = []
      const finalBlob = chunks.length > 0
        ? new Blob(chunks, { type: mimeTypeRef.current || 'audio/webm' })
        : null
      cleanupStream()
      clearTicker()
      setBlob(finalBlob)
      setElapsedMs(prev => prev)
      setStatus('completed')
    }
  }, [status, cleanupStream, clearTicker])

  // Cleanup on unmount — release tracks, do NOT create a blob.
  useEffect(() => {
    return () => {
      clearTicker()
      const recorder = recorderRef.current
      if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
        try { recorder.stop() } catch { /* noop */ }
      }
      cleanupStream()
    }
  }, [cleanupStream, clearTicker])

  return { status, elapsedMs, blob, error, start, pause, resume, stop }
}
