import type { User } from '../../../domain/entities'
import { AppError } from '../../../errors'
import { BaseService } from '../../../services'
import type { AuthRepository } from '../repositories/AuthRepository'
import type { SessionRepository } from '../repositories/SessionRepository'
import type { AuthSession, Credentials } from '../types'

export class AuthService extends BaseService<AuthRepository> {
  private readonly sessions: SessionRepository
  constructor(repository: AuthRepository, sessions: SessionRepository) { super(repository); this.sessions = sessions }

  async login(credentials: Credentials): Promise<{ user: User; session: AuthSession }> {
    if (!credentials.username.trim() || !credentials.password) throw new AppError('VALIDATION_ERROR', 'نام کاربری و رمز عبور الزامی است.')
    const user = await this.repository.findUserByCredentials(credentials)
    if (!user || user.status !== 'ACTIVE') throw new AppError('AUTH_ERROR', 'نام کاربری یا رمز عبور نادرست است.')
    const [roles, capabilities, departmentIds] = await Promise.all([
      this.repository.getUserRoles(user.id), this.repository.getUserCapabilities(user.id), this.repository.getUserDepartmentIds(user.id),
    ])
    const session: AuthSession = { userId: user.id, roles: [...roles], capabilities: [...capabilities], departmentIds: [...departmentIds], createdAt: new Date().toISOString() }
    await this.sessions.save(session)
    return { user, session }
  }

  async logout(): Promise<void> { await this.sessions.clear() }
  async getSession(): Promise<AuthSession | null> {
    const session = await this.sessions.get()
    if (session?.expiresAt && Date.parse(session.expiresAt) <= Date.now()) {
      await this.sessions.clear()
      throw new AppError('SESSION_EXPIRED', 'نشست شما منقضی شده است.')
    }
    return session
  }
  async getCurrentUser(): Promise<User | null> {
    const session = await this.getSession()
    return session ? this.repository.findUserById(session.userId) : null
  }
  async isAuthenticated(): Promise<boolean> { return (await this.getCurrentUser()) !== null }
}
