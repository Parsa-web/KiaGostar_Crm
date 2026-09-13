import { AppError } from '../../../errors'
import { authorize, isWithinScope, type AuthorizedPrincipal } from '../../../security'
import { Capabilities } from '../../../security/permissions'
import type { DepartmentDataRepository, OrganizationUserRepository, UserDepartmentDataRepository } from '../repositories'

export class UserDepartmentService {
  private readonly assignments: UserDepartmentDataRepository
  private readonly departments: DepartmentDataRepository
  private readonly users: OrganizationUserRepository
  constructor(assignments: UserDepartmentDataRepository, departments: DepartmentDataRepository, users: OrganizationUserRepository) { this.assignments = assignments; this.departments = departments; this.users = users }
  async assignUserToDepartment(actor: AuthorizedPrincipal, userId: string, departmentId: string, isPrimary = false) {
    authorize(actor, Capabilities.USER_MANAGE); this.assertMain(actor)
    const [user, department, current] = await Promise.all([this.users.findById(userId), this.departments.findById(departmentId), this.assignments.findByUser(userId)])
    if (!user) throw new AppError('NOT_FOUND', 'کاربر پیدا نشد.')
    if (!department) throw new AppError('NOT_FOUND', 'واحد سازمانی پیدا نشد.')
    if (department.status === 'INACTIVE') throw new AppError('VALIDATION_ERROR', 'امکان تخصیص کاربر به واحد غیرفعال وجود ندارد.')
    const existing = current.find((item) => item.departmentId === departmentId)
    const assignment = existing ?? await this.assignments.assign({ id: crypto.randomUUID(), userId, departmentId, isPrimary: false })
    if (isPrimary || current.length === 0) await this.assignments.setPrimary(userId, departmentId)
    return { ...assignment, isPrimary: isPrimary || current.length === 0 }
  }
  async removeUserFromDepartment(actor: AuthorizedPrincipal, userId: string, departmentId: string) { authorize(actor, Capabilities.USER_MANAGE); this.assertMain(actor); await this.assignments.remove(userId, departmentId); const left = await this.assignments.findByUser(userId); if (left.length && !left.some((item) => item.isPrimary)) await this.assignments.setPrimary(userId, left[0]!.departmentId) }
  async getUserDepartments(actor: AuthorizedPrincipal, userId: string) { authorize(actor, Capabilities.USER_VIEW); const assignments = await this.assignments.findByUser(userId); if (!actor.roles.includes('MAIN_MANAGER') && !assignments.some((item) => actor.departmentIds.includes(item.departmentId))) throw new AppError('ACCESS_DENIED', 'کاربر خارج از محدوده واحد شماست.'); const all = await Promise.all(assignments.map((item) => this.departments.findById(item.departmentId))); return all.filter((item) => item !== null) }
  async getDepartmentUsers(actor: AuthorizedPrincipal, departmentId: string) { authorize(actor, Capabilities.USER_VIEW); if (!isWithinScope(actor, { departmentId })) throw new AppError('ACCESS_DENIED', 'این واحد خارج از محدوده شماست.'); const assignments = await this.assignments.findByDepartment(departmentId); return this.users.findByIds(assignments.map((item) => item.userId)) }
  private assertMain(actor: AuthorizedPrincipal) { if (!actor.roles.includes('MAIN_MANAGER')) throw new AppError('PERMISSION_ERROR', 'تخصیص سازمانی فقط در اختیار مدیر اصلی است.') }
}
