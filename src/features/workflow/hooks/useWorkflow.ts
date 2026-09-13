import { useCallback } from 'react'
import { useAsyncResource } from '../../../hooks'
import type { AuthorizedPrincipal } from '../../../security'
import type { WorkflowService } from '../services'
export const useWorkflow = (service: WorkflowService, actor: AuthorizedPrincipal, id: string) => useAsyncResource(useCallback(() => service.getWorkflowStatus(actor, id), [service, actor, id]))
