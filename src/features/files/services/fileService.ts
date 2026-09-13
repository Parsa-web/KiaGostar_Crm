import { AuthorizationError, NotFoundError, ValidationError } from '../../../core/errors'
import { sanitizeFileName } from '../../../core/security'
import { isWithinScope, type AuthorizedPrincipal, type ResourceScope } from '../../../security'
import type { FileRepository } from '../repositories'
import type { FileAttachment, UploadFileInput } from '../types'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
export type FileScopeResolver = (file: FileAttachment) => Promise<ResourceScope>

export class FileManagementService {
  private readonly repository: FileRepository
  private readonly resolveScope: FileScopeResolver
  constructor(repository: FileRepository, resolveScope: FileScopeResolver = async (file) => ({ ownerId: file.uploadedBy })) { this.repository = repository; this.resolveScope = resolveScope }
  validateFile(input: Pick<UploadFileInput, 'originalName' | 'mimeType' | 'size'>) { if (!input.originalName.trim() || input.size <= 0 || input.size > MAX_FILE_SIZE) throw new ValidationError('INVALID_FILE_SIZE', 'حجم فایل معتبر نیست.'); if (!ALLOWED_TYPES.includes(input.mimeType.toLowerCase())) throw new ValidationError('INVALID_FILE_TYPE', 'نوع فایل مجاز نیست.') }
  checkAccess(actor: AuthorizedPrincipal, resource: ResourceScope) { if (!isWithinScope(actor, resource)) throw new AuthorizationError('FILE_ACCESS_DENIED') }
  async uploadFile(actor: AuthorizedPrincipal, input: UploadFileInput) { this.checkAccess(actor, input.resource); this.validateFile(input); const originalName = sanitizeFileName(input.originalName); const id = crypto.randomUUID(); const item: FileAttachment = { id, entityType: sanitizeFileName(input.entityType).toUpperCase(), entityId: input.entityId, uploadedBy: actor.userId, originalName, fileName: `${id}-${originalName}`, mimeType: input.mimeType.toLowerCase(), size: input.size, storagePath: input.storagePath ?? `attachments/${input.entityType.toLowerCase()}/${input.entityId}/${id}`, createdAt: new Date().toISOString() }; return this.repository.create(item) }
  async getFile(actor: AuthorizedPrincipal, id: string) { const item = await this.require(id); this.checkAccess(actor, await this.resolveScope(item)); return item }
  async getEntityFiles(actor: AuthorizedPrincipal, entityType: string, entityId: string, resource: ResourceScope) { this.checkAccess(actor, resource); return this.repository.findByEntity(entityType.toUpperCase(), entityId) }
  async deleteFile(actor: AuthorizedPrincipal, id: string) { const item = await this.require(id); this.checkAccess(actor, await this.resolveScope(item)); if (item.uploadedBy !== actor.userId && !actor.roles.includes('MAIN_MANAGER') && !actor.roles.includes('DEPARTMENT_MANAGER')) throw new AuthorizationError('FILE_DELETE_DENIED'); await this.repository.delete(id) }
  private async require(id: string) { const item = await this.repository.findById(id); if (!item) throw new NotFoundError('FILE_NOT_FOUND', 'فایل پیدا نشد.'); return item }
}
