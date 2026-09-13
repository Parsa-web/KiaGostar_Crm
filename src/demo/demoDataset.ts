import type {DemoDataset,DemoDepartment,DemoUser} from './demoTypes'
import {demoDepartments,demoPositions,demoUsers} from './demoOrganization'
import {demoAgendaItems,demoDecisions,demoMeetingRequests,demoMeetings,demoMinutes,demoNotes,demoParticipants} from './demoMeetings'
import {demoActivities,demoAuditRecords,demoFiles,demoNotifications,demoReports,demoRequests,demoTasks} from './demoWorkItems'
export const demoDataset:DemoDataset={
 departments:demoDepartments,positions:demoPositions,users:demoUsers,
 meetings:demoMeetings,agenda:demoAgendaItems,participants:demoParticipants,
 meetingRequests:demoMeetingRequests,decisions:demoDecisions,minutes:demoMinutes,notes:demoNotes,
 tasks:demoTasks,reports:demoReports,requests:demoRequests,
 notifications:demoNotifications,files:demoFiles,activities:demoActivities,audit:demoAuditRecords,
}
const userIndex=new Map(demoUsers.map((user)=>[user.id,user]))
const departmentIndex=new Map(demoDepartments.map((department)=>[department.id,department]))
export const findDemoUser=(id:string):DemoUser|undefined=>userIndex.get(id)
export const findDemoDepartment=(id:string):DemoDepartment|undefined=>departmentIndex.get(id)
