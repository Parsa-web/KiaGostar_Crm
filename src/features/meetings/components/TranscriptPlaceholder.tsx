/**
 * TranscriptPlaceholder — placeholder UI shown after meeting completion.
 *
 * This maintains the structural slot for future transcript integration
 * without implementing any STT or API calls.
 */

import { WorkPanel } from '../../../components/work'
import { EmptyState } from '../../../components/ui'

export function TranscriptPlaceholder() {
  return (
    <WorkPanel
      title="متن جلسه (Transcript)"
      icon="report"
      description="پیاده‌سازی متنی جلسه از فایل صوتی"
    >
      <div className="meeting-transcript__placeholder">
        <EmptyState
          variant="inline"
          icon="report"
          title="Transcript"
          description="در این نسخه تبدیل صوت به متن فعال نیست. در نسخه‌های آینده، متن جلسه از فایل صوتی استخراج و در این بخش نمایش داده خواهد شد."
        />
      </div>
    </WorkPanel>
  )
}
