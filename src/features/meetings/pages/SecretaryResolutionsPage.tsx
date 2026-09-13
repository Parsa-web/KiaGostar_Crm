import { useMemo, useState } from 'react'
import { Button, EmptyState, Icon, SearchField, StatusBadge, Toolbar } from '../../../components/ui'
import { WorkPanel } from '../../../components/work'
import { formatPersianDate } from '../../../core/utils'
import { meetingStatusLabels, useDemoState } from '../../../demo'
import { meetingStatusTone } from '../components/meetingTokens'

export function SecretaryResolutionsPage({ onOpenMeeting,onOpenTask }: { onOpenMeeting?(meetingId: string): void;onOpenTask?(taskId:string):void }) {
  const store = useDemoState()
  const [keyword,setKeyword]=useState('')
  const [status,setStatus]=useState<'ALL'|'OPEN'|'COMPLETED'>('ALL')
  const meetings = useMemo(() => store.meetings
    .filter((meeting) => meeting.status === 'COMPLETED')
    .filter((meeting)=>!keyword||meeting.title.includes(keyword)||store.resolutions.some((item)=>item.meetingId===meeting.id&&(item.title.includes(keyword)||item.assigneeName.includes(keyword))))
    .filter((meeting)=>status==='ALL'||store.resolutions.some((item)=>item.meetingId===meeting.id&&(status==='COMPLETED'?item.status==='COMPLETED':item.status!=='COMPLETED')))
    .slice()
    .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()), [keyword,status,store.meetings,store.resolutions])

  return <div className="module-page secretary-resolutions">
    <Toolbar title="مصوبات" subtitle="صورت‌جلسه‌ها و مصوبات جلسات برگزارشده؛ همه ویرایش‌ها در وظایف مرتبط نیز اعمال می‌شوند." actions={<SearchField label="جستجوی مصوبات" placeholder="جلسه، مصوبه یا مسئول…" value={keyword} onChange={(event)=>setKeyword(event.target.value)}/>}/>
    <div className="filter-row" role="group" aria-label="فیلتر وضعیت مصوبات">{([{id:'ALL',label:'همه'},{id:'OPEN',label:'باز'},{id:'COMPLETED',label:'تکمیل‌شده'}] as const).map((item)=><Button key={item.id} size="sm" variant={status===item.id?'primary':'ghost'} onClick={()=>setStatus(item.id)}>{item.label}</Button>)}</div>
    {!meetings.length && <EmptyState icon="check-square" title="جلسه برگزارشده‌ای وجود ندارد" description="پس از پایان جلسه، صورت‌جلسه و مصوبات آن در این بخش در دسترس منشی قرار می‌گیرد." />}
    <div className="stack">
      {meetings.map((meeting) => {
        const workspace = store.meetingWorkspaces[meeting.id]
        const resolutions = store.resolutions.filter((item) => item.meetingId === meeting.id)
        return <WorkPanel
          key={meeting.id}
          title={meeting.title}
          icon="report"
          count={resolutions.length}
          description={`${formatPersianDate(meeting.startTime, { dateStyle: 'full', timeStyle: 'short' })} · ${meeting.location}`}
          actions={<Button size="sm" onClick={() => onOpenMeeting?.(meeting.id)}>ویرایش صورت‌جلسه و مصوبات</Button>}>
          <div className="secretary-resolutions__meta">
            <StatusBadge tone={meetingStatusTone(meeting.status)} label={meetingStatusLabels[meeting.status]} size="sm" />
            <span><Icon name="user" size="xs" /> برگزارکننده: {meeting.organizerName}</span>
            <span><Icon name="users" size="xs" /> {meeting.participantCount.toLocaleString('fa-IR')} شرکت‌کننده</span>
          </div>
          <p className="secretary-resolutions__minutes">{workspace?.minutes?.trim() || 'صورت‌جلسه‌ای ثبت نشده است.'}</p>
          {resolutions.length > 0 && <ul className="secretary-resolutions__list">
            {resolutions.map((resolution) => <li key={resolution.id}>
              <span><strong>{resolution.title}</strong><small>مسئول: {resolution.assigneeName} · مهلت: {formatPersianDate(resolution.dueDate,{dateStyle:'short'})}</small></span>
              <span className="secretary-resolutions__actions"><StatusBadge status={resolution.status} size="sm" />{resolution.taskId&&<Button size="sm" variant="ghost" onClick={()=>onOpenTask?.(resolution.taskId as string)}>وظیفه مرتبط</Button>}</span>
            </li>)}
          </ul>}
        </WorkPanel>
      })}
    </div>
  </div>
}
