/**
 * useAudioEngine — shared audio playback engine for Master Recording and
 * Topic Segments.  Uses a SINGLE module-level HTMLAudioElement so only
 * one audio resource is loaded in the browser at any time.
 *
 * All timing comes from the HTMLAudioElement itself;
 * no timers or setInterval are used as source-of-truth for playback position.
 *
 * Usage:
 *  - Master:  useAudioEngine({ src })
 *  - Topic:   useAudioEngine({ src, startSec: 120, endSec: 185 })
 *
 * When a new hook activates (via play), any previously-active hook is paused.
 * Topic segments are clamped to [startSec, endSec] on every timeupdate.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface AudioEngineOptions {
  /** Object URL of the audio file. */
  src: string | null
  /** Start offset in seconds (for topic segments). */
  startSec?: number
  /** End offset in seconds (for topic segments). */
  endSec?: number
}

export interface AudioEngineState {
  playing: boolean
  currentTime: number
  duration: number
  progress: number
  loaded: boolean
  buffering: boolean
  error: string | null
}

export interface AudioEngineActions {
  play(): void
  pause(): void
  toggle(): void
  /** Seek to a relative position in seconds (topic-relative for topics). */
  seek(relativeSec: number): void
  /** Seek to a percentage (0–1). */
  seekPercent(pct: number): void
}

export type AudioEngineReturn = AudioEngineState & AudioEngineActions

/* ------------------------------------------------------------------ */
/*  Singleton shared audio element                                     */
/* ------------------------------------------------------------------ */

let sharedAudio: HTMLAudioElement | null = null

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio()
    sharedAudio.preload = 'auto'
  }
  return sharedAudio
}

/**
 * Listeners registered by active engines.  When one engine calls `play()`,
 * it invokes all other listeners so they can update their state.
 */
const engineListeners = new Set<() => void>()

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

const EMPTY_STATE: AudioEngineState = {
  playing: false, currentTime: 0, duration: 0, progress: 0,
  loaded: false, buffering: false, error: null,
}

export function useAudioEngine(options: AudioEngineOptions): AudioEngineReturn {
  const { src, startSec = 0, endSec } = options
  const isSegment = startSec > 0 || (endSec !== undefined && endSec > 0)
  const segmentDuration = isSegment && endSec !== undefined ? endSec - startSec : undefined

  const [state, setState] = useState<AudioEngineState>(EMPTY_STATE)
  const stateRef = useRef<AudioEngineState>(EMPTY_STATE)

  /** Latest options in a ref so event handlers never go stale. */
  const optsRef = useRef({ src, startSec, endSec, isSegment, segmentDuration })
  optsRef.current = { src, startSec, endSec, isSegment, segmentDuration }

  /** Whether THIS hook instance is the currently active one. */
  const isActiveRef = useRef(false)

  /** Prevent timeupdate → setState loops when we seek programmatically. */
  const guardRef = useRef(false)

  const updateState = useCallback((patch: Partial<AudioEngineState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      // Clamp topic-relative values
      const opts = optsRef.current
      if (opts.isSegment && opts.endSec !== undefined) {
        if (next.currentTime < 0) next.currentTime = 0
        const segDur = opts.segmentDuration ?? 0
        if (next.currentTime > segDur) next.currentTime = segDur
      }
      stateRef.current = next
      return next
    })
  }, [])

  /* ---- Subscribe to the shared audio element's events ---- */
  useEffect(() => {
    if (!src) return

    const audio = getSharedAudio()
    let disposed = false

    // Set source if it changed
    if (audio.src !== src) {
      audio.src = src
      audio.load()
    }

    const syncPosition = () => {
      if (disposed) return
      // Only the active engine syncs state — prevents master's progress bar
      // from moving when a topic is playing (and vice-versa).
      if (!isActiveRef.current) return
      if (guardRef.current) return // we are seeking programmatically

      const opts = optsRef.current
      const ct = audio.currentTime
      const dur = audio.duration
      if (!Number.isFinite(dur) || dur <= 0) return

      if (opts.isSegment && opts.endSec !== undefined) {
        // Boundary enforcement
        if (ct >= opts.endSec) {
          audio.pause()
          guardRef.current = true
          audio.currentTime = opts.endSec
          guardRef.current = false
          updateState({
            playing: false,
            currentTime: opts.segmentDuration ?? 0,
            duration: opts.segmentDuration ?? 0,
            progress: 1,
          })
          return
        }
        if (ct < opts.startSec) {
          guardRef.current = true
          audio.currentTime = opts.startSec
          guardRef.current = false
        }
        const rel = ct - opts.startSec
        const segDur = opts.segmentDuration ?? (opts.endSec - opts.startSec)
        updateState({
          currentTime: Math.max(0, Math.min(rel, segDur)),
          duration: segDur,
          progress: segDur > 0 ? Math.max(0, Math.min(rel / segDur, 1)) : 0,
        })
      } else {
        updateState({
          currentTime: ct,
          duration: dur,
          progress: dur > 0 ? Math.max(0, Math.min(ct / dur, 1)) : 0,
        })
      }
    }

    const onLoadedMetadata = () => {
      if (disposed) return
      const opts = optsRef.current
      // NOTE: We do NOT seek to startSec here. For segments, seeking is
      // done only in play() to avoid corrupting the shared audio position
      // when multiple AudioPlayer instances mount simultaneously.
      updateState({
        loaded: true,
        duration: opts.isSegment ? (opts.segmentDuration ?? 0) : audio.duration,
      })
    }

    const onTimeUpdate = syncPosition
    const onDurationChange = syncPosition

    const onPlay = () => { if (!disposed && isActiveRef.current) updateState({ playing: true, buffering: false }) }
    const onPause = () => { if (!disposed && isActiveRef.current) updateState({ playing: false }) }
    const onEnded = () => {
      if (disposed || !isActiveRef.current) return
      updateState({ playing: false })
      const opts = optsRef.current
      if (opts.isSegment && opts.endSec !== undefined) {
        guardRef.current = true
        audio.currentTime = opts.endSec
        guardRef.current = false
      }
    }
    const onWaiting = () => { if (!disposed && isActiveRef.current) updateState({ buffering: true }) }
    const onCanPlay = () => { if (!disposed && isActiveRef.current) updateState({ buffering: false }) }
    const onError = () => {
      if (disposed) return
      const err = audio.error
      updateState({ error: `خطا در بارگذاری صدا: ${err?.message ?? 'ناشناخته'}`, playing: false })
    }

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('error', onError)

    // If metadata is already loaded (cached src), initialize immediately
    if (audio.readyState >= 1 && Number.isFinite(audio.duration) && audio.duration > 0) {
      const opts = optsRef.current
      // NOTE: No seek for segments here — only play() should seek.
      updateState({
        loaded: true,
        currentTime: opts.isSegment ? 0 : audio.currentTime,
        duration: opts.isSegment ? (opts.segmentDuration ?? 0) : audio.duration,
      })
    }

    return () => {
      disposed = true
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('error', onError)
    }
  }, [src, updateState])

  /* ---- Exclusive playback: when another engine starts, pause this one ---- */
  const onOtherEnginesPlay = useCallback(() => {
    if (!isActiveRef.current) return
    const audio = getSharedAudio()
    if (!audio.paused) {
      audio.pause()
    }
    isActiveRef.current = false
    updateState({ playing: false })
  }, [updateState])

  useEffect(() => {
    engineListeners.add(onOtherEnginesPlay)
    return () => { engineListeners.delete(onOtherEnginesPlay) }
  }, [onOtherEnginesPlay])

  /* ---- Actions ---- */
  const play = useCallback(() => {
    const audio = getSharedAudio()
    if (!src) return

    // If the source changed, update it
    if (audio.src !== src) {
      audio.src = src
      audio.load()
    }

    // Already playing — no-op to prevent double-play on rapid clicks.
    if (isActiveRef.current && !audio.paused) return

    // Activate THIS engine: pause all others
    engineListeners.forEach((cb) => cb())
    isActiveRef.current = true

    // Ensure we're within the segment range
    const opts = optsRef.current
    if (opts.isSegment) {
      guardRef.current = true
      if (audio.currentTime < opts.startSec) audio.currentTime = opts.startSec
      if (opts.endSec !== undefined && audio.currentTime >= opts.endSec) {
        audio.currentTime = opts.startSec
      }
      guardRef.current = false
    }

    audio.play().catch(() => {
      updateState({ error: 'پخش صدا ممکن نیست.' })
    })
  }, [src, updateState])

  const pause = useCallback(() => {
    const audio = getSharedAudio()
    audio.pause()
    isActiveRef.current = false
  }, [])

  const toggle = useCallback(() => {
    if (stateRef.current.playing) pause()
    else play()
  }, [play, pause])

  const seek = useCallback((relativeSec: number) => {
    const audio = getSharedAudio()
    const opts = optsRef.current
    guardRef.current = true

    if (opts.isSegment && opts.segmentDuration !== undefined) {
      const clamped = Math.max(0, Math.min(relativeSec, opts.segmentDuration))
      const masterTarget = opts.startSec + clamped
      audio.currentTime = masterTarget
      updateState({
        currentTime: clamped,
        progress: opts.segmentDuration > 0 ? clamped / opts.segmentDuration : 0,
      })
    } else {
      const dur = audio.duration || 0
      const target = Math.max(0, Math.min(relativeSec, dur))
      audio.currentTime = target
      updateState({
        currentTime: target,
        progress: dur > 0 ? Math.max(0, Math.min(target / dur, 1)) : 0,
      })
    }

    setTimeout(() => { guardRef.current = false }, 50)
  }, [updateState])

  const seekPercent = useCallback((pct: number) => {
    const opts = optsRef.current
    if (opts.isSegment && opts.segmentDuration !== undefined) {
      seek(Math.max(0, Math.min(pct, 1)) * opts.segmentDuration)
    } else {
      seek(Math.max(0, Math.min(pct, 1)) * stateRef.current.duration)
    }
  }, [seek])

  return { ...state, play, pause, toggle, seek, seekPercent }
}
