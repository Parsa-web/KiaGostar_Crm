import type {ActiveFilter,StatusTone} from '../../../components/ui'
import {attendanceLabels,meetingModeLabels,meetingStatusLabels,meetingTypeLabels,type MeetingParticipantView,type MeetingView} from '../../../demo'
/** Status → design-token tone mapping shared by every meeting surface. */
export const meetingStatusTone=(status:MeetingView['status']):StatusTone=>
 status==='COMPLETED'||status==='APPROVED'?'success'
 :status==='CANCELLED'||status==='REJECTED'?'danger'
 :status==='PENDING_APPROVAL'?'warning'
 :status==='IN_PROGRESS'?'info'
 :status==='DRAFT'?'neutral':'info'
export const attendanceTone=(attendance:MeetingParticipantView['attendance']):StatusTone=>
 attendance==='PRESENT'?'success':attendance==='ABSENT'?'danger':attendance==='EXCUSED'?'warning':attendance==='CONFIRMED'?'info':'neutral'
export const attendanceLabelOf=(attendance:MeetingParticipantView['attendance'])=>attendanceLabels[attendance]
export const meetingStatusOptions=Object.entries(meetingStatusLabels).map(([value,label])=>({value,label}))
export const meetingTypeOptions=Object.entries(meetingTypeLabels).map(([value,label])=>({value,label}))
export const meetingModeOptions=Object.entries(meetingModeLabels).map(([value,label])=>({value,label}))
/** Builds the visible chips for the FilterBar from the current filter state. */
export const buildMeetingFilters=(entries:readonly {key:string;label:string;value:string;display?:string;onRemove():void}[]):readonly ActiveFilter[]=>
 entries.filter((entry)=>Boolean(entry.value)).map((entry)=>({key:entry.key,label:entry.label,value:entry.display??entry.value,onRemove:entry.onRemove}))
export interface MeetingStats{total:number;scheduled:number;pending:number;completed:number;cancelled:number}
export const summarizeMeetings=(meetings:readonly MeetingView[]):MeetingStats=>({
 total:meetings.length,
 scheduled:meetings.filter((meeting)=>meeting.status==='SCHEDULED'||meeting.status==='APPROVED').length,
 pending:meetings.filter((meeting)=>meeting.status==='PENDING_APPROVAL').length,
 completed:meetings.filter((meeting)=>meeting.status==='COMPLETED').length,
 cancelled:meetings.filter((meeting)=>meeting.status==='CANCELLED'||meeting.status==='REJECTED').length,
})
