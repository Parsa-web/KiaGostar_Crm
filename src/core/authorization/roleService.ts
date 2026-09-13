import type { AuthorizationSubject } from './types'
export const roleService={ hasRole:(subject:AuthorizationSubject|null|undefined,role:string)=>Boolean(subject?.roles.includes(role as never)), hasAnyRole:(subject:AuthorizationSubject|null|undefined,roles:readonly string[])=>roles.some((role)=>subject?.roles.includes(role as never)) }
