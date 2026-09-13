import type { Position } from '../../../domain/entities'
import { AppError } from '../../../errors'
import { authorize, type AuthorizedPrincipal } from '../../../security'
import { Capabilities } from '../../../security/permissions'
import type { PositionDataRepository } from '../repositories'
import type { CreatePositionInput } from '../types'

export class PositionService {
  private readonly positions: PositionDataRepository
  constructor(positions: PositionDataRepository) { this.positions = positions }
  async createPosition(actor: AuthorizedPrincipal, input: CreatePositionInput): Promise<Position> { this.assert(actor); this.validate(input.name); if (await this.positions.findByName(input.name)) throw new AppError('VALIDATION_ERROR', 'نام سمت باید یکتا باشد.'); return this.positions.create({ id: crypto.randomUUID(), name: input.name.trim(), description: input.description?.trim(), status: 'ACTIVE' }) }
  async updatePosition(actor: AuthorizedPrincipal, id: string, input: Partial<CreatePositionInput>) { this.assert(actor); const item = await this.require(id); const name = input.name?.trim() ?? item.name; this.validate(name); const duplicate = await this.positions.findByName(name); if (duplicate && duplicate.id !== id) throw new AppError('VALIDATION_ERROR', 'نام سمت باید یکتا باشد.'); return this.positions.update({ ...item, ...input, name }) }
  async getPositions(actor: AuthorizedPrincipal) { authorize(actor, Capabilities.ORGANIZATION_VIEW); return this.positions.findAll() }
  async disablePosition(actor: AuthorizedPrincipal, id: string) { this.assert(actor); return this.positions.disable(id) }
  private assert(actor: AuthorizedPrincipal) { authorize(actor, Capabilities.POSITION_MANAGE); if (!actor.roles.includes('MAIN_MANAGER')) throw new AppError('PERMISSION_ERROR', 'مدیریت سمت‌ها فقط در اختیار مدیر اصلی است.') }
  private validate(name: string) { if (!name.trim()) throw new AppError('VALIDATION_ERROR', 'نام سمت الزامی است.') }
  private async require(id: string) { const item = await this.positions.findById(id); if (!item) throw new AppError('NOT_FOUND', 'سمت سازمانی پیدا نشد.'); return item }
}
