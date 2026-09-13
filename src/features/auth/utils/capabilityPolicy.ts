import type { RoleCode } from '../../../domain/enums'
import { AppError } from '../../../errors'
import { Capabilities } from '../../../security/permissions'

const employeeForbidden = new Set<string>([Capabilities.ORGANIZATION_MANAGE, Capabilities.ORGANIZATION_VIEW, Capabilities.POSITION_MANAGE, Capabilities.USER_MANAGE, Capabilities.ROLE_MANAGE, Capabilities.CAPABILITY_MANAGE, Capabilities.MEETING_CREATE, Capabilities.TASK_CREATE, Capabilities.TASK_ASSIGN, Capabilities.TASK_REVIEW])

export const assertCapabilityCanBeGranted = (targetRoles: readonly RoleCode[], capability: string): void => {
  if (targetRoles.includes('EMPLOYEE') && employeeForbidden.has(capability)) {
    throw new AppError('PERMISSION_ERROR', 'این مجوز با زنجیره سازمانی نقش کارمند سازگار نیست.')
  }
}
