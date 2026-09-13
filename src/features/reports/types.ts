import type { DepartmentReport, EmployeeReport } from '../../domain/entities'

export type CreateEmployeeReportInput = Pick<EmployeeReport, 'departmentId' | 'taskId' | 'title' | 'description' | 'attachments'>
export type CreateDepartmentReportInput = Pick<DepartmentReport, 'departmentId' | 'period' | 'summary' | 'taskSummary' | 'issues' | 'attachments'>
export interface AccessibleReports { employeeReports: readonly EmployeeReport[]; departmentReports: readonly DepartmentReport[] }
