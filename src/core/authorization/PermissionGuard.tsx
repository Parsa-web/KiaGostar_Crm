import type { ReactNode } from 'react'; import { checkAccess } from './accessGuard'; import type { AccessRequirement, AuthorizationSubject } from './types'
export function PermissionGuard({subject,children,fallback=null,...requirement}:AccessRequirement & {subject:AuthorizationSubject|null;children:ReactNode;fallback?:ReactNode}) { return checkAccess(subject,requirement)?children:fallback }
