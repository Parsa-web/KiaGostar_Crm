export type DemoRole='CEO'|'DEPARTMENT_MANAGER'|'SECRETARY'|'EMPLOYEE'
export interface DemoDepartment{id:string;name:string;code:string;managerId:string;parentId?:string;memberCount:number;status:'ACTIVE'|'INACTIVE'}
export interface DemoPosition{id:string;title:string;departmentId:string;level:number}
export interface DemoUser{id:string;firstName:string;lastName:string;fullName:string;role:DemoRole;departmentId:string;positionId:string;email:string;phone:string;avatar?:string;status:'ACTIVE'|'INACTIVE';managerId?:string;joinedAt:string}
export type DemoMeetingStatus='DRAFT'|'PENDING_APPROVAL'|'APPROVED'|'SCHEDULED'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED'|'REJECTED'
export type DemoMeetingType='INTERNAL'|'DEPARTMENT'|'EXECUTIVE'|'PROJECT'|'WEEKLY'
export type DemoMeetingMode='IN_PERSON'|'ONLINE'|'HYBRID'
export interface DemoAgendaItem{id:string;meetingId:string;order:number;title:string;description?:string;durationMinutes:number;completed:boolean;ownerId?:string}
export type DemoAttendance='INVITED'|'CONFIRMED'|'PRESENT'|'ABSENT'|'EXCUSED'
export interface DemoParticipant{id:string;meetingId:string;userId:string;attendance:DemoAttendance;role:'ORGANIZER'|'PRESENTER'|'ATTENDEE'|'SECRETARY'}
export interface DemoMeeting{id:string;code:string;title:string;type:DemoMeetingType;mode:DemoMeetingMode;status:DemoMeetingStatus;purpose:string;description:string;organizerId:string;departmentId:string;location:string;onlineUrl?:string;startTime:string;endTime:string;createdAt:string;updatedAt:string;requiresApproval:boolean;participantIds:readonly string[]}
export interface DemoMeetingRequest{id:string;title:string;requesterId:string;targetManagerId:string;departmentId:string;requestedDate:string;priority:'LOW'|'NORMAL'|'HIGH'|'CRITICAL';status:'PENDING'|'APPROVED'|'REJECTED';submittedAt:string;description:string}
export interface DemoDecision{id:string;meetingId:string;title:string;ownerId:string;priority:'LOW'|'NORMAL'|'HIGH'|'CRITICAL';dueDate:string;status:'PENDING'|'IN_PROGRESS'|'COMPLETED'|'OVERDUE';taskId?:string}
/* Progress is deliberately absent: a self-declared percentage is not a reliable
   measure, and advancement is evidenced by the reports filed against the task. */
export interface DemoTask{id:string;title:string;description:string;assigneeId:string;creatorId:string;departmentId:string;meetingId?:string;status:'PENDING'|'IN_PROGRESS'|'COMPLETED'|'OVERDUE';priority:'LOW'|'NORMAL'|'HIGH'|'CRITICAL';deadline:string;createdAt:string}
export interface DemoReport{id:string;title:string;authorId:string;departmentId:string;period:string;status:'DRAFT'|'SUBMITTED'|'UNDER_REVIEW'|'APPROVED'|'REJECTED';submittedAt:string;summary:string}
export interface DemoRequest{id:string;title:string;requesterId:string;departmentId:string;type:'LEAVE'|'EQUIPMENT'|'BUDGET'|'ACCESS'|'OTHER';status:'PENDING'|'APPROVED'|'REJECTED';stage:'DEPARTMENT'|'EXECUTIVE'|'COMPLETED';createdAt:string;description:string}
export interface DemoNotification{id:string;userId:string;title:string;body:string;category:'MEETING'|'TASK'|'REPORT'|'REQUEST'|'SYSTEM';priority:'LOW'|'NORMAL'|'HIGH';read:boolean;createdAt:string;link?:string}
export interface DemoFile{id:string;name:string;mimeType:string;sizeBytes:number;uploaderId:string;uploadedAt:string;entityType:'MEETING'|'REPORT'|'TASK'|'REQUEST';entityId:string}
export interface DemoActivity{id:string;actorId:string;action:string;targetType:string;targetId:string;targetLabel:string;createdAt:string;departmentId?:string}
export interface DemoAuditRecord{id:string;actorId:string;event:string;entityType:string;entityId:string;createdAt:string;ip:string;result:'SUCCESS'|'FAILURE'}
export interface DemoMinutes{id:string;meetingId:string;authorId:string;status:'DRAFT'|'PENDING_APPROVAL'|'FINALIZED';updatedAt:string;content:string}
export interface DemoNote{id:string;meetingId:string;authorId:string;createdAt:string;content:string}
export interface DemoDataset{
 departments:readonly DemoDepartment[];positions:readonly DemoPosition[];users:readonly DemoUser[];
 meetings:readonly DemoMeeting[];agenda:readonly DemoAgendaItem[];participants:readonly DemoParticipant[];
 meetingRequests:readonly DemoMeetingRequest[];decisions:readonly DemoDecision[];minutes:readonly DemoMinutes[];notes:readonly DemoNote[];
 tasks:readonly DemoTask[];reports:readonly DemoReport[];requests:readonly DemoRequest[];
 notifications:readonly DemoNotification[];files:readonly DemoFile[];activities:readonly DemoActivity[];audit:readonly DemoAuditRecord[]
}
