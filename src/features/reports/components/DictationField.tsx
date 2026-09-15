import { useCallback, useRef, useState } from 'react'
import { Button, Icon, TextArea } from '../../../components/ui'
import { formatNumber } from '../../../core/utils'
import { useSpeechDictation } from '../hooks/useSpeechDictation'
import { appendDictatedText, previewDictation } from '../utils/persianDictation'

/** Live input-level meter steps (RMS thresholds). */
const METER_STEPS = [0.08, 0.2, 0.34, 0.5, 0.7] as const

const VOICE_HINTS: readonly { say: string; does: string }[] = [
  { say: 'نقطه / ویرگول / نقطه ویرگول / دو نقطه', does: '. ، ؛ :' },
  { say: 'علامت سوال / علامت تعجب', does: '؟ !' },
  { say: 'پرانتز باز / بسته، گیومه باز / بسته', does: '( ) « »' },
  { say: 'خط جدید / سرخط', does: 'سطر بعد' },
  { say: 'پاراگراف جدید', does: 'بند تازه' },
]

const STATUS_LABELS: Readonly<Record<string, string>> = {
  starting: 'در حال آماده‌سازی میکروفن…',
  listening: 'در حال شنیدن؛ متن همزمان نوشته می‌شود.',
  recovering: 'اتصال مجدد به سرویس گفتار… متن شما حفظ شده است.',
}

export interface DictationFieldProps {
  label: string
  value: string
  onChange(value: string): void
  error?: string
  rows?: number
  maxLength?: number
  required?: boolean
  autoFocus?: boolean
  showCounter?: boolean
  helperText?: string
}

/**
 * Textarea with live Persian dictation.
 *
 * Recognised words are written into the field itself while the user speaks.
 * `anchorRef` holds the text that is already settled (typed or finalised), and
 * the still-open guess is re-rendered after it. Because every update is rebuilt
 * from the anchor instead of patching the visible value, a revised guess can
 * never eat text that was already confirmed.
 */
export function DictationField({ label, value, onChange, error, rows = 8, maxLength, required, autoFocus, showCounter = true, helperText }: DictationFieldProps) {
  const [showHints, setShowHints] = useState(false)
  const anchorRef = useRef(value)

  const clip = useCallback((text: string) => (maxLength ? text.slice(0, maxLength) : text), [maxLength])

  /** Manual typing wins: it becomes the new anchor. */
  const handleManualChange = useCallback(
    (next: string) => {
      anchorRef.current = next
      onChange(next)
    },
    [onChange],
  )

  const handleInterim = useCallback(
    (text: string) => {
      onChange(clip(text ? appendDictatedText(anchorRef.current, text) : anchorRef.current))
    },
    [clip, onChange],
  )

  const handleCommit = useCallback(
    (text: string) => {
      anchorRef.current = clip(appendDictatedText(anchorRef.current, text))
      onChange(anchorRef.current)
    },
    [clip, onChange],
  )

  const dictation = useSpeechDictation({ onCommit: handleCommit, onInterim: handleInterim })
  const statusLabel = STATUS_LABELS[dictation.status]

  const toggle = useCallback(() => {
    // Start from whatever is in the field right now.
    if (!dictation.listening) anchorRef.current = value
    dictation.toggle()
  }, [dictation, value])

  return (
    <div className="dictation-field">
      <TextArea
        label={label}
        required={required}
        value={value}
        onChange={(event) => handleManualChange(event.target.value)}
        error={error}
        rows={rows}
        maxLength={maxLength}
        showCounter={showCounter}
        helperText={helperText}
        autoFocus={autoFocus}
        autoResize
      />

      <div className="dictation-field__bar">
        {dictation.supported ? (
          <>
            <Button
              type="button"
              size="sm"
              iconOnly
              variant={dictation.listening ? 'danger' : 'ghost'}
              onClick={toggle}
              pressed={dictation.listening}
              aria-label={dictation.listening ? 'پایان گویش فارسی' : 'شروع گویش فارسی'}
              title={dictation.listening ? 'پایان گویش فارسی' : 'شروع گویش فارسی'}
              startIcon={<Icon name={dictation.listening ? 'mic-off' : 'mic'} size="sm16" />}
            />

            {dictation.listening && (
              <span className="dictation-field__meter" aria-hidden="true">
                {METER_STEPS.map((step) => (
                  <span key={step} className={`dictation-field__meter-bar${dictation.level >= step ? ' is-active' : ''}`} />
                ))}
              </span>
            )}

            {statusLabel && (
              <span className="dictation-field__status" role="status" aria-live="polite">
                {statusLabel}
                {dictation.confidence !== null && dictation.status === 'listening' && (
                  <span className="dictation-field__confidence"> — دقت {formatNumber(Math.round(dictation.confidence * 100))}٪</span>
                )}
              </span>
            )}

            <button type="button" className="dictation-field__help" onClick={() => setShowHints((open) => !open)} aria-expanded={showHints}>
              دستورهای صوتی
            </button>
          </>
        ) : (
          <p className="dictation-field__note">تبدیل گفتار به متن در این مرورگر پشتیبانی نمی‌شود؛ از کروم یا اج استفاده کنید.</p>
        )}
      </div>

      {dictation.notice && !dictation.error && <p className="dictation-field__note" role="status" aria-live="polite">{dictation.notice}</p>}
      {dictation.error && <p className="dictation-field__error" role="alert">{dictation.error}</p>}

      {showHints && (
        <dl className="dictation-field__hints">
          {VOICE_HINTS.map((hint) => (
            <div key={hint.say} className="dictation-field__hint">
              <dt>{hint.say}</dt>
              <dd>{previewDictation(hint.does) || hint.does}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
