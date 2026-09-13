import type {ReactNode} from 'react'
import {Avatar,DataCard,EmptyState,KPIGrid,KPIWidget,Pagination,Select,StatusBadge,Tag} from '../../../components/ui'
import {formatPersianDate} from '../../../core/utils'
import {meetingStatusLabels,type MeetingParticipantView,type MeetingView} from '../../../demo'
import {attendanceTone,meetingModeOptions,meetingStatusOptions,meetingStatusTone,meetingTypeOptions,type MeetingStats} from './meetingTokens'
/** KPI strip reused on the meetings list and workspace headers. */
export function MeetingKpiRow({stats,loading=false,onSelectStatus}:{stats:MeetingStats;loading?:boolean;onSelectStatus?(status:string):void}){
 return <KPIGrid columns={4}>
  <KPIWidget title="کل جلسات" value={stats.total} icon="calendar" tone="primary" loading={loading} onActivate={onSelectStatus?()=>onSelectStatus(''):undefined} actionLabel="نمایش همه جلسات"/>
  <KPIWidget title="زمان‌بندی‌شده" value={stats.scheduled} icon="clock" tone="info" loading={loading} onActivate={onSelectStatus?()=>onSelectStatus('SCHEDULED'):undefined} actionLabel="نمایش جلسات زمان‌بندی‌شده"/>
  <KPIWidget title="لغوشده" value={stats.cancelled} icon="error" tone="danger" loading={loading} onActivate={onSelectStatus?()=>onSelectStatus('CANCELLED'):undefined} actionLabel="نمایش جلسات لغوشده"/>
  <KPIWidget title="برگزارشده" value={stats.completed} icon="check-square" tone="success" loading={loading} onActivate={onSelectStatus?()=>onSelectStatus('COMPLETED'):undefined} actionLabel="نمایش جلسات برگزارشده"/>
 </KPIGrid>
}
/** Advanced filter slots injected into the shared FilterBar. */
export function MeetingFilterSlots({status,type,mode,department,dateRange,departmentOptions,onChange}:{
 status:string;type:string;mode:string;department:string;dateRange:string;
 departmentOptions:readonly {value:string;label:string}[];
 onChange(key:'status'|'type'|'mode'|'department'|'dateRange',value:string):void
}){
 return <>
  <Select label="وضعیت" value={status} options={[{value:'',label:'همه وضعیت‌ها'},...meetingStatusOptions]} onChange={(value)=>onChange('status',value??'')}/>
  <Select label="نوع جلسه" value={type} options={[{value:'',label:'همه انواع'},...meetingTypeOptions]} onChange={(value)=>onChange('type',value??'')}/>
  <Select label="شیوه برگزاری" value={mode} options={[{value:'',label:'همه شیوه‌ها'},...meetingModeOptions]} onChange={(value)=>onChange('mode',value??'')}/>
  <Select label="واحد سازمانی" value={department} options={[{value:'',label:'همه واحدها'},...departmentOptions]} onChange={(value)=>onChange('department',value??'')} searchable/>
  <Select label="بازه زمانی" value={dateRange} options={[{value:'',label:'همه زمان‌ها'},{value:'upcoming',label:'آینده'},{value:'past',label:'گذشته'},{value:'thisMonth',label:'ماه جاری'}]} onChange={(value)=>onChange('dateRange',value??'')}/>
 </>
}
/** Person cell shared across meeting tables and participant lists. */
export function MeetingPersonCell({name,caption,avatar}:{name:string;caption?:string;avatar?:string}){
 return <span className="module-person">
  <Avatar name={name} alt={name} src={avatar} size="sm"/>
  <span className="module-person__body"><span className="module-person__name">{name}</span>{caption&&<span className="module-person__meta">{caption}</span>}</span>
 </span>
}
/** Card representation used by the meetings card view. */
export function MeetingCard({meeting,onOpen,actions}:{meeting:MeetingView;onOpen?(meeting:MeetingView):void;actions?:ReactNode}){
 return <DataCard
  title={meeting.title}
  subtitle={`${meeting.code} · ${meeting.typeLabel}`}
  icon="calendar"
  badge={<StatusBadge tone={meetingStatusTone(meeting.status)} label={meetingStatusLabels[meeting.status]} size="sm"/>}
  description={meeting.purpose}
  onActivate={onOpen?()=>onOpen(meeting):undefined}
  actions={actions}
  footer={<span className="meeting-card__footer">
   <span>{formatPersianDate(meeting.startTime,{dateStyle:'medium',timeStyle:'short'})}</span>
   <span>{meeting.location}</span>
   <span>{meeting.participantCount} شرکت‌کننده</span>
  </span>}/>
}
/** Compact list row used by the responsive/compact meeting view. */
export function MeetingCompactRow({meeting,onOpen}:{meeting:MeetingView;onOpen?(meeting:MeetingView):void}){
 return <li className="module-list__item">
  <button type="button" className="meeting-compact" onClick={()=>onOpen?.(meeting)}>
   <span className="meeting-compact__main">
    <span className="meeting-compact__title">{meeting.title}</span>
    <span className="meeting-compact__meta">{meeting.organizerName} · {meeting.departmentName}</span>
   </span>
   <span className="meeting-compact__side">
    <time dateTime={meeting.startTime}>{formatPersianDate(meeting.startTime,{dateStyle:'short',timeStyle:'short'})}</time>
    <StatusBadge tone={meetingStatusTone(meeting.status)} label={meetingStatusLabels[meeting.status]} size="sm"/>
   </span>
  </button>
 </li>
}
/** Empty state shared by all meeting collections. */
export function MeetingEmptyState({onCreate}:{onCreate?():void}){
 return <EmptyState
  variant={onCreate?'create':'default'}
  title="جلسه‌ای یافت نشد"
  description="با تغییر فیلترها جست‌وجو کنید یا جلسه جدیدی ایجاد کنید."
  primaryAction={onCreate?<button type="button" className="ui-button ui-button--primary ui-button--md" onClick={onCreate}><span>ایجاد جلسه</span></button>:undefined}/>
}
/** Pagination bar wired to the shared Pagination component. */
export function MeetingPaginationBar({page,pageSize,total,onPageChange,onPageSizeChange}:{page:number;pageSize:number;total:number;onPageChange(page:number):void;onPageSizeChange(size:number):void}){
 return <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} label="صفحه‌بندی جلسات"/>
}
/** Participant chip list used inside details and workspace panels. */
export function ParticipantTags({participants,limit=6}:{participants:readonly MeetingParticipantView[];limit?:number}){
 const visible=participants.slice(0,limit)
 return <span className="meeting-participant-tags">
  {visible.map((participant)=><Tag key={participant.id} tone={attendanceTone(participant.attendance)} size="sm">{participant.fullName}</Tag>)}
  {participants.length>limit&&<Tag tone="neutral" size="sm">{`+${participants.length-limit}`}</Tag>}
 </span>
}
