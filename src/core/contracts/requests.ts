export interface CreateMeetingRequest { title:string;description?:string;participantIds:string[];date:string }
export interface CreateTaskRequest { title:string;description:string;assignedTo:string;decisionId?:string;deadline?:string }
export interface SubmitReportRequest { departmentId:string;content:string;files:string[] }
export interface CreateKnowledgeRequest { title:string;content:string;category:string;departmentId?:string }
