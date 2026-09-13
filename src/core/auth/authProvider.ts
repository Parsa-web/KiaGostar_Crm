import type { AuthSession } from './types'
export interface AuthProvider { getSession(): AuthSession | null; login(credentials:{username:string;password:string}):Promise<AuthSession>; logout():Promise<void> }
