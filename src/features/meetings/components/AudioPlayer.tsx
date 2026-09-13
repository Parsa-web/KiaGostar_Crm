/**
 * AudioPlayer — a shared, self-contained audio player component for both
 * Master Recording and Topic Segments.
 *
 * All timing comes from the HTMLAudioElement; no timers are used as
 * source-of-truth for playback position.
 *
 * Usage:
 *  - Master:  <AudioPlayer src={url} label="صدای جلسه" />
 *  - Topic:   <AudioPlayer src={url} startSec={120} endSec={185} label="موضوع ۱" />
 */

import { memo, useCallback, useRef } from 'react'
import { Button, Icon } from '../../../components/ui'
import { useAudioEngine, type AudioEngineReturn } from '../hooks/useAudioEngine'
import { formatRecordingTime } from '../hooks/useMasterRecording'

export interface AudioPlayerProps {
  /** Object URL of the audio file. */
  src: string | null
  /** Label shown next to the player (e.g. topic title). */
  label?: string
  /** Start offset in seconds (for topic segments). */
  startSec?: number
  /** End offset in seconds (for topic segments). */
  endSec?: number
  /** Show the time range header? Default true. */
  showHeader?: boolean
  /** Optional CSS class. */
  className?: string
  /** If provided, the player uses this engine (for parent-controlled exclusive playback). */
  engine?: AudioEngineReturn
}

export const AudioPlayer = memo(function AudioPlayer({
  src,
  label,
  startSec = 0,
  endSec,
  showHeader = true,
  className,
  engine: externalEngine,
}: AudioPlayerProps) {
  const internalEngine = useAudioEngine({ src, startSec, endSec })
  const engine = externalEngine ?? internalEngine
  const { playing, currentTime, duration, progress, loaded, buffering, error, toggle, seekPercent } = engine

  const barRef = useRef<HTMLDivElement>(null)

  const handleBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = barRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekPercent(pct)
  }, [seekPercent])

  const handleBarKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') seekPercent(Math.min(1, progress + 0.05))
    else if (e.key === 'ArrowLeft') seekPercent(Math.max(0, progress - 0.05))
  }, [seekPercent, progress])

  // Error state
  if (error) {
    return (
      <div className={`audio-player audio-player--error${className ? ` ${className}` : ''}`}>
        {label && <div className="audio-player__label">{label}</div>}
        <p className="audio-player__error" role="alert">{error}</p>
      </div>
    )
  }

  return (
    <div className={`audio-player${className ? ` ${className}` : ''}`}>
      {/* Header: label + time range */}
      {showHeader && (
        <div className="audio-player__header">
          {label && <span className="audio-player__label">{label}</span>}
          <span className="audio-player__time" dir="ltr">
            {formatRecordingTime(currentTime * 1000)}
            {duration > 0 && (
              <>
                <span className="audio-player__time-sep"> / </span>
                {formatRecordingTime(duration * 1000)}
              </>
            )}
          </span>
        </div>
      )}

      {/* Controls + progress bar */}
      <div className="audio-player__controls">
        <Button
          size="sm"
          variant={playing ? 'warning' : 'primary'}
          onClick={toggle}
          disabled={!loaded && !playing}
          aria-label={playing ? 'توقف' : 'پخش'}
        >
          <Icon name={playing ? 'pause' : 'play'} size="sm" />
          {playing ? 'توقف' : 'پخش'}
        </Button>

        <div
          ref={barRef}
          className="audio-player__bar"
          role="slider"
          tabIndex={0}
          aria-label="نوار پیشرفت"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          onClick={handleBarClick}
          onKeyDown={handleBarKeyDown}
        >
          <div
            className="audio-player__progress"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>

        {buffering && <span className="audio-player__buffering">⏳</span>}
      </div>
    </div>
  )
})
