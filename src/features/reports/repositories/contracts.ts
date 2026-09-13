import type { DepartmentReport, EmployeeReport } from '../../../domain/entities'

export interface EmployeeReportDataRepository {
  create(report: EmployeeReport): Promise<EmployeeReport>
  update(report: EmployeeReport): Promise<EmployeeReport>
  findById(id: string): Promise<EmployeeReport | null>
  findByEmployee(employeeId: string): Promise<readonly EmployeeReport[]>
  findByDepartment(departmentId: string): Promise<readonly EmployeeReport[]>
}
export interface DepartmentReportDataRepository {
  create(report: DepartmentReport): Promise<DepartmentReport>
  update(report: DepartmentReport): Promise<DepartmentReport>
  findById(id: string): Promise<DepartmentReport | null>
  findAll(): Promise<readonly DepartmentReport[]>
  findByDepartment(departmentId: string): Promise<readonly DepartmentReport[]>
}
