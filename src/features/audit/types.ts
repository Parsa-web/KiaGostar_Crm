export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'ASSIGN' | 'LOGIN' | 'LOGOUT' | 'UPLOAD' | 'DOWNLOAD'
export interface AuditMetadata { departmentId?: string; ownerId?: string; [key: string]: unknown }
export interface AuditLog { id: string; action: AuditAction; event: string; entityType: string; entityId: string; performedBy: string; description: string; oldValue?: unknown; newValue?: unknown; metadata?: AuditMetadata; createdAt: string }
export type CreateAuditLogInput = Omit<AuditLog, 'id' | 'createdAt'>
export interface AuditFilters { entityType?: string; action?: AuditAction; from?: string; to?: string }
