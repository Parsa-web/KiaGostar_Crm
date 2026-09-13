import type { Request } from '../../domain/entities'

export type CreateRequestInput = Pick<Request, 'departmentId' | 'type' | 'title' | 'description' | 'priority' | 'attachments'>
