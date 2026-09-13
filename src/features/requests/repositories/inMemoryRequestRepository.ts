import type { Request } from '../../../domain/entities'
import type { RequestDataRepository } from './contracts'

export class InMemoryRequestRepository implements RequestDataRepository {
  private readonly records = new Map<string, Request>()
  async create(item: Request) { this.records.set(item.id, structuredClone(item)); return item }
  async update(item: Request) { this.records.set(item.id, structuredClone(item)); return item }
  async findById(id: string) { return this.records.get(id) ?? null }
  async findByUser(userId: string) { return [...this.records.values()].filter((item) => item.createdBy === userId) }
  async findByDepartment(departmentId: string) { return [...this.records.values()].filter((item) => item.departmentId === departmentId) }
  async findPending() { return [...this.records.values()].filter((item) => item.status === 'SUBMITTED' || item.status === 'UNDER_REVIEW') }
  async findEscalated() { return [...this.records.values()].filter((item) => item.status === 'ESCALATED') }
}
