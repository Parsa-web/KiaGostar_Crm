import type { Task, TaskReport } from '../../../domain/entities'
import type { TaskDataRepository, TaskReportDataRepository } from './contracts'

export class InMemoryTaskRepository implements TaskDataRepository {
  private readonly records = new Map<string, Task>()
  async create(item: Task) { this.records.set(item.id, structuredClone(item)); return item }
  async update(item: Task) { this.records.set(item.id, structuredClone(item)); return item }
  async findById(id: string) { return this.records.get(id) ?? null }
  async findAll() { return [...this.records.values()] }
  async findByUser(userId: string) { return [...this.records.values()].filter((item) => item.assignedTo === userId) }
  async findByDepartment(departmentId: string) { return [...this.records.values()].filter((item) => item.departmentId === departmentId) }
  async findByDecision(decisionId: string) { return [...this.records.values()].filter((item) => item.decisionId === decisionId) }
}
export class InMemoryTaskReportRepository implements TaskReportDataRepository {
  private readonly records: TaskReport[] = []
  async create(item: TaskReport) { this.records.push(structuredClone(item)); return item }
  async findByTask(taskId: string) { return this.records.filter((item) => item.taskId === taskId) }
}
