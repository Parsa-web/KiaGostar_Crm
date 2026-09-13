import type { User } from '../../../domain/entities'
import type { AuthSession } from '../types'

export interface AuthState { currentUser: User | null; session: AuthSession | null; loading: boolean }
export const initialAuthState: AuthState = { currentUser: null, session: null, loading: true }
