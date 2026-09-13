import {useMemo} from 'react'
import {Button,Icon} from '../../../components/ui'
import {
 ActivityTrendWidget,CalendarPreviewWidget,ChartWidget,DashboardComposedLayout,DashboardGrid,DashboardHeader,DashboardWidget,DeadlinesWidget,
 DepartmentOverviewWidget,KpiSummary,NotificationSummary,RecentFilesWidget,
 StatBreakdownWidget,TeamSummaryWidget,UpcomingEvents,useDashboardPersonalization,
 type DashboardCompositionBand,type KpiDefinition,
} from '../../../components/dashboard'
import {
 departmentMetrics,departmentOverview,demoUserByRole,fileViews,findDemoDepartment,findDemoUser,
 meetingStatusLabels,organizationActivityTrend,organizationMetrics,

 demoNotificationsForUser,demoUnreadNotificationCount,personalMetrics,secretaryMetrics,taskStatusSeries,teamWorkload,upcomingEvents,
 upcomingMeetings,useDemoState,type DashboardMetrics,type DemoUser,type NotificationRecord,
} from '../../../demo'
import {dashboardPersonalizationByRole} from '../dashboardPersonalizationConfig'
const ORGANIZATION='گروه صنعتی کیا گستر'
const roleLabels:Readonly<Record<string,string>>={CEO:'مدیرعامل',DEPARTMENT_MANAGER:'مدیر واحد',SECRETARY:'دبیر جلسات',EMPLOYEE:'کارشناس'}
const CEO_COMPOSITION=[
 {height:'standard',columns:[{ids:['trend'],span:7},{ids:['task-status'],span:5}]},
 {height:'standard',columns:[{ids:['departments'],span:7},{ids:['upcoming-events'],span:5}]},
 {height:'standard',columns:[{ids:['ceo-reports'],span:7},{ids:['ceo-notifications'],span:5}]},
] satisfies readonly DashboardCompositionBand[]
const MANAGER_COMPOSITION=[
 {height:'large',columns:[{ids:['team'],span:7},{ids:['events','deadlines'],span:5}]},
 {height:'standard',columns:[{ids:['mgr-reports'],span:7},{ids:['mgr-notifications'],span:5}]},
] satisfies readonly DashboardCompositionBand[]
const SECRETARY_COMPOSITION=[
 {height:'large',columns:[{ids:['agenda'],span:7},{ids:['minutes','resolutions'],span:5}]},
 {height:'large',columns:[{ids:['follow-ups'],span:7},{ids:['notifications','files'],span:5}]},
] satisfies readonly DashboardCompositionBand[]
const EMPLOYEE_COMPOSITION=[
 {height:'large',columns:[{ids:['meetings'],span:7},{ids:['tasks','requests'],span:5}]},
 {height:'standard',columns:[{ids:['deadlines'],span:7},{ids:['reports'],span:5}]},
 {height:'standard',columns:[{ids:['notifications'],span:12}]},
] satisfies readonly DashboardCompositionBand[]
const statusTone=(status:string)=>status==='COMPLETED'?'success':status==='CANCELLED'||status==='REJECTED'?'danger':status==='PENDING_APPROVAL'?'warning':'info'
export interface RoleDashboardProps{userId?:string;loading?:boolean;error?:boolean;onNavigate?(target:string,id?:string):void;onRetry?():void}
const useViewer=(userId:string|undefined,fallback:DemoUser|undefined)=>useMemo(()=>(userId?findDemoUser(userId):undefined)??fallback,[fallback,userId])
const kpi=(id:string,title:string,metric:DashboardMetrics[string]|undefined,icon:KpiDefinition['icon'],tone?:KpiDefinition['tone'],invertedTrend=false,onActivate?:()=>void):KpiDefinition=>({
 id,title,value:metric?.value??0,previousValue:metric?.previous,icon,tone,invertedTrend,onActivate,
})
const notificationItems=(userId:string,notifications:readonly NotificationRecord[])=>demoNotificationsForUser(userId,notifications).slice(0,6).map((item)=>({id:item.id,title:item.title,body:item.body,createdAt:item.createdAt,priority:item.priority,read:item.read}))
const metricValue=(value:number)=>({value,previous:value})
const calendarItems=(meetings:readonly {id:string;title:string;startTime:string;location:string;status:string}[])=>meetings.map((meeting)=>({
 id:meeting.id,title:meeting.title,startTime:meeting.startTime,location:meeting.location,
 statusLabel:meetingStatusLabels[meeting.status as keyof typeof meetingStatusLabels]??meeting.status,tone:statusTone(meeting.status) as 'info',
}))
const fileItems=()=>fileViews.slice(0,5).map((file)=>({id:file.id,name:file.name,uploaderName:file.uploaderName,uploadedAt:file.uploadedAt,kind:file.mimeType.includes('pdf')?'PDF':file.mimeType.startsWith('image/')?'تصویر':'سند'}))
/** Executive dashboard: organisation-wide KPIs, performance charts and department comparison. */
export function CeoDashboardPage({userId,loading=false,error=false,onNavigate,onRetry}:RoleDashboardProps){
 const viewer=useViewer(userId,demoUserByRole('CEO'))
 const store=useDemoState()
 const metrics=useMemo<DashboardMetrics>(()=>({
  ...organizationMetrics(),activeMeetings:metricValue(store.meetings.filter((meeting)=>meeting.status==='SCHEDULED'||meeting.status==='IN_PROGRESS'||meeting.status==='APPROVED').length),
  openTasks:metricValue(store.tasks.filter((task)=>task.status!=='COMPLETED').length),completedTasks:metricValue(store.tasks.filter((task)=>task.status==='COMPLETED').length),reports:metricValue(store.reports.length),pendingRequests:metricValue(store.requests.filter((request)=>request.status==='PENDING').length),
 }),[store.meetings,store.tasks,store.reports,store.requests])
 const departments=useMemo(()=>departmentOverview(store),[store])
 const trend=useMemo(()=>organizationActivityTrend(store),[store])
 const taskStatuses=useMemo(()=>taskStatusSeries(store.tasks),[store.tasks])
 const events=useMemo(()=>viewer?upcomingEvents({role:'CEO',userId:viewer.id},6,store):[],[viewer,store])
 const personalization=useDashboardPersonalization(dashboardPersonalizationByRole.MAIN_MANAGER)
 const kpis=useMemo<readonly KpiDefinition[]>(()=>[
  kpi('employees','کل کارکنان',metrics.employees,'users','primary'),
  kpi('departments','واحدهای سازمانی',metrics.departments,'building','primary'),
  kpi('meetings','جلسات فعال',metrics.activeMeetings,'calendar','info',false,()=>onNavigate?.('meetings')),
  kpi('approvals','در انتظار تأیید',metrics.pendingApprovals,'shield','warning',true),
  kpi('openTasks','وظایف باز',metrics.openTasks,'check-square','warning',true,()=>onNavigate?.('tasks')),
  kpi('completedTasks','وظایف انجام‌شده',metrics.completedTasks,'check-square','success'),
  kpi('reports','گزارش‌های ثبت‌شده',metrics.reports,'report','info',false,()=>onNavigate?.('reports')),
  kpi('requests','درخواست‌های در انتظار',metrics.pendingRequests,'request','danger',true,()=>onNavigate?.('requests')),
 ],[metrics,onNavigate])
 if(!viewer)return null

 return <main className="dashboard-page dashboard-page--ceo" aria-label="داشبورد مدیرعامل">
  <DashboardHeader
   title="داشبورد مدیریت سازمان"
   userName={viewer.fullName}
   roleLabel={roleLabels.CEO}
   organizationName={ORGANIZATION}
   avatar={viewer.avatar}
   message="نمای کلی عملکرد، جلسات و امور جاری سازمان"

   actions={<Button startIcon={<Icon name="plus" size="sm"/>} onClick={()=>onNavigate?.('meetings/create')}>ایجاد جلسه</Button>}/>
  <KpiSummary items={kpis} columns={4} loading={loading}/>
  <DashboardGrid className="dashboard-grid--content">
   <DashboardComposedLayout composition={CEO_COMPOSITION} items={[
    {id:'trend',kind:'chart',itemCount:trend[0]?.data.length??0,prominence:'primary',importance:'primary',node:personalization.isVisible('performance')&&<ActivityTrendWidget series={trend} loading={loading} error={error?'خطا در دریافت داده':undefined} onRetry={onRetry}/>},
    {id:'task-status',kind:'summary',itemCount:taskStatuses.length,node:<ChartWidget title="وضعیت وظایف" description="توزیع وظایف سازمان بر اساس وضعیت جاری" kind="donut" data={taskStatuses} size="lg" loading={loading}/>},
    {id:'upcoming-events',kind:'list',itemCount:events.length,node:<DashboardWidget title="رویدادهای پیش‌رو" description="جلسات و مهلت‌های نزدیک" icon="calendar" size="md" loading={loading}><UpcomingEvents items={events.map((event)=>({id:event.id,title:event.title,date:event.date,kind:event.kind,meta:event.meta}))} onSelect={(item)=>onNavigate?.('meetings',item.id)}/></DashboardWidget>},
    {id:'departments',kind:'table',itemCount:departments.length,importance:'primary',node:personalization.isVisible('departments')&&<DepartmentOverviewWidget rows={departments} loading={loading} error={error?'خطا در دریافت اطلاعات واحدها':undefined} onRetry={onRetry} onOpenDepartment={(row)=>onNavigate?.('organization',row.id)}/>},
    {id:'ceo-reports',kind:'summary',itemCount:store.reports.length,node:<DashboardWidget title="گزارش‌ها" icon="report" size="md" loading={loading}><StatBreakdownWidget title="گزارش‌ها" icon="report" presentation="operations" category="reports" items={[{id:'total',label:'کل گزارش‌ها',value:store.reports.length,tone:'info'},{id:'submitted',label:'ارسال‌شده',value:store.reports.filter((r)=>r.status==='SUBMITTED').length,tone:'warning'},{id:'approved',label:'تأییدشده',value:store.reports.filter((r)=>r.status==='APPROVED').length,tone:'success'}]} loading={loading}/></DashboardWidget>},
    {id:'ceo-notifications',kind:'list',itemCount:notificationItems(viewer.id,store.notifications).length,node:<DashboardWidget title="اعلان‌ها" icon="bell" size="md" loading={loading}><NotificationSummary items={notificationItems(viewer.id,store.notifications).slice(0,4)} unreadCount={demoUnreadNotificationCount(viewer.id,store.notifications)} onViewAll={()=>onNavigate?.('notifications')}/></DashboardWidget>},
   ]}/>
  </DashboardGrid>
 </main>
}
/** Department manager dashboard focused on team operations. */
export function DepartmentManagerDashboardPage({userId,loading=false,error=false,onNavigate,onRetry}:RoleDashboardProps){
 const viewer=useViewer(userId,demoUserByRole('DEPARTMENT_MANAGER'))
 const store=useDemoState()
 const departmentId=viewer?.departmentId??""
 const metrics=useMemo(()=>{const tasks=store.tasks.filter((task)=>task.departmentId===departmentId);const reports=store.reports.filter((report)=>report.departmentId===departmentId);const requests=store.requests.filter((request)=>request.departmentId===departmentId);return {...departmentMetrics(departmentId),departmentTasks:metricValue(tasks.filter((task)=>task.status!=='COMPLETED').length),teamMeetings:metricValue(store.meetings.filter((meeting)=>meeting.departmentId===departmentId).length),reportsAwaitingReview:metricValue(reports.filter((report)=>report.status==='SUBMITTED').length),pendingRequests:metricValue(requests.filter((request)=>request.status==='PENDING').length),overdueTasks:metricValue(tasks.filter((task)=>task.status==='OVERDUE').length),completedTasks:metricValue(tasks.filter((task)=>task.status==='COMPLETED').length)}},[departmentId,store.tasks,store.reports,store.requests,store.meetings])
 const team=useMemo(()=>teamWorkload(departmentId).map((row)=>({id:row.user.id,name:row.user.fullName,avatar:row.user.avatar,positionTitle:row.departmentName,active:row.active,overdue:row.overdue,completed:row.completed,load:row.load})),[departmentId])
 /* Managers see the same "upcoming events" feed as the executive, but scoped
    to their own unit rather than the whole organisation. */
 const events=useMemo(()=>viewer?upcomingEvents({role:'DEPARTMENT_MANAGER',userId:viewer.id,departmentId},6,store):[],[viewer,departmentId,store])
 const personalization=useDashboardPersonalization(dashboardPersonalizationByRole.DEPARTMENT_MANAGER)
 
 const deadlines=useMemo(()=>store.tasks.filter((task)=>task.departmentId===departmentId&&task.status!=='COMPLETED').sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,5).map((task)=>({id:task.id,title:task.title,deadline:task.deadline,assigneeName:task.assigneeName,overdue:task.overdue})),[departmentId,store.tasks])
 const kpis=useMemo<readonly KpiDefinition[]>(()=>[
  kpi('tasks','وظایف واحد',metrics.departmentTasks,'check-square','primary',true,()=>onNavigate?.('tasks')),
  kpi('meetings','جلسات تیم',metrics.teamMeetings,'calendar','info',false,()=>onNavigate?.('meetings')),
  kpi('reports','گزارش در انتظار بررسی',metrics.reportsAwaitingReview,'report','warning',true,()=>onNavigate?.('reports')),
  kpi('requests','درخواست‌های در انتظار',metrics.pendingRequests,'request','warning',true,()=>onNavigate?.('requests')),
  kpi('overdue','وظایف دارای تأخیر',metrics.overdueTasks,'clock','danger',true),
  kpi('completed','وظایف انجام‌شده',metrics.completedTasks,'check-square','success'),
 ],[metrics,onNavigate])
 if(!viewer)return null
 const departmentName=findDemoDepartment(departmentId)?.name

 return <main className="dashboard-page dashboard-page--manager" aria-label="داشبورد مدیر واحد">
  <DashboardHeader
   title="داشبورد مدیریت واحد"
   userName={viewer.fullName}
   roleLabel={roleLabels.DEPARTMENT_MANAGER}
   departmentLabel={departmentName}
   organizationName={ORGANIZATION}
   avatar={viewer.avatar}
   message="وضعیت تیم، جلسات و امور در جریان واحد شما"
   actions={<Button startIcon={<Icon name="plus" size="sm"/>} onClick={()=>onNavigate?.('tasks/create')}>وظیفه جدید</Button>}/>
  <KpiSummary items={kpis} columns={3} loading={loading}/>
  <DashboardGrid className="dashboard-grid--content">
   <DashboardComposedLayout composition={MANAGER_COMPOSITION} items={[
    {id:'team',kind:'table',itemCount:team.length,importance:'primary',fullWidth:true,node:personalization.isVisible('team')&&<TeamSummaryWidget rows={team} loading={loading} error={error?'خطا در دریافت اطلاعات تیم':undefined} onRetry={onRetry} onOpenMember={(row)=>onNavigate?.('organization',row.id)}/>},
    {id:'events',kind:'list',itemCount:events.length,prominence:'primary',node:personalization.isVisible('events')&&<DashboardWidget title="رویدادهای پیش‌رو" description="جلسات و مهلت‌های نزدیک واحد" icon="calendar" size="lg" loading={loading}><UpcomingEvents items={events.map((event)=>({id:event.id,title:event.title,date:event.date,kind:event.kind,meta:event.meta}))} onSelect={(item)=>onNavigate?.('meetings',item.id)}/></DashboardWidget>},
    {id:'deadlines',kind:'list',itemCount:deadlines.length,importance:'primary',node:personalization.isVisible('deadlines')&&<DeadlinesWidget items={deadlines} size="md" loading={loading} onSelect={(item)=>onNavigate?.('tasks',item.id)}/>},
    {id:'mgr-reports',kind:'summary',itemCount:store.reports.filter((r)=>r.departmentId===departmentId).length,node:<DashboardWidget title="گزارش‌های واحد" icon="report" size="md" loading={loading}><StatBreakdownWidget title="گزارش‌ها" icon="report" presentation="operations" category="reports" items={[{id:'submitted',label:'ارسال‌شده',value:store.reports.filter((r)=>r.departmentId===departmentId&&r.status==='SUBMITTED').length,tone:'warning'},{id:'approved',label:'تأییدشده',value:store.reports.filter((r)=>r.departmentId===departmentId&&r.status==='APPROVED').length,tone:'success'}]} loading={loading}/></DashboardWidget>},
    {id:'mgr-notifications',kind:'list',itemCount:notificationItems(viewer.id,store.notifications).length,node:<DashboardWidget title="اعلان‌ها" icon="bell" size="md" loading={loading}><NotificationSummary items={notificationItems(viewer.id,store.notifications).slice(0,4)} unreadCount={demoUnreadNotificationCount(viewer.id,store.notifications)} onViewAll={()=>onNavigate?.('notifications')}/></DashboardWidget>},
   ]}/>
  </DashboardGrid>

 </main>

}
/** Secretary dashboard optimised for meeting operations. */
export function SecretaryDashboardPage({userId,loading=false,error=false,onNavigate,onRetry}:RoleDashboardProps){
 const viewer=useViewer(userId,demoUserByRole('SECRETARY'))
 const store=useDemoState()
 const metrics=useMemo<DashboardMetrics>(()=>viewer?{...secretaryMetrics(viewer.id),meetingsCreated:metricValue(store.meetings.filter((meeting)=>meeting.organizerId===viewer.id).length),completedMeetings:metricValue(store.meetings.filter((meeting)=>meeting.status==='COMPLETED').length),draftMinutes:metricValue(store.meetings.filter((meeting)=>meeting.status==='COMPLETED'&&!store.meetingWorkspaces[meeting.id]?.minutes.trim()).length),finalizedMinutes:metricValue(store.meetings.filter((meeting)=>meeting.status==='COMPLETED'&&Boolean(store.meetingWorkspaces[meeting.id]?.minutes.trim())).length)}:{},[viewer,store.meetings,store.meetingWorkspaces])
 const todayMeetings=useMemo(()=>upcomingMeetings(new Date(),store.meetings,6),[store.meetings])
 const personalization=useDashboardPersonalization(dashboardPersonalizationByRole.SECRETARY)

 const followUps=useMemo(()=>viewer?store.tasks.filter((task)=>task.assigneeId===viewer.id&&task.status!=='COMPLETED').sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,6).map((task)=>({id:task.id,title:task.title,deadline:task.deadline,assigneeName:task.assigneeName,overdue:task.overdue})):[],[viewer,store.tasks])
 const kpis=useMemo<readonly KpiDefinition[]>(()=>[
  kpi('created','جلسات ایجادشده',metrics.meetingsCreated,'calendar','primary'),
  kpi('completed','جلسات برگزارشده',metrics.completedMeetings,'check-square','success'),
  kpi('draftMinutes','صورتجلسه‌های ناتمام',metrics.draftMinutes,'report','danger',true,()=>onNavigate?.('minutes')),
  kpi('finalMinutes','صورتجلسه‌های نهایی',metrics.finalizedMinutes,'report','success'),
 ],[metrics,onNavigate])
 if(!viewer)return null
 return <main className="dashboard-page dashboard-page--secretary" aria-label="داشبورد دبیر جلسات">
  <DashboardHeader
   title="میز کار دبیرخانه جلسات"
   userName={viewer.fullName}
   roleLabel={roleLabels.SECRETARY}
   departmentLabel={findDemoDepartment(viewer.departmentId)?.name}
   organizationName={ORGANIZATION}
   avatar={viewer.avatar}
   message="برنامه امروز، جلسات پیش‌رو و صورتجلسه‌های در جریان"/>

  <KpiSummary items={kpis} columns={3} loading={loading}/>
  <DashboardGrid className="dashboard-grid--content">
   <DashboardComposedLayout composition={SECRETARY_COMPOSITION} items={[
    {id:'agenda',kind:'list',itemCount:todayMeetings.length,prominence:'primary',node:personalization.isVisible('agenda')&&<CalendarPreviewWidget items={calendarItems(todayMeetings)} title="برنامه امروز و روزهای پیش‌رو" loading={loading} error={error?'خطا در دریافت جلسات':undefined} onRetry={onRetry} onSelect={(item)=>onNavigate?.('meetings',item.id)}/>},
    {id:'follow-ups',kind:'list',itemCount:followUps.length,prominence:'primary',node:<DeadlinesWidget items={followUps} size="lg" loading={loading} onSelect={(item)=>onNavigate?.('tasks',item.id)}/>},
    {id:'minutes',kind:'summary',itemCount:2,importance:'primary',node:personalization.isVisible('minutes')&&<StatBreakdownWidget title="صورتجلسه‌ها و مصوبات" icon="report" size="md" presentation="operations" category="minutes" items={[
     {id:'draft',label:'پیش‌نویس',value:metrics.draftMinutes?.value??0,tone:'warning'},
     {id:'final',label:'نهایی‌شده',value:metrics.finalizedMinutes?.value??0,tone:'success'},
    ]} loading={loading} onSelect={()=>onNavigate?.('minutes')}/>},
    {id:'resolutions',kind:'summary',itemCount:3,importance:'primary',node:personalization.isVisible('minutes')&&<StatBreakdownWidget title="مصوبات" icon="check-square" size="md" presentation="operations" category="resolutions" items={[
     {id:'pending',label:'در انتظار اقدام',value:store.resolutions.filter((item)=>item.status==='PENDING').length,tone:'warning'},
     {id:'active',label:'در حال انجام',value:store.resolutions.filter((item)=>item.status==='IN_PROGRESS').length,tone:'info'},
     {id:'completed',label:'انجام‌شده',value:store.resolutions.filter((item)=>item.status==='COMPLETED').length,tone:'success'},
    ]} loading={loading} onSelect={()=>onNavigate?.('resolutions')}/>},
    {id:'notifications',kind:'list',itemCount:notificationItems(viewer.id,store.notifications).filter((item)=>item.priority==='HIGH'||!item.read).length,node:<DashboardWidget title="اعلان‌های اولویت‌دار" icon="bell" size="md" loading={loading}><NotificationSummary items={notificationItems(viewer.id,store.notifications).filter((item)=>item.priority==='HIGH'||!item.read)} unreadCount={demoUnreadNotificationCount(viewer.id,store.notifications)} onViewAll={()=>onNavigate?.('notifications')}/></DashboardWidget>},
    {id:'files',kind:'list',itemCount:fileItems().length,node:personalization.isVisible('files')&&<RecentFilesWidget items={fileItems()} loading={loading} onSelect={()=>onNavigate?.('files')}/>},
   ]}/>
  </DashboardGrid>

 </main>
}
/** Employee dashboard: personal, task-oriented and lightweight. */
export function EmployeeDashboardPage({userId,loading=false,error=false,onNavigate,onRetry}:RoleDashboardProps){
 const viewer=useViewer(userId,demoUserByRole('EMPLOYEE'))
 const store=useDemoState()
 const myTasks=useMemo(()=>viewer?store.tasks.filter((task)=>task.assigneeId===viewer.id):[],[viewer,store.tasks])
 const myMeetings=useMemo(()=>viewer?upcomingMeetings(new Date(),store.meetings.filter((meeting)=>meeting.organizerId===viewer.id||meeting.participantIds.includes(viewer.id)),5):[],[viewer,store.meetings])
 const myReports=useMemo(()=>viewer?store.reports.filter((report)=>report.authorId===viewer.id):[],[viewer,store.reports])
 const myRequests=useMemo(()=>viewer?store.requests.filter((request)=>request.requesterId===viewer.id):[],[viewer,store.requests])
 const metrics=useMemo<DashboardMetrics>(()=>viewer?{...personalMetrics(viewer.id),assignedTasks:metricValue(myTasks.filter((task)=>task.status!=='COMPLETED').length),completedTasks:metricValue(myTasks.filter((task)=>task.status==='COMPLETED').length),overdueTasks:metricValue(myTasks.filter((task)=>task.status==='OVERDUE').length),pendingReports:metricValue(myReports.filter((report)=>report.status!=='APPROVED').length),pendingRequests:metricValue(myRequests.filter((request)=>request.status==='PENDING').length),todayMeetings:metricValue(myMeetings.filter((meeting)=>meeting.startTime.slice(0,10)===new Date().toISOString().slice(0,10)).length)}:{},[viewer,myTasks,myReports,myRequests,myMeetings])
 const personalization=useDashboardPersonalization(dashboardPersonalizationByRole.EMPLOYEE)

 const deadlines=useMemo(()=>myTasks.filter((task)=>task.status!=='COMPLETED').slice(0,5).map((task)=>({id:task.id,title:task.title,deadline:task.deadline,assigneeName:task.assigneeName,overdue:task.overdue})),[myTasks])
 const kpis=useMemo<readonly KpiDefinition[]>(()=>[
  kpi('tasks','وظایف من',metrics.assignedTasks,'check-square','primary',true,()=>onNavigate?.('tasks')),
  kpi('completed','انجام‌شده',metrics.completedTasks,'check-square','success'),
  kpi('overdue','دارای تأخیر',metrics.overdueTasks,'clock','danger',true),
  kpi('reports','گزارش‌های در جریان',metrics.pendingReports,'report','info',false,()=>onNavigate?.('reports')),
  kpi('requests','درخواست‌های در انتظار',metrics.pendingRequests,'request','warning',true,()=>onNavigate?.('requests')),
  kpi('meetings','جلسات امروز',metrics.todayMeetings,'calendar','info',false,()=>onNavigate?.('meetings')),
 ],[metrics,onNavigate])
 if(!viewer)return null
 return <main className="dashboard-page dashboard-page--employee" aria-label="داشبورد کارشناس">
  <DashboardHeader
   title="فضای کاری من"
   userName={viewer.fullName}
   roleLabel={roleLabels.EMPLOYEE}
   departmentLabel={findDemoDepartment(viewer.departmentId)?.name}
   organizationName={ORGANIZATION}
   avatar={viewer.avatar}
   message="خلاصه وظایف، جلسات و درخواست‌های شما"
   actions={<Button startIcon={<Icon name="plus" size="sm"/>} onClick={()=>onNavigate?.('reports/create')}>گزارش جدید</Button>}/>
  <KpiSummary items={kpis} columns={3} loading={loading}/>

  <DashboardGrid className="dashboard-grid--content">
   <DashboardComposedLayout composition={EMPLOYEE_COMPOSITION} items={[
    {id:'tasks',kind:'summary',itemCount:4,prominence:'primary',node:personalization.isVisible('tasks')&&<StatBreakdownWidget title="وظایف من" icon="check-square" size="lg" presentation="personal" category="tasks" items={[
     {id:'active',label:'در حال انجام',value:myTasks.filter((task)=>task.status==='IN_PROGRESS').length,tone:'info'},
     {id:'pending',label:'در انتظار',value:myTasks.filter((task)=>task.status==='PENDING').length,tone:'warning'},
     {id:'completed',label:'انجام‌شده',value:myTasks.filter((task)=>task.status==='COMPLETED').length,tone:'success'},
     {id:'overdue',label:'دارای تأخیر',value:myTasks.filter((task)=>task.status==='OVERDUE').length,tone:'danger'},
    ]} loading={loading} error={error?'خطا در دریافت وظایف':undefined} onRetry={onRetry} onSelect={()=>onNavigate?.('tasks')}/>},
    {id:'meetings',kind:'list',itemCount:myMeetings.length,prominence:'primary',node:<CalendarPreviewWidget items={calendarItems(myMeetings)} title="جلسات من" loading={loading} onSelect={(item)=>onNavigate?.('meetings',item.id)}/>},
    {id:'reports',kind:'summary',itemCount:4,node:personalization.isVisible('reports')&&<StatBreakdownWidget title="گزارش‌های من" icon="report" presentation="personal" category="reports" items={[
     {id:'draft',label:'پیش‌نویس',value:myReports.filter((report)=>report.status==='DRAFT').length,tone:'neutral'},
     {id:'submitted',label:'ارسال‌شده',value:myReports.filter((report)=>report.status==='SUBMITTED').length,tone:'info'},
     {id:'returned',label:'بازگشتی',value:myReports.filter((report)=>report.status==='REJECTED').length,tone:'danger'},
     {id:'approved',label:'تأییدشده',value:myReports.filter((report)=>report.status==='APPROVED').length,tone:'success'},
    ]} loading={loading} onSelect={()=>onNavigate?.('reports')}/>},
    {id:'requests',kind:'summary',itemCount:3,node:personalization.isVisible('requests')&&<StatBreakdownWidget title="درخواست‌های من" icon="request" presentation="personal" category="requests" items={[
     {id:'pending',label:'در انتظار',value:myRequests.filter((request)=>request.status==='PENDING').length,tone:'warning'},
     {id:'approved',label:'تأییدشده',value:myRequests.filter((request)=>request.status==='APPROVED').length,tone:'success'},
     {id:'rejected',label:'ردشده',value:myRequests.filter((request)=>request.status==='REJECTED').length,tone:'danger'},
    ]} loading={loading} onSelect={()=>onNavigate?.('requests')}/>},
    {id:'deadlines',kind:'list',itemCount:deadlines.length,importance:'primary',node:<DeadlinesWidget items={deadlines} loading={loading} onSelect={(item)=>onNavigate?.('tasks',item.id)}/>},
    {id:'notifications',kind:'list',itemCount:notificationItems(viewer.id,store.notifications).length,node:<DashboardWidget title="اعلان‌های من" icon="bell" size="md" loading={loading}><NotificationSummary items={notificationItems(viewer.id,store.notifications)} unreadCount={demoUnreadNotificationCount(viewer.id,store.notifications)} onViewAll={()=>onNavigate?.('notifications')}/></DashboardWidget>},
   ]}/>
  </DashboardGrid>
 </main>
}

