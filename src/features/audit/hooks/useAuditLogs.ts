import { useCallback } from 'react'
import type { AuthorizedPrincipal } from '../../../security'
import { useAsyncResource } from '../../../hooks'
import type { AuditService } from '../services'
import type { AuditFilters } from '../types'

export const useAuditLogs = (service: AuditService, actor: AuthorizedPrincipal, filters: AuditFilters = {}) => useAsyncResource(useCallback(() => service.getSystemActivity(actor, filters), [service, actor, filters]))
export const useEntityHistory = (service: AuditService, actor: AuthorizedPrincipal, entityType: string, entityId: string) => useAsyncResource(useCallback(() => service.getEntityHistory(actor, entityType, entityId), [service, actor, entityType, entityId]))
export const useUserActivity = (service: AuditService, actor: AuthorizedPrincipal, userId: string) => useAsyncResource(useCallback(() => service.getUserActivity(actor, userId), [service, actor, userId]))
