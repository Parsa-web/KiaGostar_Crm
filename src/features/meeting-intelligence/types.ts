import type { AuthorizedPrincipal } from '../../security'
export interface MeetingStatistics { totalMeetings:number;completedMeetings:number;pendingMinutes:number;openDecisions:number;completedDecisions:number }
export interface MeetingRecord { id:string;title:string;description?:string;createdBy:string;departmentId?:string;participantIds:string[];date:string;status:'UPCOMING'|'COMPLETED'|'CANCELLED'|'PENDING_DOCUMENTATION';minutesText?:string }
export interface DecisionRecord { id:string;meetingId:string;title:string;status:string;taskIds:string[] }
export interface RelatedTask { id:string;decisionId?:string;title:string;status:string }
export interface DecisionInsight { decisionId:string;meetingId:string;status:string;relatedTasks:number;completionRate:number }
export interface MeetingTimelineEvent { id:string;meetingId:string;type:string;label:string;createdAt:string;actorId?:string }
export interface MeetingIntelligenceRepository { meetings():Promise<readonly MeetingRecord[]>;decisions():Promise<readonly DecisionRecord[]>;tasks():Promise<readonly RelatedTask[]>;timeline(meetingId:string):Promise<readonly MeetingTimelineEvent[]> }
export const canAccessMeeting=(actor:AuthorizedPrincipal,meeting:MeetingRecord)=>actor.roles.includes('MAIN_MANAGER')||meeting.createdBy===actor.userId||meeting.participantIds.includes(actor.userId)||Boolean(meeting.departmentId&&actor.roles.includes('DEPARTMENT_MANAGER')&&actor.departmentIds.includes(meeting.departmentId))
