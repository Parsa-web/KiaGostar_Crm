import type { AuthSession } from '../types'

export interface SessionRepository {
  get(): Promise<AuthSession | null>
  save(session: AuthSession): Promise<void>
  clear(): Promise<void>
}

export class InMemorySessionRepository implements SessionRepository {
  private session: AuthSession | null = null
  async get() { return this.session }
  async save(session: AuthSession) { this.session = structuredClone(session) }
  async clear() { this.session = null }
}
