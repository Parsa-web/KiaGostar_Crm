import type { CapabilityCode } from '../security/permissions'
import type { RoleCode } from '../domain/enums'

export interface RouteConfig {
  path: string
  access: 'public' | 'authenticated' | 'capability' | 'scope'
  capability?: CapabilityCode
  role?: RoleCode
}
