import { memo, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { Button, StatusBadge } from '../../../components/ui'
import { useVoiceSnapshot } from '../hooks'
import type { VoiceService, VoiceStatus } from '../services'

export interface VoiceControlsProps {
  service: VoiceService
  startError?: string | null
  onStart(): void
  onPause(): void
  onResume(): void
  onStop(): void
  onClear(): void
  onInsert(transcript: string): void
  disabled?: boolean
}

const statusLabel: Readonly<Record<VoiceStatus, string>> = { idle: 'آماده', recording: 'در حال ضبط', paused: 'موقتاً متوقف' }
const statusTone: Readonly<Record<VoiceStatus, 'neutral' | 'success' | 'warning'>> = { idle: 'neutral', recording: 'success', paused: 'warning' }

/**
 * Lightweight audio-level diagnostic. Uses a separate getUserMedia stream
 * (does NOT interact with SpeechRecognition's internal pipeline) to compute
 * RMS level and approximate noise floor. Shows a bar + status label during
 * recording/paused states only.
 */
const AudioMeter = memo(function AudioMeter({ active }: { active: boolean }) {
  const barRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLSpanElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number>(0)

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (ctxRef.current?.state !== 'closed') ctxRef.current?.close()
    ctxRef.current = null
  }, [])

  useEffect(() => {
    if (!active) { cleanup(); return }
    let cancelled = false
    async function mount() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        const ctx = new AudioContext()
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        streamRef.current = stream
        ctxRef.current = ctx
        const data = new Uint8Array(analyser.frequencyBinCount)
        function tick() {
          analyser.getByteFrequencyData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) sum += data[i]
          const rms = sum / data.length / 255
          const pct = Math.min(100, Math.round(rms * 300))
          if (barRef.current) barRef.current.style.width = `${pct}%`
          if (statusRef.current) {
            const label = rms < 0.02 ? 'سکوت' : rms < 0.15 ? 'مناسب' : 'زیاد'
            statusRef.current.textContent = label
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        tick()
      } catch { /* mic unavailable — meter stays hidden */ }
    }
    mount()
    return () => { cancelled = true; cleanup() }
  }, [active, cleanup])

  if (!active) return null
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#666', marginBlockStart: 4 }}>
    <div style={{ flex: 1, height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
      <div ref={barRef} style={{ height: '100%', width: '0%', background: '#16a34a', transition: 'width 80ms linear' }} />
    </div>
    <span ref={statusRef}>سکوت</span>
  </div>
})

/**
 * The live caption.
 *
 * Split out and memoised so a partial result repaints this textarea alone: the
 * buttons, badge and word count around it keep their previous render. It is
 * also an uncontrolled textarea written through a ref, because React's
 * controlled-value path re-renders the subtree on every keystroke-rate update
 * and fights the browser over the scroll position while text streams in.
 */
const LiveTranscript = memo(function LiveTranscript({ finalText, interimText }: { finalText: string; interimText: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const text = interimText ? `${finalText} ${interimText}`.trim() : finalText
  useEffect(() => {
    const node = ref.current
    if (!node || node.value === text) return
    node.value = text
    /* Follow the speaker: the newest words must stay in view. */
    node.scrollTop = node.scrollHeight
  }, [text])
  return <textarea
    ref={ref}
    dir="rtl"
    className="meeting-live__voice-live"
    aria-label="متن زنده پیاده‌سازی‌شده"
    aria-live="polite"
    defaultValue={text}
    readOnly
    placeholder="گفتار جلسه به‌صورت زنده اینجا پیاده‌سازی می‌شود…"
  />
})

export function VoiceControls({ service, startError = null, onStart, onPause, onResume, onStop, onClear, onInsert, disabled = false }: VoiceControlsProps) {
  const { status, finalText, interimText, error } = useVoiceSnapshot(service)
  if (!service.isSupported()) {
    return <div className="meeting-live__voice meeting-live__voice--unsupported" role="alert">
      <StatusBadge tone="warning" label="پشتیبانی نشده" size="sm"/>
      <p>مرورگر جاری شما شناخت گفتار را پشتیبانی نمی‌کند. ویرایش دستی پیش‌نویس صورت‌جلسه همچنان فعال است.</p>
    </div>
  }
  const visibleError = error ?? startError
  /* Insert and clear act on committed text only, so a phrase still being
     recognised can never land in the minutes half-finished. */
  const hasTranscript = finalText.trim().length > 0
  const hasAnyText = hasTranscript || interimText.trim().length > 0
  let controls: ReactNode
  if (status === 'idle') controls = <Button size="sm" onClick={onStart} disabled={disabled}>شروع ضبط</Button>
  else if (status === 'recording') controls = <>
    <Button size="sm" variant="warning" onClick={onPause} disabled={disabled}>توقف موقت</Button>
    <Button size="sm" variant="secondary" onClick={onStop} disabled={disabled}>پایان ضبط</Button>
  </>
  else controls = <>
    <Button size="sm" variant="success" onClick={onResume} disabled={disabled}>ادامه ضبط</Button>
    <Button size="sm" variant="secondary" onClick={onStop} disabled={disabled}>پایان ضبط</Button>
  </>
  return <div className="meeting-live__voice">
    <div className="meeting-live__voice-header">
      <StatusBadge tone={statusTone[status]} label={statusLabel[status]} size="sm"/>
      {visibleError && <span className="meeting-live__voice-error" role="alert">{visibleError}</span>}
    </div>
    <LiveTranscript finalText={finalText} interimText={interimText} />
    <AudioMeter active={status === 'recording' || status === 'paused'} />
    <div className="meeting-live__voice-actions">
      {controls}
      <Button size="sm" variant="outline" onClick={onClear} disabled={disabled || !hasAnyText}>پاک‌کردن</Button>
      <Button size="sm" variant="secondary" onClick={() => onInsert(finalText)} disabled={disabled || !hasTranscript}>درج در صورت‌جلسه</Button>
      <Button size="sm" variant="outline" onClick={()=>{
       const blob=new Blob([finalText],{type:'text/plain;charset=utf-8'})
       const url=URL.createObjectURL(blob)
       const a=document.createElement('a');a.href=url;a.download=`transcript-${Date.now()}.txt`;a.click()
       URL.revokeObjectURL(url)
      }} disabled={disabled || !hasTranscript}>ذخیره متن</Button>
      <Button size="sm" variant="outline" onClick={()=>service.downloadAudio()} disabled={disabled || !service.hasAudioRecording()}>دانلود فایل صوتی</Button>
    </div>
    {hasTranscript && <p className="meeting-live__voice-count">{finalText.trim().split(/\s+/).length} واژه پیاده‌سازی‌شده</p>}
  </div>
}
