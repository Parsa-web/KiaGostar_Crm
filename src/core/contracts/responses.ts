import type { MeetingEntity,ReportEntity,TaskEntity,UserEntity } from '../domain'
export type UserResponse=UserEntity; export type MeetingResponse=MeetingEntity; export type TaskResponse=TaskEntity; export type ReportResponse=ReportEntity
export interface PagedResponse<T>{items:readonly T[];page:number;pageSize:number;total:number}
