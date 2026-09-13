import type { Meeting } from '../../../domain/entities'
import { EmptyState, StatusBadge, Table, type TableColumn } from '../../../components/ui'
import { formatPersianDate } from '../../../core/utils'
import { meetingStatusTone } from './meetingTokens'
import { meetingStatusLabels } from '../../../demo'
const columns: readonly TableColumn<Meeting>[] = [
 { key: 'title', header: 'عنوان جلسه', wrap: true, cell: (meeting) => meeting.title },
 { key: 'start', header: 'تاریخ برگزاری', cell: (meeting) => formatPersianDate(meeting.startTime, { dateStyle: 'medium', timeStyle: 'short' }) },
 {
  key: 'status', header: 'وضعیت',
  cell: (meeting) => <StatusBadge
   tone={meetingStatusTone(meeting.status as never)}
   label={meetingStatusLabels[meeting.status as keyof typeof meetingStatusLabels] ?? meeting.status}
   size="sm" />,
 },
]
/** Domain-entity meeting list rendered with the shared enterprise Table. */
export const MeetingList = ({ meetings, onOpen }: { meetings: readonly Meeting[]; onOpen?(meeting: Meeting): void }) => (
 <Table
  columns={columns}
  rows={meetings}
  rowKey={(meeting) => meeting.id}
  caption="فهرست جلسات"
  zebra
  density="compact"
  onRowActivate={onOpen}
  emptyState={<EmptyState title="جلسه‌ای یافت نشد" description="جلسه‌ای برای نمایش وجود ندارد." compact />} />
)
