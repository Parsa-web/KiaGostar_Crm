import type { AuthSession } from '../types'
import type { SessionRepository } from './SessionRepository'

const STORAGE_KEY = 'kiagostar.session'
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function resolveStorage(): StorageLike | null {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') return null
  return window.sessionStorage
}

/** Browser session repository that survives page refresh; safely degrades to in-memory on the server. */
export class PersistentSessionRepository implements SessionRepository {
  private memory: AuthSession | null = null
  private readonly storage: StorageLike | null

  constructor() { this.storage = resolveStorage() }

  async get(): Promise<AuthSession | null> {
    if (this.storage) {
      try {
        const raw = this.storage.getItem(STORAGE_KEY)
        if (raw) return JSON.parse(raw) as AuthSession
      } catch { return this.memory }
    }
    return this.memory
  }

  async save(session: AuthSession): Promise<void> {
    this.memory = structuredClone(session)
    if (this.storage) {
      try { this.storage.setItem(STORAGE_KEY, JSON.stringify(session)) } catch { /* storage may be unavailable (SSR/quota) */ }
    }
  }

  async clear(): Promise<void> {
    this.memory = null
    if (this.storage) {
      try { this.storage.removeItem(STORAGE_KEY) } catch { /* noop */ }
    }
  }
}