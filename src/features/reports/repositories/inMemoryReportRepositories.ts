import type { DepartmentReport, EmployeeReport } from '../../../domain/entities'
import type { DepartmentReportDataRepository, EmployeeReportDataRepository } from './contracts'

export class InMemoryEmployeeReportRepository implements EmployeeReportDataRepository {
  private readonly records = new Map<string, EmployeeReport>()
  async create(item: EmployeeReport) { this.records.set(item.id, structuredClone(item)); return item }
  async update(item: EmployeeReport) { this.records.set(item.id, structuredClone(item)); return item }
  async findById(id: string) { return this.records.get(id) ?? null }
  async findByEmployee(employeeId: string) { return [...this.records.values()].filter((item) => item.employeeId === employeeId) }
  async findByDepartment(departmentId: string) { return [...this.records.values()].filter((item) => item.departmentId === departmentId) }
}
export class InMemoryDepartmentReportRepository implements DepartmentReportDataRepository {
  private readonly records = new Map<string, DepartmentReport>()
  async create(item: DepartmentReport) { this.records.set(item.id, structuredClone(item)); return item }
  async update(item: DepartmentReport) { this.records.set(item.id, structuredClone(item)); return item }
  async findById(id: string) { return this.records.get(id) ?? null }
  async findAll() { return [...this.records.values()] }
  async findByDepartment(departmentId: string) { return [...this.records.values()].filter((item) => item.departmentId === departmentId) }
}
