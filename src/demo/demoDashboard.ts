import type {DemoNotification,DemoRole,DemoUser} from './demoTypes'
import {demoDataset,findDemoDepartment,findDemoUser} from './demoDataset'
import {reportViews,requestViews,taskViews} from './demoViews'
import {meetingViews,upcomingMeetings,type MeetingView} from './demoMeetingViews'
import type {DemoState} from './demoStore'
import {addPersianMonths,formatPersianDate,startOfPersianMonth} from '../core/utils'

export interface DashboardScope{role:DemoRole;userId:string;departmentId?:string}
export interface MetricValue{value:number;previous:number}
export interface DashboardMetrics{[key:string]:MetricValue}
export interface DepartmentOverviewRow{id:string;name:string;managerName:string;members:number;activeTasks:number;pendingReports:number;meetings:number;performance:number}
export interface SeriesPoint{label:string;value:number;color?:string}
export interface ActivityTrendSeries{id:string;label:string;color:string;dashed?:boolean;data:readonly SeriesPoint[]}
export interface UpcomingEvent{id:string;title:string;date:string;kind:'MEETING'|'TASK'|'REPORT';meta:string}

type DashboardSource=Pick<DemoState,'tasks'|'reports'|'meetings'|'requests'|'resolutions'>
const seedSource:DashboardSource={tasks:[...taskViews],reports:[...reportViews],meetings:[...meetingViews],requests:[...requestViews],resolutions:[]}
const drift=(value:number,factor:number)=>Math.max(0,Math.round(value*factor))
const metric=(value:number,factor=.85):MetricValue=>({value,previous:drift(value,factor)})

export const organizationMetrics=():DashboardMetrics=>({
 employees:metric(demoDataset.users.length,.92),departments:metric(demoDataset.departments.length,1),
 activeMeetings:metric(meetingViews.filter((item)=>['SCHEDULED','IN_PROGRESS','APPROVED'].includes(item.status)).length,.8),
 pendingApprovals:metric(meetingViews.filter((item)=>item.status==='PENDING_APPROVAL').length+reportViews.filter((item)=>item.status==='SUBMITTED').length,1.2),
 openTasks:metric(taskViews.filter((item)=>item.status!=='COMPLETED').length,1.1),completedTasks:metric(taskViews.filter((item)=>item.status==='COMPLETED').length,.7),
 reports:metric(reportViews.length,.75),pendingRequests:metric(requestViews.filter((item)=>item.status==='PENDING').length,1.15),
})
export const departmentMetrics=(departmentId:string):DashboardMetrics=>{
 const tasks=taskViews.filter((item)=>item.departmentId===departmentId),reports=reportViews.filter((item)=>item.departmentId===departmentId),requests=requestViews.filter((item)=>item.departmentId===departmentId),meetings=meetingViews.filter((item)=>item.departmentId===departmentId)
 return {departmentTasks:metric(tasks.filter((item)=>item.status!=='COMPLETED').length,1.1),teamMeetings:metric(meetings.length,.9),reportsAwaitingReview:metric(reports.filter((item)=>item.status==='SUBMITTED').length,1.2),pendingRequests:metric(requests.filter((item)=>item.status==='PENDING').length,1.05),overdueTasks:metric(tasks.filter((item)=>item.status==='OVERDUE').length,1.3),completedTasks:metric(tasks.filter((item)=>item.status==='COMPLETED').length,.8)}
}
export const personalMetrics=(userId:string):DashboardMetrics=>{
 const tasks=taskViews.filter((item)=>item.assigneeId===userId),reports=reportViews.filter((item)=>item.authorId===userId),requests=requestViews.filter((item)=>item.requesterId===userId),meetings=meetingViews.filter((item)=>item.participantIds.includes(userId)||item.organizerId===userId),today=new Date().toISOString().slice(0,10)
 return {assignedTasks:metric(tasks.filter((item)=>item.status!=='COMPLETED').length,1.1),completedTasks:metric(tasks.filter((item)=>item.status==='COMPLETED').length,.8),overdueTasks:metric(tasks.filter((item)=>item.status==='OVERDUE').length,1.4),pendingReports:metric(reports.filter((item)=>item.status!=='APPROVED').length,1.1),pendingRequests:metric(requests.filter((item)=>item.status==='PENDING').length,1),todayMeetings:metric(meetings.filter((item)=>item.startTime.slice(0,10)===today).length,1)}
}
export const secretaryMetrics=(userId:string):DashboardMetrics=>{
 const organised=meetingViews.filter((item)=>item.organizerId===userId),requests=demoDataset.meetingRequests
 return {meetingsCreated:metric(organised.length,.85),pendingMeetingRequests:metric(requests.filter((item)=>item.status==='PENDING').length,1.2),awaitingApproval:metric(meetingViews.filter((item)=>item.status==='PENDING_APPROVAL').length,1.1),completedMeetings:metric(meetingViews.filter((item)=>item.status==='COMPLETED').length,.9),draftMinutes:metric(demoDataset.minutes.filter((item)=>item.status==='DRAFT').length,1.15),finalizedMinutes:metric(demoDataset.minutes.filter((item)=>item.status==='FINALIZED').length,.85)}
}

export const departmentOverview=(source:DashboardSource=seedSource):readonly DepartmentOverviewRow[]=>demoDataset.departments.map((department)=>{
 const tasks=source.tasks.filter((item)=>item.departmentId===department.id),completed=tasks.filter((item)=>item.status==='COMPLETED').length
 return {id:department.id,name:department.name,managerName:findDemoUser(department.managerId)?.fullName??'—',members:demoDataset.users.filter((item)=>item.departmentId===department.id).length,activeTasks:tasks.filter((item)=>item.status!=='COMPLETED').length,pendingReports:source.reports.filter((item)=>item.departmentId===department.id&&item.status==='SUBMITTED').length,meetings:source.meetings.filter((item)=>item.departmentId===department.id).length,performance:tasks.length?Math.round(completed/tasks.length*100):0}
})
export const workloadDistribution=(source:DashboardSource=seedSource):readonly SeriesPoint[]=>departmentOverview(source).map((row)=>({label:row.name,value:row.activeTasks}))
export const departmentPerformanceSeries=(source:DashboardSource=seedSource):readonly SeriesPoint[]=>departmentOverview(source).map((row)=>({label:row.name,value:row.performance}))
const persianMonths=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور']
/** Retained for compatibility with secondary surfaces; the main dashboard uses organizationActivityTrend. */
export const monthlyActivitySeries=():readonly SeriesPoint[]=>persianMonths.map((label,index)=>({label,value:20+((taskViews.length*(index+3))%45)+((reportViews.length*(index+2))%25)}))
export const taskStatusSeries=(tasks:DashboardSource['tasks']=seedSource.tasks):readonly SeriesPoint[]=>[
 {label:'انجام‌شده',value:tasks.filter((item)=>item.status==='COMPLETED').length,color:'var(--color-chart-1)'},
 {label:'در حال انجام',value:tasks.filter((item)=>item.status==='IN_PROGRESS').length,color:'var(--color-chart-2)'},
 {label:'در انتظار',value:tasks.filter((item)=>item.status==='PENDING').length,color:'var(--color-chart-3)'},
 {label:'دارای تأخیر',value:tasks.filter((item)=>item.status==='OVERDUE').length,color:'var(--color-chart-4)'},
]
export const organizationActivityTrend=(source:DashboardSource,anchor=new Date()):readonly ActivityTrendSeries[]=>{
 const buckets=Array.from({length:6},(_,index)=>{const start=addPersianMonths(startOfPersianMonth(anchor),index-5);return {start,end:addPersianMonths(start,1),label:formatPersianDate(start,{month:'long'})}})
 const count=(dates:readonly string[],start:Date,end:Date)=>dates.filter((value)=>{const time=new Date(value).getTime();return time>=start.getTime()&&time<end.getTime()}).length
 const completedTaskDates=source.tasks.filter((item)=>item.status==='COMPLETED').map((item)=>item.createdAt)
 const reportDates=[...source.reports.map((item)=>item.submittedAt)]
 const meetingDates=source.meetings.map((item)=>item.startTime)
 const requestDates=source.requests.map((item)=>item.createdAt)
 return [
  {id:'completed-tasks',label:'وظایف تکمیل‌شده',color:'var(--color-chart-1)',data:buckets.map((bucket)=>({label:bucket.label,value:count(completedTaskDates,bucket.start,bucket.end)}))},
  {id:'reports',label:'گزارش‌ها',color:'var(--color-chart-2)',data:buckets.map((bucket)=>({label:bucket.label,value:count(reportDates,bucket.start,bucket.end)}))},
  {id:'meetings',label:'جلسات',color:'var(--color-chart-3)',dashed:true,data:buckets.map((bucket)=>({label:bucket.label,value:count(meetingDates,bucket.start,bucket.end)}))},
  {id:'requests',label:'درخواست‌ها',color:'var(--color-chart-4)',data:buckets.map((bucket)=>({label:bucket.label,value:count(requestDates,bucket.start,bucket.end)}))},
 ]
}

export const notificationsForUser=(userId:string,limit=6):readonly DemoNotification[]=>demoDataset.notifications.filter((item)=>item.userId===userId).slice().sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,limit)
export const unreadNotificationCount=(userId:string)=>demoDataset.notifications.filter((item)=>item.userId===userId&&!item.read).length
export const upcomingEvents=(scope:DashboardScope,limit=6,source:DashboardSource=seedSource):readonly UpcomingEvent[]=>{
 const now=new Date()
 const scopedMeetings:readonly MeetingView[]=scope.role==='CEO'?source.meetings:scope.role==='DEPARTMENT_MANAGER'&&scope.departmentId?source.meetings.filter((item)=>item.departmentId===scope.departmentId):source.meetings.filter((item)=>item.organizerId===scope.userId||item.participantIds.includes(scope.userId))
 const meetings:readonly UpcomingEvent[]=upcomingMeetings(now,scopedMeetings,limit).map((item)=>({id:item.id,title:item.title,date:item.startTime,kind:'MEETING',meta:`${item.location} • ${item.modeLabel}`}))
 const deadlines:readonly UpcomingEvent[]=source.tasks.filter((item)=>item.status!=='COMPLETED'&&(scope.role==='CEO'||item.assigneeId===scope.userId||item.departmentId===scope.departmentId)).slice(0,limit).map((item)=>({id:item.id,title:item.title,date:item.deadline,kind:'TASK',meta:`مسئول: ${item.assigneeName}`}))
 return [...meetings,...deadlines].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()).slice(0,limit)
}
export const demoUserByRole=(role:DemoRole):DemoUser|undefined=>demoDataset.users.find((item)=>item.role===role)
export const scopeForUser=(userId:string):DashboardScope=>{const user=findDemoUser(userId);return {role:user?.role??'EMPLOYEE',userId,departmentId:user?.departmentId}}
export const departmentNameOfUser=(userId:string)=>findDemoDepartment(findDemoUser(userId)?.departmentId??'')?.name??'—'
