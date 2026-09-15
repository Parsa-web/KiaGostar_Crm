/**
 * RecordingStatusPanel — shows recording state, elapsed time, and controls.
 */

import { memo } from 'react'
import { Button, StatusBadge } from '../../../components/ui'
import { WorkPanel } from '../../../components/work'
import type { MasterRecordingStatus } from '../hooks/useMasterRecording'
import { formatRecordingTime } from '../hooks/useMasterRecording'

const STATUS_LABEL: Record<MasterRecordingStatus, string> = {
  idle: 'آماده',
  recording: 'در حال ضبط',
  paused: 'موقتاً متوقف',
  completed: 'تکمیل شد',
}
const STATUS_TONE: Record<MasterRecordingStatus, 'neutral' | 'success' | 'warning' | 'info'> = {
  idle: 'neutral',
  recording: 'success',
  paused: 'warning',
  completed: 'info',
}

export interface RecordingStatusPanelProps {
  status: MasterRecordingStatus
  elapsedMs: number
  error?: string | null
  canStart: boolean
  canPause: boolean
  canResume: boolean
  canStop: boolean
  onStart(): void
  onPause(): void
  onResume(): void
  onStop(): void
}

export const RecordingStatusPanel = memo(function RecordingStatusPanel({
  status,
  elapsedMs,
  error,
  canStart,
  canPause,
  canResume,
  canStop,
  onStart,
  onPause,
  onResume,
  onStop,
}: RecordingStatusPanelProps) {
  return (
    <WorkPanel
      title="وضعیت ضبط"
      icon="report"
      actions={
        <StatusBadge tone={STATUS_TONE[status]} label={STATUS_LABEL[status]} size="sm" />
      }
    >
      <div className="recording-status">
        {/* Elapsed time */}
        <div className="recording-status__timer">
          <span className="recording-status__timer-digits" dir="ltr">
            {formatRecordingTime(elapsedMs)}
          </span>
          {status === 'recording' && (
            <span className="recording-status__indicator" aria-label="در حال ضبط">
              <span className="recording-status__dot" />
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="recording-status__controls">
          {status === 'idle' && (
            <Button size="sm" variant="success" onClick={onStart} disabled={!canStart}>
              شروع ضبط
            </Button>
          )}
          {status === 'recording' && (
            <>
              <Button size="sm" variant="warning" onClick={onPause} disabled={!canPause}>
                توقف موقت
              </Button>
              <Button size="sm" variant="secondary" onClick={onStop} disabled={!canStop}>
                پایان ضبط
              </Button>
            </>
          )}
          {status === 'paused' && (
            <>
              <Button size="sm" variant="success" onClick={onResume} disabled={!canResume}>
                ادامه ضبط
              </Button>
              <Button size="sm" variant="secondary" onClick={onStop} disabled={!canStop}>
                پایان ضبط
              </Button>
            </>
          )}
          {status === 'completed' && (
            <span className="recording-status__completed">ضبط با موفقیت ذخیره شد.</span>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="recording-status__error" role="alert">{error}</p>
        )}
      </div>
    </WorkPanel>
  )
})
