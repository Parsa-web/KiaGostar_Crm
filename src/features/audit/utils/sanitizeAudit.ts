import { redactSensitive } from '../../../core/security'
import type { CreateAuditLogInput } from '../types'
export const sanitizeAuditInput = (input: CreateAuditLogInput): CreateAuditLogInput => ({ ...input, oldValue: redactSensitive(input.oldValue), newValue: redactSensitive(input.newValue), metadata: redactSensitive(input.metadata) as CreateAuditLogInput['metadata'] })
