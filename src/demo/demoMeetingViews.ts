import type {DemoAgendaItem,DemoAttendance,DemoDecision,DemoMeeting,DemoMeetingRequest,DemoMinutes,DemoNote,DemoParticipant} from './demoTypes'
import {demoDataset,findDemoDepartment,findDemoUser} from './demoDataset'
import {taskViews,type TaskView} from './demoViews'
/** Meeting presentation view-models derived from demo seed data; replaceable by API payloads. */
export interface MeetingView extends DemoMeeting{organizerName:string;departmentName:string;typeLabel:string;modeLabel:string;participantCount:number;durationMinutes:number}
export interface MeetingParticipantView extends DemoParticipant{fullName:string;departmentName:string;positionTitle:string;avatar?:string;roleLabel:string;attendanceLabel:string}
export interface MeetingRequestView extends DemoMeetingRequest{code:string;requesterName:string;targetManagerName:string;departmentName:string;priorityLabel:string}
export interface MeetingDecisionView extends DemoDecision{ownerName:string;meetingTitle:string;priorityLabel:string}
export const meetingTypeLabels:Readonly<Record<DemoMeeting['type'],string>>={INTERNAL:'داخلی',DEPARTMENT:'واحد سازمانی',EXECUTIVE:'هیئت‌مدیره',PROJECT:'پروژه‌ای',WEEKLY:'هفتگی'}
export const meetingModeLabels:Readonly<Record<DemoMeeting['mode'],string>>={IN_PERSON:'حضوری',ONLINE:'آنلاین',HYBRID:'ترکیبی'}
export const meetingStatusLabels:Readonly<Record<DemoMeeting['status'],string>>={DRAFT:'پیش‌نویس',PENDING_APPROVAL:'در انتظار تأیید',APPROVED:'تأییدشده',SCHEDULED:'زمان‌بندی‌شده',IN_PROGRESS:'در حال برگزاری',COMPLETED:'برگزارشده',CANCELLED:'لغوشده',REJECTED:'ردشده'}
export const attendanceLabels:Readonly<Record<DemoAttendance,string>>={INVITED:'دعوت‌شده',CONFIRMED:'تأیید حضور',PRESENT:'حاضر',ABSENT:'غایب',EXCUSED:'غیبت موجه'}
export const participantRoleLabels:Readonly<Record<DemoParticipant['role'],string>>={ORGANIZER:'برگزارکننده',PRESENTER:'ارائه‌دهنده',ATTENDEE:'شرکت‌کننده',SECRETARY:'دبیر'}
export const priorityLabels:Readonly<Record<'LOW'|'NORMAL'|'HIGH'|'CRITICAL',string>>={LOW:'کم',NORMAL:'عادی',HIGH:'زیاد',CRITICAL:'بحرانی'}
export const decisionStatusLabels:Readonly<Record<DemoDecision['status'],string>>={PENDING:'در انتظار',IN_PROGRESS:'در حال انجام',COMPLETED:'انجام‌شده',OVERDUE:'دارای تأخیر'}
const nameOf=(id:string)=>findDemoUser(id)?.fullName??'کاربر نامشخص'
const departmentNameOf=(id:string)=>findDemoDepartment(id)?.name??'واحد نامشخص'
const positionOf=(id:string)=>demoDataset.positions.find((position)=>position.id===id)?.title??'همکار'
const minutesBetween=(start:string,end:string)=>Math.max(0,Math.round((new Date(end).getTime()-new Date(start).getTime())/60000))
export const meetingViews:readonly MeetingView[]=demoDataset.meetings.map((meeting)=>({
 ...meeting,
 organizerName:nameOf(meeting.organizerId),
 departmentName:departmentNameOf(meeting.departmentId),
 typeLabel:meetingTypeLabels[meeting.type],
 modeLabel:meetingModeLabels[meeting.mode],
 participantCount:meeting.participantIds.length,
 durationMinutes:minutesBetween(meeting.startTime,meeting.endTime),
}))
export const meetingRequestViews:readonly MeetingRequestView[]=demoDataset.meetingRequests.map((request,index)=>({
 ...request,
 code:`MRQ-${String(index+1).padStart(4,'0')}`,
 requesterName:nameOf(request.requesterId),
 targetManagerName:nameOf(request.targetManagerId),
 departmentName:departmentNameOf(request.departmentId),
 priorityLabel:priorityLabels[request.priority],
}))
export const findMeeting=(meetingId:string):MeetingView|undefined=>meetingViews.find((meeting)=>meeting.id===meetingId)
export const meetingAgenda=(meetingId:string):readonly DemoAgendaItem[]=>demoDataset.agenda.filter((item)=>item.meetingId===meetingId).slice().sort((first,second)=>first.order-second.order)
export const meetingParticipants=(meetingId:string):readonly MeetingParticipantView[]=>demoDataset.participants.filter((participant)=>participant.meetingId===meetingId).map((participant)=>{
 const user=findDemoUser(participant.userId)
 return {
  ...participant,
  fullName:user?.fullName??'کاربر نامشخص',
  departmentName:departmentNameOf(user?.departmentId??''),
  positionTitle:positionOf(user?.positionId??''),
  avatar:user?.avatar,
  roleLabel:participantRoleLabels[participant.role],
  attendanceLabel:attendanceLabels[participant.attendance],
 }
})
export const meetingDecisions=(meetingId:string):readonly MeetingDecisionView[]=>demoDataset.decisions.filter((decision)=>decision.meetingId===meetingId).map((decision)=>({
 ...decision,
 ownerName:nameOf(decision.ownerId),
 meetingTitle:findMeeting(decision.meetingId)?.title??'',
 priorityLabel:priorityLabels[decision.priority],
}))
export const meetingTasks=(meetingId:string):readonly TaskView[]=>taskViews.filter((task)=>task.meetingId===meetingId)
export const meetingNotes=(meetingId:string):readonly (DemoNote&{authorName:string})[]=>demoDataset.notes.filter((note)=>note.meetingId===meetingId).map((note)=>({...note,authorName:nameOf(note.authorId)}))
export const meetingMinutes=(meetingId:string):(DemoMinutes&{authorName:string})|undefined=>{
 const record=demoDataset.minutes.find((minutes)=>minutes.meetingId===meetingId)
 return record?{...record,authorName:nameOf(record.authorId)}:undefined
}
export interface AttendanceSummary{invited:number;confirmed:number;present:number;absent:number;excused:number;total:number;presentRate:number}
export const attendanceSummary=(meetingId:string):AttendanceSummary=>{
 const participants=demoDataset.participants.filter((participant)=>participant.meetingId===meetingId)
 const count=(status:DemoAttendance)=>participants.filter((participant)=>participant.attendance===status).length
 const present=count('PRESENT')
 return {
  invited:count('INVITED'),confirmed:count('CONFIRMED'),present,absent:count('ABSENT'),excused:count('EXCUSED'),
  total:participants.length,presentRate:participants.length?Math.round((present/participants.length)*100):0,
 }
}
export const meetingsForUser=(userId:string):readonly MeetingView[]=>meetingViews.filter((meeting)=>meeting.organizerId===userId||meeting.participantIds.includes(userId))
export const meetingsForDepartment=(departmentId:string):readonly MeetingView[]=>meetingViews.filter((meeting)=>meeting.departmentId===departmentId)
export const meetingsOnDate=(isoDate:string,meetings:readonly MeetingView[]=meetingViews):readonly MeetingView[]=>{
 const day=isoDate.slice(0,10)
 return meetings.filter((meeting)=>meeting.startTime.slice(0,10)===day)
}
export const upcomingMeetings=(from:Date,meetings:readonly MeetingView[]=meetingViews,limit=5):readonly MeetingView[]=>meetings
 .filter((meeting)=>new Date(meeting.startTime).getTime()>=from.getTime()&&meeting.status!=='CANCELLED')
 .slice()
 .sort((first,second)=>new Date(first.startTime).getTime()-new Date(second.startTime).getTime())
 .slice(0,limit)
