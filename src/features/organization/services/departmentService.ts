import type { Department } from '../../../domain/entities'
import { AppError } from '../../../errors'
import { authorize, isWithinScope, type AuthorizedPrincipal } from '../../../security'
import { Capabilities } from '../../../security/permissions'
import type { DepartmentDataRepository } from '../repositories'
import type { CreateDepartmentInput, UpdateDepartmentInput } from '../types'

const requiredName = (name: string) => { if (!name.trim()) throw new AppError('VALIDATION_ERROR', 'نام واحد سازمانی الزامی است.') }
const assertMainManager = (actor: AuthorizedPrincipal) => { if (!actor.roles.includes('MAIN_MANAGER')) throw new AppError('PERMISSION_ERROR', 'مدیریت ساختار فقط در اختیار مدیر اصلی است.') }

export class DepartmentService {
  private readonly departments: DepartmentDataRepository
  constructor(departments: DepartmentDataRepository) { this.departments = departments }
  async createDepartment(actor: AuthorizedPrincipal, input: CreateDepartmentInput): Promise<Department> {
    authorize(actor, Capabilities.ORGANIZATION_MANAGE); assertMainManager(actor); requiredName(input.name)
    if (await this.departments.findByName(input.name)) throw new AppError('VALIDATION_ERROR', 'نام واحد سازمانی باید یکتا باشد.')
    return this.departments.create({ id: crypto.randomUUID(), name: input.name.trim(), description: input.description?.trim(), status: 'ACTIVE' })
  }
  async updateDepartment(actor: AuthorizedPrincipal, id: string, input: UpdateDepartmentInput) {
    authorize(actor, Capabilities.ORGANIZATION_MANAGE); assertMainManager(actor)
    const current = await this.require(id); const name = input.name?.trim() ?? current.name; requiredName(name)
    const duplicate = await this.departments.findByName(name)
    if (duplicate && duplicate.id !== id) throw new AppError('VALIDATION_ERROR', 'نام واحد سازمانی باید یکتا باشد.')
    return this.departments.update({ ...current, ...input, name })
  }
  async getDepartment(actor: AuthorizedPrincipal, id: string) {
    authorize(actor, Capabilities.ORGANIZATION_VIEW)
    const department = await this.require(id)
    if (!isWithinScope(actor, { departmentId: id })) throw new AppError('ACCESS_DENIED', 'این واحد خارج از محدوده شماست.')
    return department
  }
  async getDepartments(actor: AuthorizedPrincipal) {
    authorize(actor, Capabilities.ORGANIZATION_VIEW)
    const all = await this.departments.findAll()
    return actor.roles.includes('MAIN_MANAGER') ? all : all.filter((item) => actor.departmentIds.includes(item.id))
  }
  async disableDepartment(actor: AuthorizedPrincipal, id: string) { authorize(actor, Capabilities.ORGANIZATION_MANAGE); assertMainManager(actor); return this.departments.disable(id) }
  private async require(id: string) { const item = await this.departments.findById(id); if (!item) throw new AppError('NOT_FOUND', 'واحد سازمانی پیدا نشد.'); return item }
}
