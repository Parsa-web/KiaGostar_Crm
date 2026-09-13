import {useMemo,useState} from 'react'
import {
 Badge,Button,Card,EmptyState,Icon,SearchField,StatusBadge,StatCard,Tag,Toolbar,Typography,type IconName,
 Table,type TableColumn,
} from '../../components/ui'
import {ChartWidget} from '../../components/dashboard'
import {cx} from '../../components/ui/utils'
import type {AuthorizedPrincipal} from '../../security'
import {projectSystemCalendar,type CalendarItemKind,type SystemCalendarItem} from '../../features/calendar'
import {
 addDays,addPersianMonths,buildPersianMonthMatrix,buildWeekDays,formatNumber,formatPersianDate,formatPersianDayNumber,
 formatPersianMonthYear,isSamePersianMonth,persianWeekdayShortNames,startOfDay,toDateKey,
} from '../../core/utils'

import {
 demoDepartments,demoPositions,demoUsers,findDemoDepartment,findDemoUser,
 organizationActivityTrend,organizationMetrics,departmentMetrics,personalMetrics,
 departmentPerformanceSeries,useDemoState,
 type FileView,
} from '../../demo'


import type {RouteNavigateFn} from './dashboardTargets'

type Tone='neutral'|'primary'|'success'|'warning'|'danger'|'info'
const statusTone=(status:string):Exclude<Tone,'primary'>=>(status==='COMPLETED'||status==='APPROVED'||status==='ACCEPTED')?'success':(status==='CANCELLED'||status==='REJECTED')?'danger':(status==='PENDING'||status==='SUBMITTED'||status==='CREATED')?'info':(status==='UNDER_REVIEW'||status==='IN_PROGRESS')?'warning':'neutral'
const fileIcon=(mime:string):IconName=>mime.includes('pdf')?'report':mime.startsWith('image/')?'eye':mime.includes('sheet')||mime.includes('excel')?'chart':mime.includes('word')||mime.includes('document')?'report':'folder'
const departmentName=(id:string|undefined)=>id?findDemoDepartment(id)?.name??'': ''

/** Metric keys arrive from the demo layer in English; the UI is Persian. */
const METRIC_LABELS:Readonly<Record<string,string>>={
 employees:'کل کارکنان',departments:'واحدهای سازمانی',activeMeetings:'جلسات فعال',
 pendingApprovals:'در انتظار تأیید',openTasks:'وظایف باز',completedTasks:'وظایف انجام‌شده',
 reports:'گزارش‌های ثبت‌شده',pendingRequests:'درخواست‌های در انتظار',
 teamMembers:'اعضای تیم',myMeetings:'جلسات من',myTasks:'وظایف من',myReports:'گزارش‌های من',
}
const METRIC_ICONS:Readonly<Record<string,IconName>>={
 employees:'users',departments:'building',activeMeetings:'calendar',
 pendingApprovals:'shield',openTasks:'check-square',completedTasks:'check-square',
 reports:'report',pendingRequests:'request',
 teamMembers:'users',myMeetings:'calendar',myTasks:'check-square',myReports:'report',
}
const userFullName=(id:string|undefined)=>id?findDemoUser(id)?.fullName??'نامشخص':'نامشخص'

/** Organisation: departments, managers, members, search. */
/** Entity codes are storage values; the interface always shows Persian. */
const entityLabels:Readonly<Record<string,string>>={MEETING:'جلسه',MINUTES:'صورت‌جلسه',DECISION:'مصوبه',REPORT:'گزارش',TASK:'وظیفه',REQUEST:'درخواست',SYSTEM:'سامانه',USER:'کاربر',FILE:'فایل'}
const entityLabel=(value:string)=>entityLabels[value]??value

export function OrganizationSurface({userId,requestedDepartmentId}:{userId:string;requestedDepartmentId?:string}){
 const viewer=findDemoUser(userId)
 const allowedDepartmentId=viewer?.role==='DEPARTMENT_MANAGER'?viewer.departmentId:undefined
 const [keyword,setKeyword]=useState('')
 const departments=useMemo(()=>demoDepartments.filter((dept)=>(!allowedDepartmentId||dept.id===allowedDepartmentId)&&(!requestedDepartmentId||dept.id===requestedDepartmentId)&&(!keyword||dept.name.includes(keyword)||(findDemoUser(dept.managerId)?.fullName??'').includes(keyword))),[allowedDepartmentId,keyword,requestedDepartmentId])
 const positions=useMemo(()=>demoPositions.filter((position)=>!allowedDepartmentId||position.departmentId===allowedDepartmentId),[allowedDepartmentId])
 const members=(departmentId:string)=>demoUsers.filter((user)=>user.departmentId===departmentId)
 return <div className="module-page">
  <Toolbar title="ساختار سازمانی" subtitle={allowedDepartmentId?'اعضا و ساختار واحد شما':'واحدها، مدیران و اعضای سازمان'}
   actions={<SearchField label="جستجوی سازمان" placeholder="جستجو در نام واحد یا مدیر…" value={keyword} onChange={(e)=>setKeyword(e.target.value)} className="module-search"/>}/>
  <div className="module-card-grid">
   {departments.map((dept)=>{
    const manager=findDemoUser(dept.managerId);const staff=members(dept.id);const parent=dept.parentId?findDemoDepartment(dept.parentId):undefined
    return <Card key={dept.id} className="module-card" title={undefined}>
     <header className="module-card__header">
      <span className="module-card__icon" aria-hidden="true"><Icon name="building" size="md"/></span>
      <div><h3 className="module-card__title">{dept.name}</h3><p className="module-card__subtitle">{dept.code}</p></div>
      <Badge variant={dept.status==='ACTIVE'?'success':'neutral'}>{dept.status==='ACTIVE'?'فعال':'غیرفعال'}</Badge>
     </header>
     <dl className="description-list">
      <div><dt>مدیر واحد</dt><dd>{manager?.fullName??'—'}</dd></div>
      <div><dt>واحد والد</dt><dd>{parent?.name??'سازمان'}</dd></div>
      <div><dt>اعضا</dt><dd>{formatNumber(staff.length)} نفر</dd></div>
     </dl>
     <ul className="member-chips">{staff.slice(0,6).map((user)=>(<li key={user.id} title={user.fullName}><Icon name="user" size="xs"/><span>{user.fullName}</span></li>))}{staff.length>6&&<li>+{staff.length-6}</li>}</ul>
    </Card>
   })}
   {!departments.length&&<EmptyState variant="inline" title="واحدی يافت نشد" description="عبارت جستجو را تغییر دهید."/>}
  </div>
  <Card className="section-card">
   <header className="section-card__header"><h3 className="module-card__title">سمت‌های سازمانی</h3></header>
   <ul className="plain-list">
    {positions.map((position)=>{const dept=findDemoDepartment(position.departmentId);return <li key={position.id}><span><Icon name="folder" size="sm"/>{position.title}</span><span className="text-muted">{dept?.name??''} · سطح {position.level}</span></li>})}
   </ul>
  </Card>
 </div>
}

/** Files: meeting/report/task/request attachments with search and preview. */
export function FilesSurface({onNavigate}:{onNavigate?:RouteNavigateFn}){
 const {files}=useDemoState()
 const [keyword,setKeyword]=useState('')
 const [group,setGroup]=useState<string>('all')
 const filtered=useMemo(()=>files.filter((file)=>(!group||file.entityType===group)&&(!keyword||file.name.includes(keyword)||file.uploaderName.includes(keyword))),[files,keyword,group])
 const groups=useMemo(()=>['MEETING','REPORT','TASK','REQUEST'],[])
 const rows=useMemo(()=>filtered.map((file)=>({...file,owner:userFullName(file.uploaderId),dept:departmentName(findDemoUser(file.uploaderId)?.departmentId)})),[filtered])
 const columns=useMemo<readonly TableColumn<FileView & {owner:string;dept:string}>[]>(()=>[
  {key:'name',header:'نام فایل',wrap:true,cell:(file)=><span className="module-cell"><span className="module-cell__primary"><Icon name={fileIcon(file.mimeType)} size="sm"/>{file.name}</span><span className="module-cell__secondary">{file.entityType} · {formatPersianDate(file.uploadedAt,{dateStyle:'short'})}</span></span>},
  {key:'owner',header:'بارگذاری‌کننده',hideBelow:'sm',cell:(file)=><span className="module-cell__secondary">{file.owner} · {file.dept}</span>},
  {key:'size',header:'حجم',align:'center',cell:(file)=>formatNumber(Math.round(file.sizeBytes/1024))+' کیلوبایت'},
  {key:'kind',header:'نوع',align:'center',cell:(file)=><Tag tone={file.entityType==='MEETING'?'primary':file.entityType==='REPORT'?'info':file.entityType==='TASK'?'success':'warning'}>{entityLabel(file.entityType)}</Tag>},
  {key:'actions',header:'',cell:(file)=><Button size="sm" variant="ghost" startIcon={<Icon name="eye" size="sm"/>} onClick={()=>onNavigate?.(file.entityType.toLocaleLowerCase()+'s',file.entityId)}>مشاهده</Button>},
 ],[onNavigate])
 return <div className="module-page">
  <Toolbar title="فایل‌ها" subtitle="پیوست‌های جلسات، گزارش‌ها، وظایف و درخواست‌ها"
   actions={<SearchField label="جستجوی فایل" placeholder="جستجو در نام فایل یا بارگذاری‌کننده…" value={keyword} onChange={(e)=>setKeyword(e.target.value)} className="module-search"/>}/>
  <div className="filter-row">{[{id:'all',label:'همه'},...groups.map((g)=>({id:g,label:entityLabel(g)}))].map((opt)=>(<Button key={opt.id} size="sm" variant={group===opt.id?'primary':'ghost'} onClick={()=>setGroup(opt.id)}>{opt.label}</Button>))}</div>
  <Table columns={columns} rows={rows} rowKey={(row)=>row.id} caption="فهرست فایل‌ها" zebra stickyHeader emptyState={<EmptyState variant="inline" title="فایلی يافت نشد"/>}/>
 </div>
}

/** Performance: KPIs and activity charts scoped to the signed-in user's role. */
export function PerformanceSurface({userId,onNavigate}:{userId:string;onNavigate?:RouteNavigateFn}){
 const viewer=findDemoUser(userId)
 const isManager=viewer?.role==='CEO'||viewer?.role==='DEPARTMENT_MANAGER'
 const metrics=useMemo(()=>viewer?.role==='CEO'?organizationMetrics():viewer?.role==='DEPARTMENT_MANAGER'?departmentMetrics(viewer?.departmentId??''):personalMetrics(userId),[viewer,userId])
 const kpis=useMemo(()=>Object.entries(metrics).filter(([,metric])=>typeof metric?.value==='number').map(([key,metric])=>({id:key,label:METRIC_LABELS[key]??key,value:formatNumber(metric?.value??0),description:metric?.previous!=null?`قبلی: ${formatNumber(metric.previous)}`:'',icon:(METRIC_ICONS[key]??'chart') as IconName})),[metrics])
 /* Live store, so freshly created records are counted immediately. */
 const store=useDemoState()
 const myReports=useMemo(()=>store.reports.filter((r)=>r.authorId===userId),[store.reports,userId])
 const myRequests=useMemo(()=>store.requests.filter((r)=>r.requesterId===userId),[store.requests,userId])
 const myMeetings=useMemo(()=>store.meetings.filter((m)=>m.organizerId===userId||m.participantIds.includes(userId)),[store.meetings,userId])

 return <div className="module-page">
  <Toolbar title="عملکرد" subtitle="نمای عملکرد متناسب با نقش و محدوده شما"/>
  <div className="stat-grid">{kpis.slice(0,8).map((kpi)=><StatCard key={kpi.id} label={kpi.label} value={kpi.value} icon={kpi.icon} description={kpi.description}/>)}</div>
  <div className="dashboard-grid dashboard-grid--12">
   <ChartWidget title="روند فعالیت" kind="area" data={[]} trendSeries={organizationActivityTrend(store)} size="md"/>
   {isManager&&<ChartWidget title="عملکرد واحدها" kind="bar" data={departmentPerformanceSeries(store)} valueSuffix="٪" size="md"/>}
  </div>
  <div className="stat-grid">
   <StatCard label="گزارش‌های من" value={formatNumber(myReports.length)} icon="report" onActivate={()=>onNavigate?.('reports')}/>
   <StatCard label="درخواست‌های من" value={formatNumber(myRequests.length)} icon="request" onActivate={()=>onNavigate?.('requests')}/>
   <StatCard label="جلسات من" value={formatNumber(myMeetings.length)} icon="calendar" onActivate={()=>onNavigate?.('meetings')}/>
  </div>
 </div>
}

/** Workflow: status, approval steps and history derived from demo entities. */
export function WorkflowSurface({onNavigate}:{onNavigate?:RouteNavigateFn}){
 const store=useDemoState()
 const workflows=useMemo(()=>{
  const requests=store.requests.map((r)=>({id:`req-${r.id}`,entityType:'REQUEST',entityId:r.id,title:r.title,code:r.code,status:r.status,author:userFullName(r.requesterId),startedAt:r.submittedAt,to:'requests'}))
  const reports=store.reports.map((r)=>({id:`rep-${r.id}`,entityType:'REPORT',entityId:r.id,title:r.title,code:r.code,status:r.status,author:userFullName(r.authorId),startedAt:r.submittedAt,to:'reports'}))
  const tasks=store.tasks.map((t)=>({id:`tsk-${t.id}`,entityType:'TASK',entityId:t.id,title:t.title,code:t.code,status:t.status,author:userFullName(t.assigneeId),startedAt:t.deadline,to:'tasks'}))
  return [...requests,...reports,...tasks].slice(0,24)
 },[store])

 const steps:Readonly<Record<string,string[]>>={REQUEST:['ثبت','در انتظار','تأیید/رد'],REPORT:['پیش‌نویس','ارسال','بررسی','تأیید/رد'],TASK:['ایجاد','در حال انجام','انجام‌شده']}
 return <div className="module-page">
  <Toolbar title="گردش کار" subtitle="وضعیت فرایندها و مراحل تأیید"/>
  <div className="module-card-grid">
   {workflows.map((wf)=>{const s=steps[wf.entityType]??[];const current=s.indexOf(wf.status==='PENDING'||wf.status==='SUBMITTED'?'در انتظار':wf.status==='UNDER_REVIEW'?'بررسی':wf.status==='APPROVED'||wf.status==='COMPLETED'?s[s.length-1]:wf.status==='REJECTED'||wf.status==='OVERDUE'?'رد':wf.status==='DRAFT'?'پیش‌نویس':'در حال انجام');return <Card key={wf.id} className="module-card">
    <header className="module-card__header"><span className="module-card__icon" aria-hidden="true"><Icon name="workflow" size="md"/></span><div><h3 className="module-card__title">{wf.title}</h3><p className="module-card__subtitle">{wf.code} · {wf.entityType}</p></div><StatusBadge tone={statusTone(wf.status)} label={wf.status} size="sm"/></header>
    <ol className="progress-steps">{s.map((step,index)=>(<li key={step} className={index<=current?'is-done':index===current+1?'is-current':''}><span className="progress-steps__dot"/><span>{step}</span></li>))}</ol>
    <p className="text-muted"><Icon name="user" size="xs"/> {wf.author} · <Icon name="clock" size="xs"/> {formatPersianDate(wf.startedAt,{dateStyle:'short'})}</p>
    <Button size="sm" variant="ghost" onClick={()=>onNavigate?.(wf.to,wf.entityId)}>مشاهده جزئیات</Button>
   </Card>})}
  </div>
 </div>
}

/** CalendarData: month/week/day views for the signed-in user's meetings, tasks, deadlines and events. */
const CALENDAR_KIND_LABELS:Readonly<Record<CalendarItemKind,string>>={MEETING:'جلسه',TASK:'وظیفه',RESOLUTION:'مصوبه'}

export function CalendarSurface({principal,onNavigate}:{principal:AuthorizedPrincipal;onNavigate?:RouteNavigateFn}){
 const [mode,setMode]=useState<'month'|'week'|'day'>('month')
 const [cursor,setCursor]=useState(()=>startOfDay(new Date()))
 const [activeDay,setActiveDay]=useState(()=>startOfDay(new Date()))
 /* Everything comes from the live store: a meeting created a second ago must
    appear on the grid without a reload. */
 const {meetings,tasks,resolutions}=useDemoState()
 const items=useMemo(()=>projectSystemCalendar({meetings,tasks,resolutions},principal),[meetings,tasks,resolutions,principal])

 /** Local day keys — the Jalali grid is local, so UTC slicing would shift every event by one day. */
 const itemsByDay=useMemo(()=>{const map:Record<string,SystemCalendarItem[]>={};items.forEach((item)=>{const key=toDateKey(item.date);const bucket=map[key]??(map[key]=[]);bucket.push(item)});return map},[items])
 const weeks=useMemo(()=>buildPersianMonthMatrix(cursor),[cursor])
 const weekDays=useMemo(()=>buildWeekDays(activeDay),[activeDay])
 const visibleItems=useMemo(()=>{
  if(mode==='day')return itemsByDay[toDateKey(activeDay)]??[]
  const range=mode==='week'?weekDays:weeks.flat().filter((day)=>isSamePersianMonth(day,cursor))
  return range.flatMap((day)=>itemsByDay[toDateKey(day)]??[])
 },[mode,activeDay,weekDays,weeks,cursor,itemsByDay])
 const rangeTitle=mode==='month'
  ?formatPersianMonthYear(cursor)
  :mode==='week'
   ?`${formatPersianDate(weekDays[0],{month:'long',day:'numeric'})} — ${formatPersianDate(weekDays[6],{month:'long',day:'numeric'})}`
   :formatPersianDate(activeDay,{dateStyle:'full'})
 const shift=(direction:1|-1)=>{
  const next=mode==='month'?addPersianMonths(cursor,direction):addDays(mode==='week'?activeDay:activeDay,direction*(mode==='week'?7:1))
  setCursor(next);if(mode!=='month')setActiveDay(next)
 }
 const jumpToToday=()=>{const now=startOfDay(new Date());setCursor(now);setActiveDay(now)}
 const modeLabels={day:'روزانه',week:'هفتگی',month:'ماهانه'} as const
 const todayKey=toDateKey(new Date())
 const activeKey=toDateKey(activeDay)
 return <div className="module-page">
  <Toolbar title="تقویم" subtitle="جلسات، وظایف، مهلت‌ها و رویدادهای شما"
   filters={<div className="ui-segmented" role="group" aria-label="بازه نمایش تقویم">
    {(['day','week','month'] as const).map((item)=><Button key={item} size="sm" variant="text" pressed={mode===item} onClick={()=>setMode(item)}>{modeLabels[item]}</Button>)}
   </div>}
   actions={<div className="calendar-nav">
    <Button size="sm" variant="outline" onClick={()=>shift(-1)} aria-label="بازه قبلی"><Icon name="chevron" size="sm"/></Button>
    <Button size="sm" variant="outline" onClick={jumpToToday}>امروز</Button>
    <Button size="sm" variant="outline" onClick={()=>shift(1)} aria-label="بازه بعدی"><Icon name="chevron" size="sm"/></Button>
   </div>}/>
  <Card className="section-card">
   <header className="section-card__header">
    <Typography variant="h4">{rangeTitle}</Typography>
    <span className="text-muted">{formatNumber(visibleItems.length)} رویداد</span>
   </header>
   {mode==='month'&&<div className="app-calendar">
    <div className="app-calendar-grid app-calendar-grid--head" aria-hidden="true">
     {persianWeekdayShortNames.map((name)=><div key={name} className="app-calendar-grid__weekday">{name}</div>)}
    </div>
    <div className="app-calendar-grid" role="grid" aria-label={rangeTitle}>
     {weeks.flat().map((day)=>{
      const key=toDateKey(day);const dayItems=itemsByDay[key]??[];const outside=!isSamePersianMonth(day,cursor)
      return <button
       type="button" role="gridcell" key={key}
       aria-selected={key===activeKey}
       aria-label={`${formatPersianDate(day,{dateStyle:'full'})}${dayItems.length?` — ${formatNumber(dayItems.length)} رویداد`:''}`}
       className={cx('app-calendar-grid__cell',outside&&'is-outside',key===todayKey&&'is-today',key===activeKey&&'is-selected')}
       onClick={()=>{setActiveDay(day);if(outside)setCursor(day)}}>
       <span className="app-calendar-grid__date">{formatPersianDayNumber(day)}</span>
       {dayItems.length>0&&<span className="app-calendar-grid__dots">{dayItems.slice(0,4).map((item)=><span key={item.id} className={`app-calendar-grid__dot app-calendar-grid__dot--${item.tone}`} title={item.title}/>)}</span>}
      </button>
     })}
    </div>
   </div>}
   {mode==='week'&&<div className="app-calendar-week">
    {weekDays.map((day)=>{
     const key=toDateKey(day);const dayItems=itemsByDay[key]??[]
     return <div key={key} className={cx('app-calendar-week__day',key===todayKey&&'is-today')}>
      <header><strong>{formatPersianDate(day,{weekday:'short'})}</strong><span>{formatPersianDayNumber(day)}</span></header>
      <span className="text-muted">{dayItems.length?`${formatNumber(dayItems.length)} رویداد`:'—'}</span>
      {dayItems.length>0&&<ul className="app-calendar-week__events">{dayItems.map((item)=><li key={item.id}><button type="button" onClick={()=>onNavigate?.(item.target,item.entityId)}><time dateTime={item.date}>{formatPersianDate(item.date,{timeStyle:'short'})}</time><span>{item.title}</span><small>{item.statusLabel}</small></button></li>)}</ul>}
     </div>
    })}
   </div>}
   <ul className="calendar-list">
    {visibleItems.slice(0,40).map((item)=><li key={item.id}>
     <button type="button" className="calendar-list__item" onClick={()=>onNavigate?.(item.target,item.entityId)}>
      <span className="calendar-list__date"><time dateTime={item.date}>{formatPersianDate(item.date,{dateStyle:'short'})}</time><span className="text-muted">{formatPersianDate(item.date,{timeStyle:'short'})}</span></span>
      <Tag tone={item.tone}>{CALENDAR_KIND_LABELS[item.kind]}</Tag>
      <span className="calendar-list__title">{item.title}</span>
      <span className="calendar-list__meta text-muted">{item.meta}</span>
     </button>
    </li>)}
    {!visibleItems.length&&<li><EmptyState variant="inline" title="رویدادی در این بازه نیست"/></li>}
   </ul>
  </Card>
 </div>
}


/** Unified search across meetings, tasks, reports and requests. */
/** Notifications: user notifications list. */
export function NotificationsSurface({userId,onNavigate:_onNavigate}:{userId:string;onNavigate?:RouteNavigateFn}){
 const {notifications}=useDemoState()
 const userNotifications=useMemo(()=>notifications.filter((n)=>n.userId===userId).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()),[notifications,userId])
 return <div className="module-page">
  <Toolbar title="اعلان‌ها" subtitle={`${formatNumber(userNotifications.length)} اعلان`}/>
  <Card className="section-card">
   {userNotifications.length===0?<EmptyState variant="inline" title="اعلانی ندارید"/>:<ul className="plain-list">{userNotifications.map((n)=>(<li key={n.id}><strong>{n.title}</strong><span className="text-muted">{n.body}</span><time className="text-muted" dateTime={n.createdAt}>{formatPersianDate(n.createdAt,{dateStyle:'short',timeStyle:'short'})}</time></li>))}</ul>}
  </Card>
 </div>
}

/** Unified search across meetings, tasks, reports and requests. */
export function SearchSurface({keyword,onNavigate}:{keyword:string;onNavigate?:RouteNavigateFn}){
 const q=keyword.trim().toLowerCase()
 const store=useDemoState()
 const meetings=useMemo(()=>store.meetings.filter((m)=>!q||m.title.includes(q)||m.organizerName.includes(q)).slice(0,6),[q,store.meetings])
 const tasks=useMemo(()=>store.tasks.filter((t)=>!q||t.title.includes(q)||t.assigneeName.includes(q)).slice(0,6),[q,store.tasks])
 const reports=useMemo(()=>store.reports.filter((r)=>!q||r.title.includes(q)||r.authorName.includes(q)).slice(0,6),[q,store.reports])
 const requests=useMemo(()=>store.requests.filter((r)=>!q||r.title.includes(q)||r.requesterName.includes(q)).slice(0,6),[q,store.requests])

 const found=meetings.length+tasks.length+reports.length+requests.length
 return <div className="module-page">
  <Toolbar title="جستجو" subtitle={found?`${formatNumber(found)} نتیجه برای «${keyword}»`:'برای یافتن جلسات، وظایف، گزارش‌ها و درخواست‌ها جستجو کنید'}/>
  {!keyword&&<EmptyState variant="search" icon="search" title="جستجو" description="عبارت مورد نظر خود را در فیلد جستجو وارد کنید."/>}
  {keyword&&!found&&<EmptyState variant="search" icon="search" title="نتیجه‌اي یافت نشد" description="عبارت دیگری را امتحان کنید."/>}
  {keyword&&found>0&&<div className="stack">
   {meetings.length>0&&<Card className="section-card"><h4 className="module-card__title">جلسات</h4><ul className="plain-list">{meetings.map((m)=><li key={m.id}><button type="button" className="link-button" onClick={()=>onNavigate?.('meetings',m.id)}><Icon name="calendar" size="sm"/>{m.title}</button><span className="text-muted">{m.organizerName}</span></li>)}</ul></Card>}
   {tasks.length>0&&<Card className="section-card"><h4 className="module-card__title">وظایف</h4><ul className="plain-list">{tasks.map((t)=><li key={t.id}><button type="button" className="link-button" onClick={()=>onNavigate?.('tasks',t.id)}><Icon name="check-square" size="sm"/>{t.title}</button><span className="text-muted">{t.assigneeName}</span></li>)}</ul></Card>}
   {reports.length>0&&<Card className="section-card"><h4 className="module-card__title">گزارش‌ها</h4><ul className="plain-list">{reports.map((r)=><li key={r.id}><button type="button" className="link-button" onClick={()=>onNavigate?.('reports',r.id)}><Icon name="report" size="sm"/>{r.title}</button><span className="text-muted">{r.authorName}</span></li>)}</ul></Card>}
   {requests.length>0&&<Card className="section-card"><h4 className="module-card__title">درخواست‌ها</h4><ul className="plain-list">{requests.map((r)=><li key={r.id}><button type="button" className="link-button" onClick={()=>onNavigate?.('requests',r.id)}><Icon name="request" size="sm"/>{r.title}</button><span className="text-muted">{r.requesterName}</span></li>)}</ul></Card>}
  </div>}
 </div>
}
