import { ErrorState } from '../../../components'
import type { VoiceService } from '../services'
import { useVoiceRecorder } from '../hooks'

export const VoiceRecorder = ({ service, onTranscriptChange }: { service: VoiceService; onTranscriptChange?: (value: string) => void }) => {
  const voice = useVoiceRecorder(service)
  return <section className="voice-recorder"><div className="button-row"><button type="button" onClick={voice.start} disabled={voice.recording}>شروع ضبط</button><button type="button" onClick={voice.stop} disabled={!voice.recording}>توقف</button><button type="button" onClick={voice.clear}>پاک‌کردن</button></div>{voice.error && <ErrorState message={voice.error} />}<textarea aria-label="متن پیاده‌سازی‌شده" value={voice.transcript} onChange={(event) => onTranscriptChange?.(event.target.value)} rows={8} /></section>
}
