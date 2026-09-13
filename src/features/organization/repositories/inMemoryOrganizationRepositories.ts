import type { Department, Position, User, UserDepartment } from '../../../domain/entities'
import { AppError } from '../../../errors'
import type { DepartmentDataRepository, OrganizationUserRepository, PositionDataRepository, UserDepartmentDataRepository } from './contracts'

export class InMemoryDepartmentRepository implements DepartmentDataRepository {
  private readonly records = new Map<string, Department>()
  constructor(seed: readonly Department[] = []) { seed.forEach((item) => this.records.set(item.id, structuredClone(item))) }
  async create(item: Department) { this.records.set(item.id, structuredClone(item)); return item }
  async update(item: Department) { this.records.set(item.id, structuredClone(item)); return item }
  async findById(id: string) { return this.records.get(id) ?? null }
  async findAll() { return [...this.records.values()] }
  async findByName(name: string) { return [...this.records.values()].find((item) => item.name.trim().toLocaleLowerCase('fa') === name.trim().toLocaleLowerCase('fa')) ?? null }
  async disable(id: string) { const item = await this.findById(id); if (!item) throw new AppError('NOT_FOUND', 'واحد سازمانی پیدا نشد.'); return this.update({ ...item, status: 'INACTIVE' }) }
}

export class InMemoryPositionRepository implements PositionDataRepository {
  private readonly records = new Map<string, Position>()
  constructor(seed: readonly Position[] = []) { seed.forEach((item) => this.records.set(item.id, structuredClone(item))) }
  async create(item: Position) { this.records.set(item.id, structuredClone(item)); return item }
  async update(item: Position) { this.records.set(item.id, structuredClone(item)); return item }
  async findById(id: string) { return this.records.get(id) ?? null }
  async findAll() { return [...this.records.values()] }
  async findByName(name: string) { return [...this.records.values()].find((item) => item.name.trim().toLocaleLowerCase('fa') === name.trim().toLocaleLowerCase('fa')) ?? null }
  async disable(id: string) { const item = await this.findById(id); if (!item) throw new AppError('NOT_FOUND', 'سمت سازمانی پیدا نشد.'); return this.update({ ...item, status: 'INACTIVE' }) }
}

export class InMemoryUserDepartmentRepository implements UserDepartmentDataRepository {
  private readonly records = new Map<string, UserDepartment>()
  constructor(seed: readonly UserDepartment[] = []) { seed.forEach((item) => this.records.set(item.id, structuredClone(item))) }
  async assign(item: UserDepartment) { this.records.set(item.id, structuredClone(item)); return item }
  async remove(userId: string, departmentId: string) { for (const [id, item] of this.records) if (item.userId === userId && item.departmentId === departmentId) this.records.delete(id) }
  async findByUser(userId: string) { return [...this.records.values()].filter((item) => item.userId === userId) }
  async findByDepartment(departmentId: string) { return [...this.records.values()].filter((item) => item.departmentId === departmentId) }
  async setPrimary(userId: string, departmentId: string) {
    const records = await this.findByUser(userId)
    if (!records.some((item) => item.departmentId === departmentId)) throw new AppError('NOT_FOUND', 'عضویت کاربر در واحد پیدا نشد.')
    records.forEach((item) => this.records.set(item.id, { ...item, isPrimary: item.departmentId === departmentId }))
  }
}

export class InMemoryOrganizationUserRepository implements OrganizationUserRepository {
  private readonly records = new Map<string, User>()
  constructor(seed: readonly User[] = []) { seed.forEach((item) => this.records.set(item.id, structuredClone(item))) }
  async findById(id: string) { return this.records.get(id) ?? null }
  async findAll() { return [...this.records.values()] }
  async findByIds(ids: readonly string[]) { const set = new Set(ids); return [...this.records.values()].filter((item) => set.has(item.id)) }
}
