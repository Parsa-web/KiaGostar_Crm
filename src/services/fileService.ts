import type { FileAttachment } from '../domain/entities'
import { AppError } from '../errors'
import { isWithinScope, type AuthorizedPrincipal, type ResourceScope } from '../security'

export interface FileDataRepository {
  create(file: FileAttachment): Promise<FileAttachment>
  findByEntity(entityType: string, entityId: string): Promise<readonly FileAttachment[]>
}
export class InMemoryFileRepository implements FileDataRepository {
  private readonly files: FileAttachment[] = []
  async create(file: FileAttachment) { this.files.push(structuredClone(file)); return file }
  async findByEntity(entityType: string, entityId: string) { return this.files.filter((item) => item.entityType === entityType && item.entityId === entityId) }
}
export class FileService {
  private readonly files: FileDataRepository
  constructor(files: FileDataRepository) { this.files = files }
  async attach(actor: AuthorizedPrincipal, input: Omit<FileAttachment, 'id' | 'uploadedBy' | 'createdAt'>, resource: ResourceScope) {
    if (!isWithinScope(actor, resource)) throw new AppError('ACCESS_DENIED', 'اجازه پیوست فایل به این رکورد را ندارید.')
    if (!input.name.trim() || input.size < 0) throw new AppError('VALIDATION_ERROR', 'اطلاعات فایل معتبر نیست.')
    return this.files.create({ ...input, id: crypto.randomUUID(), uploadedBy: actor.userId, createdAt: new Date().toISOString() })
  }
  async list(actor: AuthorizedPrincipal, entityType: string, entityId: string, resource: ResourceScope) { if (!isWithinScope(actor, resource)) throw new AppError('ACCESS_DENIED', 'اجازه مشاهده فایل‌های این رکورد را ندارید.'); return this.files.findByEntity(entityType, entityId) }
}
