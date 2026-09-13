import type { Meeting } from '../../../domain/entities'
import type { VoiceService } from '../services'
import { VoiceRecorder } from '../components'
import { WorkPanel } from '../../../components/work'
/**
 * Meeting execution surface: the only meeting page that owns a device integration
 * (voice capture). Browsing, creation, details and the full workspace are provided by
 * the enterprise pages in `MeetingModulePages` / `MeetingWorkspacePage`.
 */
export const ActiveMeetingPage = ({ meeting, voiceService }: { meeting: Meeting; voiceService: VoiceService }) => (
 <section className="module-page" aria-label={`جلسه در حال برگزاری: ${meeting.title}`}>
  <WorkPanel title={meeting.title} icon="calendar" description="ضبط صدای جلسه برای تهیه صورت‌جلسه">
   <VoiceRecorder service={voiceService} />
  </WorkPanel>
 </section>
)
