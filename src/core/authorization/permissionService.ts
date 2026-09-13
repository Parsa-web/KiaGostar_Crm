import type { AuthorizationSubject } from './types'
export const hasRole=(subject:AuthorizationSubject|null|undefined,role:string)=>Boolean(subject?.roles.includes(role as never))
export const hasPermission=(subject:AuthorizationSubject|null|undefined,permission:string)=>Boolean(subject && (subject.roles.includes('MAIN_MANAGER') || subject.permissions.includes('*') || subject.permissions.includes(permission)))
export const can=hasPermission
