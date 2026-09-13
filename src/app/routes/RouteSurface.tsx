import {useMemo} from 'react'

import {Button,Icon} from '../../components/ui'
import {useAuth} from '../../features/auth/hooks/useAuth'
import {services} from '../dependencies'
import {findNavigationItem} from '../navigation/navigationConfig'
import {getBreadcrumbs,PageHeader,StandardPage} from '../layout'
import {formatPersianDate} from '../../core/utils'
import type {RoleCode} from '../../domain/enums'
import {CeoDashboardPage,DepartmentManagerDashboardPage,SecretaryDashboardPage,EmployeeDashboardPage} from '../../features/dashboard/pages'
import {MeetingsListPage,MeetingRequestsPage,CreateMeetingPage,MeetingDetailsPage,LiveMeetingWorkspacePage,SecretaryResolutionsPage} from '../../features/meetings/pages'
import {TasksCollectionPage,CreateTaskPage,TaskDetailsPage,DepartmentManagerTasksPage} from '../../features/tasks/pages'
import {ReportsCollectionPage,CreateReportPage,ReportDetailsPage,DepartmentManagerReportsPage} from '../../features/reports/pages'
import {RequestsCollectionPage,CreateRequestPage,RequestDetailsPage} from '../../features/requests/pages'
import {
  demoApproveRequest,demoRejectRequest,demoCreateRequest,
  canActOnTask,demoAddTaskAttachments,demoCreateTask,demoRemoveTaskAttachment,demoTasksForViewer,demoUpdateTaskStatus,
  canReviewReportNow,demoCreateReport,demoReportsForViewer,demoResubmitReport,demoReviewReport,
  demoChangeMeetingStatus,demoCreateMeeting,demoRemoveMeeting,demoSaveMeetingDraft,demoScheduleMeeting,demoUpdateMeeting,
  demoNotificationsForUser,demoMarkAllNotificationsRead,demoMarkNotificationsRead,demoNotifyUsers,
  demoUsers,userOptions,useDemoState,meetingToCreateFormValues,
  type CreateMeetingPayload,type CreateReportPayload,type CreateRequestPayload,type CreateTaskPayload,
} from '../../demo'
import {type RouteNavigateFn} from './dashboardTargets'
import {can} from '../../security'
import {Capabilities} from '../../security/permissions'
import {AccessDeniedPage} from './StatePages'
import {CalendarSurface,FilesSurface,OrganizationSurface,PerformanceSurface,SearchSurface} from './ModuleSurfaces'
import {SettingsPage} from '../../features/settings/pages/SettingsPage'

const descriptions:Readonly<Record<string,string>>={
 '/dashboard':'نمای کلی اطلاعات و فعالیت‌های مرتبط با محدوده دسترسی شما',
 '/organization':'ساختار سازمانی، واحدها و اعضای مجاز',
 '/meetings':'جلسات و مستندات قابل دسترس',
 '/tasks':'وظایف مرتبط با شما و محدوده سازمانی مجاز',
 '/reports':'گزارش‌های قابل مشاهده در محدوده دسترسی',
 '/requests':'درخواست‌ها و وضعیت بررسی آن‌ها',
 '/notifications':'پیام‌ها و رویدادهای مرتبط با حساب شما',
 '/files':'فایل‌ها و پیوست‌های مجاز',
 '/performance':'نمای عملکرد متناسب با نقش و محدوده شما',
}

function EmptyModuleState({path}:{path:string}){
 const item=findNavigationItem(path)
 return <section className="card state-panel module-empty"><span className="state-panel__icon"><Icon name={item?.icon??'dashboard'} size={28}/></span><div><h2>اطلاعاتی برای نمایش وجود ندارد</h2><p>پس از ثبت یا دریافت اطلاعات مجاز، محتوای این بخش در همین صفحه نمایش داده می‌شود.</p></div></section>
}

function NotificationsSurface({userId,onNavigate}:{userId:string;onNavigate?:RouteNavigateFn}){
 const store=useDemoState()
 const notifications=demoNotificationsForUser(userId,store.notifications)
 if(!notifications.length)return <EmptyModuleState path="/notifications"/>
 const unread=notifications.filter((item)=>!item.read).length
 return <div className="stack">
   {unread>0&&<div className="button-row"><Button size="sm" variant="secondary" onClick={()=>demoMarkAllNotificationsRead(userId)}>خواندن همه اعلان‌ها</Button></div>}
  {notifications.map((item)=><article className={`card notification-card${item.read?'':' is-unread'}`} key={item.id} onClick={()=>{demoMarkNotificationsRead([item.id]);if(item.link)onNavigate?.(item.link.replace(/^\//,''))}} style={{cursor:'pointer'}}><header><strong>{item.title}</strong><span className="badge" data-status={item.priority==='HIGH'?'OVERDUE':'ACTIVE'}>{item.priority}</span></header><p>{item.body}</p><time dateTime={item.createdAt}>{formatPersianDate(item.createdAt)}</time></article>)}
 </div>
}

const DIRECT_PATHS:Readonly<Set<string>>=new Set(['/dashboard','/calendar','/meetings','/meetings/requests','/meetings/create','/tasks','/tasks/create','/reports','/reports/create','/requests','/requests/create','/organization','/performance','/files','/search','/settings'])
const RELATED_NAMES:Readonly<Record<string,string>>={meeting:'meetings',task:'tasks',report:'reports',request:'requests',decision:'meetings',minutes:'meetings',member:'organization'}
function findDetail(path:string){const seg=path.split('/');const core=seg.filter((part)=>part.length>0);if(core.length!==2)return undefined;const [module,id]=core;return {module,id}}
const findWorkspaceId=(path:string)=>{const match=path.match(/^\/meetings\/([^/]+)\/workspace$/);return match?match[1]:undefined}
const findMeetingEditId=(path:string)=>{const match=path.match(/^\/meetings\/([^/]+)\/edit$/);return match?match[1]:undefined}
const findMeetingRecreateId=(path:string)=>{const match=path.match(/^\/meetings\/([^/]+)\/recreate$/);return match?match[1]:undefined}
const findTaskReportId=(path:string)=>{const match=path.match(/^\/tasks\/([^/]+)\/report$/);return match?match[1]:undefined}

function DetailRoute({path,onNavigate}:{path:string;onNavigate?:RouteNavigateFn}){
 const detail=findDetail(path)
 const store=useDemoState()
 const auth=useAuth()
 if(!detail)return <EmptyModuleState path={path}/>
 const {module,id}=detail
 const relate=(kind:string,relatedId:string)=>onNavigate?.(RELATED_NAMES[kind]??kind,relatedId)
 const back=()=>onNavigate?.(module)
 const canReviewRequests=can(auth,Capabilities.REQUEST_REVIEW)
 /* Who is looking — used to decide whether a report is on this person's desk. */
 const viewer={userId:auth.userId,departmentId:auth.departmentIds[0],roles:auth.roles as readonly string[]}
 if(module==='meetings'){
     const meeting=store.meetings.find((item)=>item.id===id)
     if(!meeting)return <EmptyModuleState path={path}/>
     const canSeeMeeting=auth.roles.includes('MAIN_MANAGER')||auth.roles.includes('SECRETARY')||meeting.organizerId===auth.userId||meeting.participantIds.includes(auth.userId)||(auth.roles.includes('DEPARTMENT_MANAGER')&&auth.departmentIds.includes(meeting.departmentId))
     if(!canSeeMeeting)return <AccessDeniedPage/>
     const agendaItems=store.meetingAgendaItems.filter((item)=>item.meetingId===meeting.id)
     const canManageMeeting=can(auth,Capabilities.MEETING_MANAGE)
     return <MeetingDetailsPage
      meeting={meeting}
      participants={meeting.participantCount}
      agendaCount={agendaItems.length}
      attachmentsCount={0}
      onOpenCalendar={()=>onNavigate?.('calendar')}
      onOpenWorkspace={(auth.roles.includes('MAIN_MANAGER')||auth.roles.includes('SECRETARY'))?()=>onNavigate?.(`meetings/${id}/workspace`):undefined}
      onEdit={canManageMeeting&&meeting.status!=='COMPLETED'&&meeting.status!=='CANCELLED'?()=>onNavigate?.(`meetings/${id}/edit`):undefined}
      editLabel={meeting.status==='DRAFT'?'زمان‌بندی جلسه':'ویرایش'}
      onRecreate={can(auth,Capabilities.MEETING_CREATE)?()=>onNavigate?.(`meetings/${id}/recreate`):undefined}
      onCancelMeeting={canManageMeeting?()=>demoChangeMeetingStatus(id,'CANCELLED'):undefined}
      onDelete={canManageMeeting?()=>{if(demoRemoveMeeting(id))onNavigate?.('meetings')}:undefined}
     />
    }
 if(module==='tasks'){
  const task=store.tasks.find((item)=>item.id===id)
  const taskViewer={userId:auth.userId,departmentId:auth.departmentIds[0],roles:auth.roles as readonly string[]}
  if(task&&!demoTasksForViewer(store.tasks,taskViewer).some((item)=>item.id===task.id))return <AccessDeniedPage/>
  const canUpdateTask=Boolean(task)&&canActOnTask(task!,auth.userId)&&(can(auth,Capabilities.TASK_UPDATE_SELF)||can(auth,Capabilities.TASK_REVIEW))
  const canManageAttachments=Boolean(task)&&canActOnTask(task!,auth.userId)&&can(auth,Capabilities.FILE_MANAGE)
  return task?<TaskDetailsPage
   task={task}
   onBack={back}
   onOpenRelated={relate}
   canUpdate={canUpdateTask}
   onUpdateStatus={canUpdateTask?(status:string)=>demoUpdateTaskStatus(auth,id,status):undefined}
   onOpenCalendar={()=>onNavigate?.('calendar')}
   onOpenMeeting={task.meetingId?()=>onNavigate?.('meetings',task.meetingId):undefined}
   onCreateReport={can(auth,Capabilities.REPORT_CREATE)&&!auth.roles.includes('MAIN_MANAGER')&&task.assigneeId===auth.userId||auth.roles.includes('DEPARTMENT_MANAGER')?()=>onNavigate?.('tasks',`${task.id}/report`):undefined}
   canManageAttachments={canManageAttachments}
   onAddAttachments={canManageAttachments?(files:readonly File[])=>{demoAddTaskAttachments(auth,task.id,auth.userId,files)}:undefined}
   onRemoveAttachment={canManageAttachments?(fileId:string)=>{demoRemoveTaskAttachment(auth,task.id,fileId,auth.userId)}:undefined}
  />:<EmptyModuleState path={path}/>
 }
 if(module==='reports'){
  const report=store.reports.find((item)=>item.id===id)
  const mayView=Boolean(report)&&demoReportsForViewer(store.reports,viewer).some((item)=>item.id===id)
  if(report&&!mayView)return <AccessDeniedPage/>
  /* Reviewing is not a blanket capability: the report must actually be sitting
     on this viewer's desk (own unit for a manager, post-manager for the CEO). */
  const mayReview=Boolean(report)&&canReviewReportNow(auth,viewer,report!)
  const mayResubmit=Boolean(report)&&report!.authorId===auth.userId&&report!.stage==='AUTHOR'
  return report?<ReportDetailsPage
   report={report}
   onBack={back}
   onOpenRelated={relate}
   canReview={mayReview}
   onReview={mayReview?(approved,comment)=>demoReviewReport(auth,id,approved,comment,auth.userId):undefined}
   canResubmit={mayResubmit}
   onResubmit={mayResubmit?(summary)=>demoResubmitReport(auth,id,summary):undefined}
  />:<EmptyModuleState path={path}/>
 }
 if(module==='requests'){
  const request=store.requests.find((item)=>item.id===id)
  const canReviewThis=request&&canReviewRequests&&((request.stage==='DEPARTMENT'&&auth.roles.includes('DEPARTMENT_MANAGER'))||(request.stage==='EXECUTIVE'&&auth.roles.includes('MAIN_MANAGER')))
  return request?<RequestDetailsPage
   request={request}
   onBack={back}
   onOpenRelated={relate}
   canReview={Boolean(canReviewThis)}
   onApprove={canReviewThis?()=>demoApproveRequest(auth,id):undefined}
   onReject={canReviewThis?(reason)=>demoRejectRequest(auth,id,reason):undefined}
  />:<EmptyModuleState path={path}/>
 }
 return <EmptyModuleState path={path}/>
}

function RoleDashboard({roles,userId,onNavigate}:{roles:readonly RoleCode[];userId:string;onNavigate?:RouteNavigateFn}){
 if(roles.includes('MAIN_MANAGER'))return <CeoDashboardPage userId={userId} onNavigate={onNavigate}/>
 if(roles.includes('DEPARTMENT_MANAGER'))return <DepartmentManagerDashboardPage userId={userId} onNavigate={onNavigate}/>
 if(roles.includes('SECRETARY'))return <SecretaryDashboardPage userId={userId} onNavigate={onNavigate}/>
 return <EmployeeDashboardPage userId={userId} onNavigate={onNavigate}/>
}

export function RouteSurface({path,userId,onNavigate}:{path:string;userId:string;onNavigate?:RouteNavigateFn}){
 const auth=useAuth()
 const store=useDemoState()
 const roles=auth.roles
 const canCreateMeeting=can(auth,Capabilities.MEETING_CREATE)
 const canManageMeeting=can(auth,Capabilities.MEETING_MANAGE)
 const canCreateTask=can(auth,Capabilities.TASK_CREATE)
 const canCreateReport=can(auth,Capabilities.REPORT_CREATE)
 /* The CEO reviews and approves requests, he never files one, so the create
    affordance (and the create route) stays hidden for MAIN_MANAGER. */
 const canCreateRequest=can(auth,Capabilities.REQUEST_CREATE)&&!roles.includes('MAIN_MANAGER')

  const item=findNavigationItem(path)??{label:'داشبورد',path:'/dashboard',icon:'dashboard' as const}
 const content=useMemo(()=>{
  const createMeeting=canCreateMeeting&&onNavigate?()=>onNavigate('meetings/create'):undefined
  const createTask=canCreateTask&&onNavigate?()=>onNavigate('tasks/create'):undefined
  const createReport=canCreateReport&&onNavigate?()=>onNavigate('reports/create'):undefined
  const createRequest=canCreateRequest&&onNavigate?()=>onNavigate('requests/create'):undefined
  const submitRequest=(payload:Readonly<Record<string,unknown>>)=>{
   const input:CreateRequestPayload={
    title:String(payload.title??''),
    description:String(payload.description??''),
    type:String(payload.type??''),
    departmentId:String(payload.department??''),
    priority:String(payload.priority??''),
   }
   const created=demoCreateRequest(auth,userId,input)
   if(created)onNavigate?.('requests')
  }
  const submitTask=(payload:Readonly<Record<string,unknown>>)=>{
   const input:CreateTaskPayload={
    title:String(payload.title??''),
    description:String(payload.description??''),
    assignees:(payload.assignees as readonly string[])??[],
    department:String(payload.department??'')||undefined,
    priority:String(payload.priority??'')||undefined,
    deadline:String(payload.deadline??'')||undefined,
    meetingId:String(payload.meeting??'')||undefined,
   }
   const created=demoCreateTask(auth,userId,input)
   if(created)onNavigate?.('tasks')
  }
  const submitReport=(payload:Readonly<Record<string,unknown>>)=>{
   const input:CreateReportPayload={
    title:String(payload.title??''),
    summary:String(payload.summary??''),
    department:String(payload.department??'')||undefined,
    period:String(payload.period??'')||undefined,
    type:String(payload.type??'')||undefined,
    draft:Boolean(payload.draft),
    taskId:String(payload.taskId??'')||undefined,
   }
   const created=demoCreateReport(auth,userId,input)
   if(created)onNavigate?.('reports')
  }
   /* Tasks assigned to me that came out of a meeting resolution — the report
     form uses these so the employee can say which session the report answers. */
  const myMeetingTasks=store.tasks
   .filter((task)=>task.assigneeId===userId&&task.status!=='COMPLETED')
   .map((task)=>{
    const resolution=store.resolutions.find((item)=>item.taskId===task.id)
     return {value:task.id,label:task.title,description:resolution?`جلسه: ${resolution.meetingTitle}`:'وظیفه سازمانی'}
   })

  const submitMeeting=(payload:CreateMeetingPayload)=>{
   const created=demoCreateMeeting(userId,payload)
   if(created)onNavigate?.('meetings')
  }
  const saveMeetingDraft=(payload:CreateMeetingPayload)=>{
   const saved=demoSaveMeetingDraft(userId,payload)
   if(saved)onNavigate?.('meetings')
  }
  /* Visibility follows the role, not the tab: the CEO and the secretary run the
     whole meeting programme, a manager sees their unit, and everyone else only
     sees the sessions they organise or were invited to. The same scope feeds the
     list and the calendar so both always agree. */
  const seesEveryMeeting=roles.includes('MAIN_MANAGER')||roles.includes('SECRETARY')
  const visibleMeetings=seesEveryMeeting
   ?store.meetings
   :roles.includes('DEPARTMENT_MANAGER')
    ?store.meetings.filter((meeting)=>auth.departmentIds.includes(meeting.departmentId)||meeting.organizerId===userId||meeting.participantIds.includes(userId))

    :store.meetings.filter((meeting)=>meeting.organizerId===userId||meeting.participantIds.includes(userId))
  /* An employee only ever works with their own records; reviewers keep the
     department/organisation view their role already grants them. */
  const taskViewer={userId,departmentId:auth.departmentIds[0],roles:roles as readonly string[]}
  const visibleTasks=demoTasksForViewer(store.tasks,taskViewer)
  const reportViewer={userId,departmentId:auth.departmentIds[0],roles:roles as readonly string[]}
  const visibleReports=demoReportsForViewer(store.reports,reportViewer)
  const visibleRequests=roles.includes('MAIN_MANAGER')?store.requests.filter((r)=>r.stage==='EXECUTIVE'||r.status!=='PENDING'):roles.includes('DEPARTMENT_MANAGER')?store.requests.filter((r)=>r.stage==='DEPARTMENT'||r.requesterId===userId):store.requests.filter((r)=>r.requesterId===userId)
  const taskAssigneeOptions=roles.includes('DEPARTMENT_MANAGER')
   ?userOptions.filter((option)=>{
    const user=demoUsers.find((candidate)=>candidate.id===option.value)
    return user?.role==='EMPLOYEE'&&auth.departmentIds.includes(user.departmentId)
   })
   :userOptions

   switch(path){
   case '/dashboard':return <RoleDashboard roles={roles} userId={userId} onNavigate={onNavigate}/>
   case '/meetings':return <MeetingsListPage meetings={visibleMeetings} description={seesEveryMeeting?'فهرست جلسات سازمان':'جلساتی که در آن‌ها عضو یا برگزارکننده هستید'} onCreateMeeting={createMeeting} onOpenMeeting={onNavigate?m=>onNavigate('meetings',m.id):undefined}/>

   case '/meetings/requests':return roles.includes('SECRETARY')?<AccessDeniedPage/>:<MeetingRequestsPage requests={store.meetingRequests}/>
   case '/meetings/create':return canCreateMeeting?<CreateMeetingPage onCancel={createMeeting?()=>onNavigate?.('meetings'):undefined} onSubmit={submitMeeting} onSaveDraft={saveMeetingDraft}/>:<AccessDeniedPage/>
   case '/tasks':{
    const openTask=onNavigate?(task:(typeof visibleTasks)[number])=>onNavigate('tasks',task.id):undefined
    const handleCreateReport=canCreateReport&&!roles.includes('MAIN_MANAGER')&&onNavigate?(taskId:string)=>onNavigate('tasks',`${taskId}/report`):undefined
    if(roles.includes('DEPARTMENT_MANAGER')){
     return <DepartmentManagerTasksPage userId={userId} departmentId={auth.departmentIds[0]} onOpenTask={openTask} onCreateTask={createTask} onCreateReport={handleCreateReport}/>
    }
    return <TasksCollectionPage tasks={visibleTasks} onCreateTask={createTask} onUpdateStatus={(taskId,status)=>demoUpdateTaskStatus(auth,taskId,status)} onOpenTask={openTask} onCreateReport={handleCreateReport}/>
   }

   case '/tasks/create':return canCreateTask?<CreateTaskPage
    assigneeOptions={taskAssigneeOptions}
    defaultDepartment={roles.includes('DEPARTMENT_MANAGER')?auth.departmentIds[0]:undefined}
    onCancel={canCreateTask?()=>onNavigate?.('tasks'):undefined}
    onSubmit={submitTask}
   />:<AccessDeniedPage/>
   case '/reports':{
    const openReport=onNavigate?(report:(typeof visibleReports)[number])=>onNavigate('reports',report.id):undefined
    if(roles.includes('DEPARTMENT_MANAGER')){
     return <DepartmentManagerReportsPage userId={userId} departmentId={auth.departmentIds[0]} onOpenReport={openReport} onCreateReport={createReport}/>
    }
    return <ReportsCollectionPage reports={visibleReports} title={roles.includes('SECRETARY')?'گزارش‌های من':'گزارش‌ها'} description={roles.includes('SECRETARY')?'فقط گزارش‌هایی که خودتان ثبت کرده‌اید':undefined} onCreateReport={createReport} onOpenReport={openReport}/>
   }

   case '/reports/create':return canCreateReport?<CreateReportPage onCancel={canCreateReport?()=>onNavigate?.('reports'):undefined} onSubmit={submitReport} linkableTasks={myMeetingTasks}/>:<AccessDeniedPage/>

   case '/requests':return <RequestsCollectionPage requests={visibleRequests} onCreateRequest={createRequest} onOpenRequest={onNavigate?r=>onNavigate('requests',r.id):undefined}/>

   case '/requests/create':return canCreateRequest?<CreateRequestPage onCancel={canCreateRequest?()=>onNavigate?.('requests'):undefined} onSubmit={submitRequest}/>:<AccessDeniedPage/>
   case '/resolutions':return roles.includes('SECRETARY')?<SecretaryResolutionsPage onOpenMeeting={(meetingId)=>onNavigate?.(`meetings/${meetingId}/workspace`)}/>:<AccessDeniedPage/>
   case '/organization':return <OrganizationSurface userId={userId}/>
   case '/performance':return <PerformanceSurface userId={userId} onNavigate={onNavigate}/>
   case '/settings':return <SettingsPage roles={roles}/>
   case '/files':return <FilesSurface onNavigate={onNavigate}/>
   case '/calendar':return <CalendarSurface principal={auth} onNavigate={onNavigate}/>
   case '/search':return <SearchSurface keyword="" onNavigate={onNavigate}/>
   case '/notifications':return <NotificationsSurface userId={userId} onNavigate={onNavigate}/>
   default:{
   const editMeetingId=findMeetingEditId(path)
    if(editMeetingId){
     const meeting=store.meetings.find((item)=>item.id===editMeetingId)
     if(!meeting)return <EmptyModuleState path={path}/>
     if(!canManageMeeting)return <AccessDeniedPage/>
     return <CreateMeetingPage
      initialMeeting={meeting}
      initialAgenda={store.meetingAgendaItems.filter((item)=>item.meetingId===meeting.id)}
      onCancel={()=>onNavigate?.('meetings',meeting.id)}
      onSubmit={(payload)=>{const result=meeting.status==='DRAFT'?demoScheduleMeeting(meeting.id,payload):demoUpdateMeeting(meeting.id,payload);if(result)onNavigate?.('meetings',meeting.id)}}
      onSaveDraft={(payload)=>{const result=demoUpdateMeeting(meeting.id,payload);if(result)onNavigate?.('meetings',meeting.id)}}
     />
    }
    const recreateMeetingId=findMeetingRecreateId(path)
    if(recreateMeetingId){
     const sourceMeeting=store.meetings.find((item)=>item.id===recreateMeetingId)
     if(!sourceMeeting)return <EmptyModuleState path={path}/>
     if(!canCreateMeeting)return <AccessDeniedPage/>
     const recreatedInitialAgenda=store.meetingAgendaItems.filter((item)=>item.meetingId===sourceMeeting.id)
     return <CreateMeetingPage
      recreateFrom={sourceMeeting}
      initialAgenda={recreatedInitialAgenda}
      onCancel={()=>onNavigate?.('meetings',sourceMeeting.id)}
      onSubmit={(payload)=>{const created=demoCreateMeeting(userId,payload);if(created)onNavigate?.('meetings')}}
     />
    }
    const reportTaskId=findTaskReportId(path)
    if(reportTaskId){
     const task=store.tasks.find((item)=>item.id===reportTaskId)
     if(!task)return <EmptyModuleState path={path}/>
     if(!canCreateReport)return <AccessDeniedPage/>
     const isManager=roles.includes('DEPARTMENT_MANAGER')&&auth.departmentIds.includes(task.departmentId)
     const isAssignee=task.assigneeId===userId
     if(!isAssignee&&!isManager)return <AccessDeniedPage/>
     return <CreateReportPage defaultTaskId={task.id} linkableTasks={[{value:task.id,label:task.title,description:task.meetingTitle?`جلسه: ${task.meetingTitle}`:'وظیفه سازمانی'}]} onCancel={()=>onNavigate?.('tasks',task.id)} onSubmit={submitReport}/>
    }
    const workspaceId=findWorkspaceId(path)
    if(workspaceId){
     const meeting=store.meetings.find((item)=>item.id===workspaceId)
     const canSeeWorkspace=Boolean(meeting)&&(roles.includes('MAIN_MANAGER')||roles.includes('SECRETARY'))
     if(meeting&&!canSeeWorkspace)return <AccessDeniedPage/>
     if(meeting)return <LiveMeetingWorkspacePage
      meeting={meeting}
      auth={auth}
      onExit={()=>onNavigate?.('meetings')}
      onNotifications={(participantIds,input)=>demoNotifyUsers(participantIds,input.title,input.description,'MEETING',`/meetings/${meeting.id}`)}
      onAudit={(action,before,after)=>void services.audit.record({actorId:auth.userId,action,entityType:'meeting',entityId:meeting.id,before,after})}
      onOpenTask={(taskId)=>onNavigate?.('tasks',taskId)}
     />

     return <EmptyModuleState path={path}/>
    }
    return findDetail(path)?<DetailRoute path={path} onNavigate={onNavigate}/>:<EmptyModuleState path={path}/>
   }
  }
 },[path,roles,userId,onNavigate,canCreateMeeting,canManageMeeting,canCreateTask,canCreateReport,canCreateRequest,auth,store])
 if(DIRECT_PATHS.has(path)||findDetail(path)||Boolean(findWorkspaceId(path))||Boolean(findMeetingEditId(path))||Boolean(findMeetingRecreateId(path))||Boolean(findTaskReportId(path)))return content
 return <StandardPage><PageHeader title={item.label} description={descriptions[item.path]} breadcrumbs={getBreadcrumbs(item.path)}/>{content}</StandardPage>
}

