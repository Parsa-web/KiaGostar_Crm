import {useMemo,useState} from 'react'
import {
 Button,DataCard,DescriptionList,EmptyState,ErrorState,Icon,PropertyList,SearchField,StatCard,StatusBadge,Table,Tag,
 type IconName,type TableColumn,
} from '../../../components/ui'
import {AttachmentsPanel,CommentsPanel,QuickActionsPanel,RelatedLinksPanel,WorkPanel} from '../../../components/work'
import {formatNumber,formatPercent,formatPersianDate} from '../../../core/utils'
import {
 attendanceSummary,decisionStatusLabels,filesForEntity,meetingAgenda,meetingDecisions,meetingMinutes,
 meetingNotes,meetingParticipants,meetingStatusLabels,meetingTasks,priorityLabels,
 type MeetingDecisionView,type MeetingParticipantView,type MeetingView,type TaskView,
} from '../../../demo'
import {taskStatusLabels} from '../../tasks/components/taskPresentation'
import {MeetingPersonCell} from '../components/meetingPresentation'
import {attendanceTone,meetingStatusTone} from '../components/meetingTokens'
/** Meeting header: identity, schedule and status of the current meeting. */
export function MeetingWorkspaceHeader({meeting,actions}:{meeting:MeetingView;actions?:React.ReactNode}){
 return <header className="meeting-workspace__header">
  <div className="meeting-workspace__identity">
   <h1 className="meeting-workspace__title">{meeting.title}</h1>
   <p className="meeting-workspace__meta">
    <span>{meeting.code}</span><span>{meeting.typeLabel}</span><span>{meeting.organizerName}</span><span>{meeting.departmentName}</span>
   </p>
  </div>
  <div className="meeting-workspace__status">
   <StatusBadge tone={meetingStatusTone(meeting.status)} label={meetingStatusLabels[meeting.status]}/>
   <span className="meeting-workspace__schedule">
    <Icon name="calendar" size="sm"/>{formatPersianDate(meeting.startTime,{dateStyle:'full'})}
   </span>
   <span className="meeting-workspace__schedule">
    <Icon name="clock" size="sm"/>{formatPersianDate(meeting.startTime,{timeStyle:'short'})} تا {formatPersianDate(meeting.endTime,{timeStyle:'short'})}
   </span>
   <span className="meeting-workspace__schedule">
    <Icon name="building" size="sm"/>{meeting.location} · {meeting.modeLabel}
   </span>
  </div>
  {actions&&<div className="meeting-workspace__actions">{actions}</div>}
 </header>
}
/** Agenda panel with expandable items and completion indicators. */
export function AgendaPanel({meetingId,loading=false}:{meetingId:string;loading?:boolean}){
 const items=useMemo(()=>meetingAgenda(meetingId),[meetingId])
 const [expanded,setExpanded]=useState<readonly string[]>([])
 const toggle=(id:string)=>setExpanded((current)=>current.includes(id)?current.filter((item)=>item!==id):[...current,id])
 return <WorkPanel title="دستور جلسه" icon="workflow" count={items.length} loading={loading}>
  {items.length===0
   ?<EmptyState title="دستور جلسه‌ای ثبت نشده است" description="موضوعات جلسه پس از ثبت در این بخش نمایش داده می‌شود." compact/>
   :<ol className="meeting-agenda">
    {items.map((item,index)=>{
     const open=expanded.includes(item.id)
     return <li key={item.id} className="meeting-agenda__item">
      <button type="button" className="meeting-agenda__toggle" aria-expanded={open} onClick={()=>toggle(item.id)}>
       <span className="meeting-agenda__order">{formatNumber(index+1)}</span>
       <span className="meeting-agenda__title">{item.title}</span>
       <span className="meeting-agenda__duration">{formatNumber(item.durationMinutes)} دقیقه</span>
       <StatusBadge tone={item.completed?'success':'neutral'} label={item.completed?'بررسی‌شده':'در انتظار بررسی'} size="sm"/>
      </button>
      {open&&<div className="meeting-agenda__body">{item.description??'توضیحی برای این موضوع ثبت نشده است.'}</div>}
     </li>
    })}
   </ol>}
 </WorkPanel>
}
/** Attendance summary widget with visual-only rates. */
export function AttendanceSummaryPanel({meetingId}:{meetingId:string}){
 const summary=useMemo(()=>attendanceSummary(meetingId),[meetingId])
 return <WorkPanel title="خلاصه حضور و غیاب" icon="users">
  <div className="meeting-attendance-grid">
   <StatCard label="دعوت‌شده" value={summary.invited} icon="users"/>
   <StatCard label="تأیید حضور" value={summary.confirmed} icon="check-square" tone="info"/>
   <StatCard label="حاضر" value={summary.present} icon="check-square" tone="success" description={formatPercent(summary.presentRate)}/>
   <StatCard label="غایب" value={summary.absent} icon="alert" tone="danger"/>
   <StatCard label="غیبت موجه" value={summary.excused} icon="shield" tone="warning"/>
  </div>
 </WorkPanel>
}
/** Participants workspace with search, sorting and compact mode. */
export function ParticipantsPanel({meetingId,loading=false}:{meetingId:string;loading?:boolean}){
 const participants=useMemo(()=>meetingParticipants(meetingId),[meetingId])
 const [keyword,setKeyword]=useState('')
 const [compact,setCompact]=useState(false)
 const visible=useMemo(()=>{
  const needle=keyword.trim().toLowerCase()
  return participants
   .filter((participant)=>!needle||[participant.fullName,participant.departmentName,participant.positionTitle].some((field)=>field.toLowerCase().includes(needle)))
   .slice()
   .sort((first,second)=>first.fullName.localeCompare(second.fullName,'fa'))
 },[keyword,participants])
 const columns=useMemo<readonly TableColumn<MeetingParticipantView>[]>(()=>[
  {key:'name',header:'نام',cell:(participant)=><MeetingPersonCell name={participant.fullName} caption={participant.positionTitle} avatar={participant.avatar}/>},
  {key:'department',header:'واحد سازمانی',hideBelow:'md',cell:(participant)=>participant.departmentName},
  {key:'role',header:'نقش در جلسه',hideBelow:'sm',cell:(participant)=><Tag tone="neutral" size="sm">{participant.roleLabel}</Tag>},
  {key:'attendance',header:'وضعیت حضور',cell:(participant)=><StatusBadge tone={attendanceTone(participant.attendance)} label={participant.attendanceLabel} size="sm"/>},
 ],[])
 return <WorkPanel
  title="شرکت‌کنندگان"
  icon="users"
  count={participants.length}
  loading={loading}
  actions={<Button size="sm" variant="ghost" pressed={compact} onClick={()=>setCompact((current)=>!current)}>{compact?'نمای کامل':'نمای فشرده'}</Button>}>
  <SearchField label="جست‌وجوی شرکت‌کننده" value={keyword} onChange={(event)=>setKeyword(event.target.value)} placeholder="نام، واحد یا سمت"/>
  {visible.length===0
   ?<EmptyState title="شرکت‌کننده‌ای یافت نشد" description="عبارت جست‌وجو را تغییر دهید." compact/>
   :compact
    ?<ul className="meeting-participants-compact">
     {visible.map((participant)=><li key={participant.id}>
      <MeetingPersonCell name={participant.fullName} caption={participant.departmentName} avatar={participant.avatar}/>
      <StatusBadge tone={attendanceTone(participant.attendance)} label={participant.attendanceLabel} size="sm"/>
     </li>)}
    </ul>
    :<Table columns={columns} rows={visible} rowKey={(participant)=>participant.id} caption="فهرست شرکت‌کنندگان جلسه" zebra density="compact"/>}
 </WorkPanel>
}
/** Minutes panel; navigation only — the editor lives in the Minutes module. */
export function MinutesPanel({meetingId,onOpenMinutes}:{meetingId:string;onOpenMinutes?():void}){
 const minutes=useMemo(()=>meetingMinutes(meetingId),[meetingId])
 return <WorkPanel
  title="صورت‌جلسه"
  icon="report"
  actions={onOpenMinutes?<Button size="sm" variant="secondary" onClick={onOpenMinutes}>مشاهده کامل</Button>:undefined}>
  {!minutes
   ?<EmptyState title="صورت‌جلسه‌ای ثبت نشده است" description="پس از ثبت، پیش‌نویس صورت‌جلسه در این بخش نمایش داده می‌شود." compact/>
   :<>
    <DescriptionList
     layout="horizontal"
     compact
     items={[
      {key:'status',term:'وضعیت',description:<StatusBadge tone={minutes.status==='FINALIZED'?'success':minutes.status==='PENDING_APPROVAL'?'warning':'neutral'} label={minutes.status==='FINALIZED'?'نهایی‌شده':minutes.status==='PENDING_APPROVAL'?'در انتظار تأیید':'پیش‌نویس'} size="sm"/>},
      {key:'author',term:'تنظیم‌کننده',description:minutes.authorName},
      {key:'updated',term:'آخرین ویرایش',description:formatPersianDate(minutes.updatedAt,{dateStyle:'medium',timeStyle:'short'})},
     ]}/>
    <p className="meeting-minutes__excerpt">{minutes.content}</p>
   </>}
 </WorkPanel>
}
/** Decisions panel with search and status filtering. */
export function DecisionsPanel({meetingId,onOpenTask}:{meetingId:string;onOpenTask?(taskId:string):void}){
 const decisions=useMemo(()=>meetingDecisions(meetingId),[meetingId])
 const [keyword,setKeyword]=useState('')
 const visible=useMemo(()=>{
  const needle=keyword.trim().toLowerCase()
  return decisions.filter((decision)=>!needle||[decision.title,decision.ownerName].some((field)=>field.toLowerCase().includes(needle)))
 },[decisions,keyword])
 const columns=useMemo<readonly TableColumn<MeetingDecisionView>[]>(()=>[
  {key:'title',header:'عنوان مصوبه',wrap:true,cell:(decision)=>decision.title},
  {key:'owner',header:'مسئول',hideBelow:'sm',cell:(decision)=>decision.ownerName},
  {key:'priority',header:'اولویت',align:'center',hideBelow:'md',cell:(decision)=><Tag tone={decision.priority==='CRITICAL'?'danger':decision.priority==='HIGH'?'warning':'neutral'} size="sm">{decision.priorityLabel}</Tag>},
  {key:'due',header:'مهلت',hideBelow:'md',cell:(decision)=>formatPersianDate(decision.dueDate,{dateStyle:'short'})},
  {key:'status',header:'وضعیت',cell:(decision)=><StatusBadge tone={decision.status==='COMPLETED'?'success':decision.status==='OVERDUE'?'danger':decision.status==='IN_PROGRESS'?'info':'neutral'} label={decisionStatusLabels[decision.status]} size="sm"/>},
  {key:'task',header:'وظیفه مرتبط',align:'center',hideBelow:'lg',cell:(decision)=>decision.taskId&&onOpenTask?<Button size="sm" variant="ghost" onClick={()=>onOpenTask(decision.taskId as string)}>مشاهده</Button>:'—'},
 ],[onOpenTask])
 return <WorkPanel title="مصوبات جلسه" icon="check-square" count={decisions.length}>
  <SearchField label="جست‌وجوی مصوبه" value={keyword} onChange={(event)=>setKeyword(event.target.value)} placeholder="عنوان یا مسئول مصوبه"/>
  {visible.length===0
   ?<EmptyState title="مصوبه‌ای ثبت نشده است" description="مصوبات جلسه پس از ثبت در این بخش نمایش داده می‌شود." compact/>
   :<Table columns={columns} rows={visible} rowKey={(decision)=>decision.id} caption="فهرست مصوبات جلسه" zebra density="compact"/>}
 </WorkPanel>
}
/** Tasks created from meeting decisions. */
export function MeetingTasksPanel({meetingId,onOpenTask}:{meetingId:string;onOpenTask?(task:TaskView):void}){
 const tasks=useMemo(()=>meetingTasks(meetingId),[meetingId])
 const columns=useMemo<readonly TableColumn<TaskView>[]>(()=>[
  {key:'title',header:'عنوان وظیفه',wrap:true,cell:(task)=>task.title},
  {key:'assignee',header:'مسئول',hideBelow:'sm',cell:(task)=>task.assigneeName},
  {key:'priority',header:'اولویت',align:'center',hideBelow:'md',cell:(task)=><Tag tone={task.priority==='CRITICAL'?'danger':task.priority==='HIGH'?'warning':'neutral'} size="sm">{priorityLabels[task.priority]}</Tag>},
  {key:'deadline',header:'مهلت',hideBelow:'md',cell:(task)=>formatPersianDate(task.deadline,{dateStyle:'short'})},
  {key:'status',header:'وضعیت',cell:(task)=><StatusBadge tone={task.status==='COMPLETED'?'success':task.status==='OVERDUE'?'danger':task.status==='IN_PROGRESS'?'info':'neutral'} label={taskStatusLabels[task.status]} size="sm"/>},
 ],[])
 return <WorkPanel title="وظایف مرتبط" icon="check-square" count={tasks.length}>
  {tasks.length===0
   ?<EmptyState title="وظیفه‌ای ثبت نشده است" description="وظایف ناشی از مصوبات جلسه در این بخش نمایش داده می‌شود." compact/>
   :<Table columns={columns} rows={tasks} rowKey={(task)=>task.id} caption="فهرست وظایف جلسه" zebra density="compact" onRowActivate={onOpenTask}/>}
 </WorkPanel>
}
/** Complete Meeting Workspace assembled from independently reusable panels. */
export function MeetingWorkspacePage({meeting,loading=false,error=false,onRetry,onOpenMinutes,onOpenCalendar,onOpenTasks,onOpenDecisions,onOpenAttachments,onExport,onPrint,onNavigate}:{
 meeting:MeetingView;loading?:boolean;error?:boolean;onRetry?():void;onOpenMinutes?():void;onOpenCalendar?():void;
 onOpenTasks?():void;onOpenDecisions?():void;onOpenAttachments?():void;onExport?(target:string):void;onPrint?():void;onNavigate?(target:string):void
}){
 const participants=useMemo(()=>meetingParticipants(meeting.id),[meeting.id])
 const decisions=useMemo(()=>meetingDecisions(meeting.id),[meeting.id])
 const tasks=useMemo(()=>meetingTasks(meeting.id),[meeting.id])
 const notes=useMemo(()=>meetingNotes(meeting.id),[meeting.id])
 const files=useMemo(()=>filesForEntity('MEETING',meeting.id),[meeting.id])
 if(error)return <ErrorState title="نمایش میز کار جلسه ممکن نیست" onRetry={onRetry}/>
 return <div className="meeting-workspace">
  <MeetingWorkspaceHeader
   meeting={meeting}
   actions={<>
    {onOpenMinutes&&<Button size="sm" onClick={onOpenMinutes}>صورت‌جلسه</Button>}
    {onPrint&&<Button size="sm" variant="secondary" onClick={onPrint}>چاپ خلاصه</Button>}
   </>}/>
  <section className="meeting-workspace__summary" aria-label="خلاصه وضعیت جلسه">
   <DataCard title="شرکت‌کنندگان" value={formatNumber(participants.length)} icon="users"/>
   <DataCard title="مصوبات" value={formatNumber(decisions.length)} icon="check-square"/>
   <DataCard title="وظایف" value={formatNumber(tasks.length)} icon="workflow"/>
   <DataCard title="پیوست‌ها" value={formatNumber(files.length)} icon="folder"/>
   <DataCard title="یادداشت‌ها" value={formatNumber(notes.length)} icon="report"/>
   <DataCard title="رویدادها" value={formatNumber(0)} icon="bell"/>
  </section>
  <div className="meeting-workspace__layout">
   <div className="meeting-workspace__main">
    <WorkPanel title="مشخصات جلسه" icon="calendar" loading={loading}>
     <PropertyList items={[
      {key:'purpose',label:'هدف جلسه',value:meeting.purpose,multiline:true,fullWidth:true},
      {key:'description',label:'توضیحات',value:meeting.description,multiline:true,fullWidth:true},
      {key:'duration',label:'مدت جلسه',value:`${formatNumber(meeting.durationMinutes)} دقیقه`,icon:'clock'},
      {key:'approval',label:'نیازمند تأیید',value:meeting.requiresApproval?'بله':'خیر',icon:'shield'},
     ]}/>
    </WorkPanel>
    <AgendaPanel meetingId={meeting.id} loading={loading}/>
    <AttendanceSummaryPanel meetingId={meeting.id}/>
    <ParticipantsPanel meetingId={meeting.id} loading={loading}/>
    <MinutesPanel meetingId={meeting.id} onOpenMinutes={onOpenMinutes}/>
    <DecisionsPanel meetingId={meeting.id}/>
    <MeetingTasksPanel meetingId={meeting.id}/>
    <AttachmentsPanel attachments={files.map((file)=>({id:file.id,name:file.name,mimeType:file.mimeType,sizeBytes:file.sizeBytes,uploaderName:file.uploaderName,uploadedAt:file.uploadedAt}))} loading={loading}/>
    <CommentsPanel comments={notes.map((note)=>({id:note.id,authorName:note.authorName,createdAt:note.createdAt,content:note.content}))} title="یادداشت‌های جلسه" loading={loading}/>
   </div>
   <aside className="meeting-workspace__sidebar" aria-label="اقدامات و پیوندهای جلسه">
    <QuickActionsPanel
     columns={1}
     actions={([
      {id:'minutes',label:'صورت‌جلسه',icon:'report' as IconName,onSelect:onOpenMinutes},
      {id:'calendar',label:'تقویم جلسات',icon:'calendar' as IconName,onSelect:onOpenCalendar},
      {id:'tasks',label:'وظایف جلسه',icon:'check-square' as IconName,onSelect:onOpenTasks},
      {id:'decisions',label:'مصوبات جلسه',icon:'workflow' as IconName,onSelect:onOpenDecisions},
      {id:'attachments',label:'پیوست‌ها',icon:'folder' as IconName,onSelect:onOpenAttachments},
      {id:'export',label:'خروجی جلسه',icon:'report' as IconName,onSelect:onExport?()=>onExport('meeting-summary'):undefined},
      {id:'print',label:'چاپ خلاصه',icon:'report' as IconName,onSelect:onPrint},
     ]).filter((action)=>Boolean(action.onSelect))}/>
    <WorkPanel title="خروجی و چاپ" icon="folder">
     <ul className="meeting-export-list">
      {[
       {id:'summary',label:'خلاصه جلسه'},{id:'attendance',label:'فهرست حضور و غیاب'},
       {id:'agenda',label:'دستور جلسه'},{id:'decisions',label:'مصوبات'},{id:'attachments',label:'فهرست پیوست‌ها'},
      ].map((item)=><li key={item.id}>
       <span>{item.label}</span>
       <Button size="sm" variant="ghost" onClick={()=>onExport?.(item.id)}>خروجی</Button>
      </li>)}
     </ul>
    </WorkPanel>
    <RelatedLinksPanel links={[
     {id:'requests',label:'درخواست‌های مرتبط',icon:'request',onNavigate:onNavigate?()=>onNavigate('requests'):undefined},
     {id:'reports',label:'گزارش‌های مرتبط',icon:'report',onNavigate:onNavigate?()=>onNavigate('reports'):undefined},
     {id:'tasks',label:'وظایف مرتبط',icon:'check-square',onNavigate:onNavigate?()=>onNavigate('tasks'):undefined},
     {id:'files',label:'مدیریت فایل‌ها',icon:'folder',onNavigate:onNavigate?()=>onNavigate('files'):undefined},
     {id:'notifications',label:'اعلان‌های جلسه',icon:'bell',onNavigate:onNavigate?()=>onNavigate('notifications'):undefined},
     {id:'audit',label:'تاریخچه ممیزی',icon:'shield',onNavigate:onNavigate?()=>onNavigate('audit'):undefined},
    ]}/>
   </aside>
  </div>
 </div>
}
