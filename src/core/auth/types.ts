import type { RoleCode } from '../../domain/enums'
export interface TokenPair { accessToken: string; refreshToken?: string; expiresAt?: string }
export interface SessionUser { id: string; roles: RoleCode[]; permissions: string[]; departmentIds: string[] }
export interface SecurityProfile { userId: string; lastLogin?: string; sessionStatus: 'ACTIVE' | 'EXPIRED' | 'REVOKED' }
export interface AuthSession { user: SessionUser; tokens: TokenPair; createdAt: string }
export interface AuthGateway { login(credentials: { username: string; password: string }): Promise<AuthSession>; logout(refreshToken?: string): Promise<void>; refresh(refreshToken: string): Promise<TokenPair> }
