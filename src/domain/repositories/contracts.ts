import type { BaseRepository } from '../../repositories'
import type { AuditLog, Decision, Department, DepartmentReport, EmployeeReport, FileAttachment, Meeting, Notification, Request, Task, TaskReport, User } from '../entities'

export interface UserRepository extends BaseRepository<User> { findByUsername(username: string): Promise<User | null> }
export interface DepartmentRepository extends BaseRepository<Department> { findByUserId(userId: string): Promise<readonly Department[]> }
export type MeetingRepository = BaseRepository<Meeting>
export interface DecisionRepository extends BaseRepository<Decision> { findByMeetingId(meetingId: string): Promise<readonly Decision[]> }
export interface TaskRepository extends BaseRepository<Task> { findByAssignee(userId: string): Promise<readonly Task[]> }
export interface RequestRepository extends BaseRepository<Request> { findByCreator(userId: string): Promise<readonly Request[]> }
export interface ReportRepository {
  findTaskReports(taskId: string): Promise<readonly TaskReport[]>
  findEmployeeReports(departmentId: string): Promise<readonly EmployeeReport[]>
  findDepartmentReports(departmentId: string): Promise<readonly DepartmentReport[]>
}
export interface FileRepository extends BaseRepository<FileAttachment> { findByEntity(entityType: string, entityId: string): Promise<readonly FileAttachment[]> }
export interface NotificationRepository extends BaseRepository<Notification> { findByUserId(userId: string): Promise<readonly Notification[]> }
export interface AuditRepository extends BaseRepository<AuditLog> { findByEntity(entityType: string, entityId: string): Promise<readonly AuditLog[]> }
