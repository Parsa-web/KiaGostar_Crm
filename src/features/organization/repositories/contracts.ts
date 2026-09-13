import type { Department, Position, User, UserDepartment } from '../../../domain/entities'

export interface DepartmentDataRepository {
  create(department: Department): Promise<Department>
  update(department: Department): Promise<Department>
  findById(id: string): Promise<Department | null>
  findAll(): Promise<readonly Department[]>
  findByName(name: string): Promise<Department | null>
  disable(id: string): Promise<Department>
}
export interface PositionDataRepository {
  create(position: Position): Promise<Position>
  update(position: Position): Promise<Position>
  findById(id: string): Promise<Position | null>
  findAll(): Promise<readonly Position[]>
  findByName(name: string): Promise<Position | null>
  disable(id: string): Promise<Position>
}
export interface UserDepartmentDataRepository {
  assign(assignment: UserDepartment): Promise<UserDepartment>
  remove(userId: string, departmentId: string): Promise<void>
  findByUser(userId: string): Promise<readonly UserDepartment[]>
  findByDepartment(departmentId: string): Promise<readonly UserDepartment[]>
  setPrimary(userId: string, departmentId: string): Promise<void>
}
export interface OrganizationUserRepository {
  findById(id: string): Promise<User | null>
  findAll(): Promise<readonly User[]>
  findByIds(ids: readonly string[]): Promise<readonly User[]>
}
