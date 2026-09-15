import { useCallback, useState } from 'react'
import { Button, Icon, TextArea } from '../../../components/ui'
import { formatNumber } from '../../../core/utils'
import { useSpeechDictation } from '../hooks/useSpeechDictation'
import { appendDictatedText, deleteLastSentence, deleteLastWord, type DictationCommand } from '../utils/persianDictation'

/** Live input-level meter steps (RMS thresholds). */
const METER_STEPS = [0.08, 0.2, 0.34, 0.5, 0.7] as const

const VOICE_COMMANDS: readonly { say: string; does: string }[] = [
  { say: 'نقطه / ویرگول / نقطه ویرگول / دو نقطه', does: '. ، ؛ :' },
  { say: 'علامت سوال / علامت تعجب', does: '؟ !' },
  { say: 'پرانتز باز / بسته، گیومه باز / بسته، خط تیره', does: '( ) « » —' },
  { say: 'خط جدید / سرخط', does: 'رفتن به سطر بعد' },
  { say: 'پاراگراف جدید', does: 'شروع بند تازه' },
  { say: 'حذف کلمه / حذف جمله', does: 'پاک کردن آخرین کلمه یا جمله' },
]

const STATUS_LABELS: Readonly<Record<string, string>> = {
  starting: 'در حال آماده‌سازی میکروفن…',
  listening: 'در حال شنیدن؛ با لحن عادی و شمرده صحبت کنید.',
  recovering: 'اتصال مجدد به سرویس گفتار… متن قبلی حفظ شده است.',
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
 * Textarea with live Persian dictation. Typing keeps working exactly as before;
 * the mic only appends finalised text, so nothing the user typed is ever lost.
 */
export function DictationField({ label, value, onChange, error, rows = 8, maxLength, required, autoFocus, showCounter = true, helperText }: DictationFieldProps) {
  const [showCommands, setShowCommands] = useState(false)

  const handleCommit = useCallback(
    (text: string) => {
      const next = appendDictatedText(value, text)
      onChange(maxLength ? next.slice(0, maxLength) : next)
    },
    [maxLength, onChange, value],
  )

  const handleCommand = useCallback(
    (command: DictationCommand) => {
      onChange(command === 'deleteWord' ? deleteLastWord(value) : deleteLastSentence(value))
    },
    [onChange, value],
  )

  const dictation = useSpeechDictation({ onCommit: handleCommit, onCommand: handleCommand })
  const statusLabel = STATUS_LABELS[dictation.status]

  return (
    <div className="dictation-field">
      <TextArea
        label={label}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
              variant={dictation.listening ? 'danger' : 'secondary'}
              onClick={dictation.toggle}
              aria-pressed={dictation.listening}
            >
              <Icon name={dictation.listening ? 'mic-off' : 'mic'} size="sm16" />
              {dictation.listening ? 'پایان گویش' : 'گویش فارسی'}
            </Button>

            {dictation.listening && (
              <span className="dictation-field__meter" aria-hidden="true">
                {METER_STEPS.map((step) => (
                  <span key={step} className={`dictation-field__meter-bar${dictation.level >= step ? ' is-active' : ''}`} />
                ))}
              </span>
            )}

            <Button type="button" variant="ghost" onClick={() => setShowCommands((open) => !open)} aria-expanded={showCommands}>
              دستورهای صوتی
            </Button>
          </>
        ) : (
          <p className="dictation-field__note">تبدیل گفتار به متن در این مرورگر پشتیبانی نمی‌شود؛ از کروم یا اج استفاده کنید.</p>
        )}
      </div>

      <p className="dictation-field__status" role="status" aria-live="polite">
        {statusLabel}
        {dictation.interim && <span className="dictation-field__interim"> «{dictation.interim}»</span>}
        {dictation.confidence !== null && dictation.status === 'listening' && (
          <span className="dictation-field__confidence"> — دقت تشخیص {formatNumber(Math.round(dictation.confidence * 100))}٪</span>
        )}
      </p>

      {dictation.notice && !dictation.error && <p className="dictation-field__note" role="status" aria-live="polite">{dictation.notice}</p>}
      {dictation.error && <p className="dictation-field__error" role="alert">{dictation.error}</p>}

      {showCommands && (
        <dl className="dictation-field__commands">
          {VOICE_COMMANDS.map((command) => (
            <div key={command.say} className="dictation-field__command">
              <dt>{command.say}</dt>
              <dd>{command.does}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
