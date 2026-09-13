import type { Department, Position, User, UserDepartment } from '../../domain/entities'

export type CreateDepartmentInput = Pick<Department, 'name' | 'description'>
export type UpdateDepartmentInput = Partial<CreateDepartmentInput>
export type CreatePositionInput = Pick<Position, 'name' | 'description'>
export interface DepartmentDetails { department: Department; members: readonly User[]; assignments: readonly UserDepartment[] }
