import type {DemoFile,DemoReport,DemoRequest,DemoTask,DemoUser} from './demoTypes'
import {demoDataset,findDemoDepartment,findDemoUser} from './demoDataset'
/** Presentation view-models derived from demo seed data. Replaceable by API responses without touching UI components. */
export interface TaskView extends DemoTask{code:string;assigneeName:string;creatorName:string;departmentName:string;meetingTitle?:string;overdue:boolean}

/** One step of the approval chain, kept so both reviewers and the author can see
    who decided what and why a report came back for correction. */
export interface ReportReviewEntry{
 id:string
 /** 'DEPARTMENT' = مدیر واحد, 'EXECUTIVE' = مدیر عامل */
 stage:'DEPARTMENT'|'EXECUTIVE'
 reviewerId:string
 reviewerName:string
 decision:'APPROVED'|'RETURNED'
 comment?:string
 decidedAt:string
}

/** Which desk the report is sitting on right now.
    `DEPARTMENT` → منتظر مدیر واحد, `EXECUTIVE` → منتظر مدیر عامل,
    `AUTHOR` → برگشته برای اصلاح, `COMPLETED` → تأیید نهایی. */
export type ReportStage='DRAFT'|'DEPARTMENT'|'EXECUTIVE'|'AUTHOR'|'COMPLETED'

/** `meetingId`/`meetingTitle` trace a report back to the session whose
    resolution asked for it, so a manager reading the report always knows which
    meeting it answers to. `stage` carries the approval chain: an employee's
    report goes to the department manager first and only then to the CEO, while a
    department manager reports straight to the CEO. */
export interface ReportView extends DemoReport{code:string;authorName:string;departmentName:string;type:string;priority:'LOW'|'NORMAL'|'HIGH'|'CRITICAL';meetingId?:string;meetingTitle?:string;taskId?:string;taskTitle?:string;stage:ReportStage;reviews:readonly ReportReviewEntry[]}

export type RequestStage='DEPARTMENT'|'EXECUTIVE'|'COMPLETED'
export interface RequestView extends DemoRequest{code:string;requesterName:string;departmentName:string;priority:'LOW'|'NORMAL'|'HIGH'|'CRITICAL';typeLabel:string;submittedAt:string;stage:RequestStage}
export interface FileView extends DemoFile{uploaderName:string}
const nameOf=(id:string)=>findDemoUser(id)?.fullName??'کاربر نامشخص'
const departmentNameOf=(id:string)=>findDemoDepartment(id)?.name??'واحد نامشخص'
const pad=(value:number,size=4)=>String(value).padStart(size,'0')
const numericSuffix=(id:string)=>Number(id.split('-').at(-1)??0)
const reportTypes=['عملکردی','مالی','عملیاتی','تحلیلی','آموزشی']
const requestTypeLabels:Readonly<Record<DemoRequest['type'],string>>={LEAVE:'مرخصی',EQUIPMENT:'تجهیزات',BUDGET:'بودجه',ACCESS:'دسترسی',OTHER:'سایر'}
const priorities:readonly('LOW'|'NORMAL'|'HIGH'|'CRITICAL')[]=['NORMAL','HIGH','LOW','CRITICAL']
export const taskViews:readonly TaskView[]=demoDataset.tasks.map((task)=>({
 ...task,
 code:`TSK-${pad(numericSuffix(task.id))}`,
 assigneeName:nameOf(task.assigneeId),
 creatorName:nameOf(task.creatorId),
 departmentName:departmentNameOf(task.departmentId),
 meetingTitle:task.meetingId?demoDataset.meetings.find((meeting)=>meeting.id===task.meetingId)?.title:undefined,
 overdue:task.status==='OVERDUE',
}))
/** Seed reports carry a status only, so the desk they wait on is derived from it:
    a submitted report from an employee waits on their manager, one already under
    review waits on the CEO. */
const stageFromSeed=(report:DemoReport):ReportStage=>{
 if(report.status==='DRAFT')return 'DRAFT'
 if(report.status==='APPROVED')return 'COMPLETED'
 if(report.status==='REJECTED')return 'AUTHOR'
 if(report.status==='UNDER_REVIEW')return 'EXECUTIVE'
 /* A department manager has no manager above them but the CEO. */
 return findDemoUser(report.authorId)?.role==='EMPLOYEE'?'DEPARTMENT':'EXECUTIVE'
}
export const reportViews:readonly ReportView[]=demoDataset.reports.map((report,index)=>({
 ...report,
 code:`RPT-${pad(numericSuffix(report.id))}`,
 authorName:nameOf(report.authorId),
 departmentName:departmentNameOf(report.departmentId),
 type:reportTypes[index%reportTypes.length],
 priority:priorities[index%priorities.length],
 stage:stageFromSeed(report),
 reviews:[],
}))
export const requestViews:readonly RequestView[]=demoDataset.requests.map((request,index)=>({
 ...request,
 code:`REQ-${pad(numericSuffix(request.id))}`,
 requesterName:nameOf(request.requesterId),
 departmentName:departmentNameOf(request.departmentId),
 priority:priorities[index%priorities.length],
 typeLabel:requestTypeLabels[request.type],
 submittedAt:request.createdAt,
}))
export const fileViews:readonly FileView[]=demoDataset.files.map((file)=>({...file,uploaderName:nameOf(file.uploaderId)}))
export const filesForEntity=(entityType:DemoFile['entityType'],entityId:string):readonly FileView[]=>fileViews.filter((file)=>file.entityType===entityType&&file.entityId===entityId)
export interface TeamWorkloadRow{user:DemoUser;departmentName:string;active:number;completed:number;overdue:number;total:number;load:number}
export const teamWorkload=(departmentId?:string):readonly TeamWorkloadRow[]=>{
 const members=demoDataset.users.filter((user)=>user.role!=='CEO'&&(!departmentId||user.departmentId===departmentId))
 return members.map((user)=>{
  const owned=taskViews.filter((task)=>task.assigneeId===user.id)
  const active=owned.filter((task)=>task.status==='IN_PROGRESS'||task.status==='PENDING').length
  const completed=owned.filter((task)=>task.status==='COMPLETED').length
  const overdue=owned.filter((task)=>task.status==='OVERDUE').length
  return {user,departmentName:departmentNameOf(user.departmentId),active,completed,overdue,total:owned.length,load:Math.min(100,active*20+overdue*25)}
 }).filter((row)=>row.total>0)
}
export const departmentOptions=demoDataset.departments.map((department)=>({value:department.id,label:department.name}))
export const userOptions=demoDataset.users.filter((user)=>user.status==='ACTIVE').map((user)=>({value:user.id,label:user.fullName}))
export const meetingOptions=demoDataset.meetings.slice(0,20).map((meeting)=>({value:meeting.id,label:meeting.title}))
