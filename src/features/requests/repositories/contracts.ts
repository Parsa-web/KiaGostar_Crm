import type { Request } from '../../../domain/entities'

export interface RequestDataRepository {
  create(request: Request): Promise<Request>
  update(request: Request): Promise<Request>
  findById(id: string): Promise<Request | null>
  findByUser(userId: string): Promise<readonly Request[]>
  findByDepartment(departmentId: string): Promise<readonly Request[]>
  findPending(): Promise<readonly Request[]>
  findEscalated(): Promise<readonly Request[]>
}
