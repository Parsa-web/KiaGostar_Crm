import type { Task, TaskReport } from '../../../domain/entities'

export interface TaskDataRepository {
  create(task: Task): Promise<Task>
  update(task: Task): Promise<Task>
  findById(id: string): Promise<Task | null>
  findAll(): Promise<readonly Task[]>
  findByUser(userId: string): Promise<readonly Task[]>
  findByDepartment(departmentId: string): Promise<readonly Task[]>
  findByDecision(decisionId: string): Promise<readonly Task[]>
}
export interface TaskReportDataRepository {
  create(report: TaskReport): Promise<TaskReport>
  findByTask(taskId: string): Promise<readonly TaskReport[]>
}
