import type { RoleCode } from '../../domain/enums'
export interface AuthorizationSubject { userId:string; roles:RoleCode[]; permissions:string[] }
export interface AccessRequirement { roles?:readonly RoleCode[]; permissions?:readonly string[] }
