import type { CapabilityCode } from './permissions'

export interface CapabilityPrincipal { capabilities: readonly string[] }

export const can = (principal: CapabilityPrincipal | null | undefined, capability: CapabilityCode | string): boolean =>
  principal?.capabilities.includes(capability) ?? false
