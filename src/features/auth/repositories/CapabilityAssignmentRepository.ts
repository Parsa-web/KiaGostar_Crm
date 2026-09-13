export interface CapabilityAssignmentRepository {
  grant(userId: string, capability: string): Promise<void>
  remove(userId: string, capability: string): Promise<void>
}
