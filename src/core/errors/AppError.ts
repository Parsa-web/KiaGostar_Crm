export type AppErrorType = 'VALIDATION' | 'AUTHENTICATION' | 'AUTHORIZATION' | 'NOT_FOUND' | 'NETWORK' | 'SERVER' | 'UNKNOWN'

export interface AppErrorShape { code: string; message: string; type: AppErrorType; details?: unknown; timestamp: string }

export class CoreAppError extends Error implements AppErrorShape {
  readonly timestamp = new Date().toISOString()
  readonly code: string
  readonly type: AppErrorType
  readonly details?: unknown
  constructor(code: string, message: string, type: AppErrorType, details?: unknown) { super(message); this.name = 'CoreAppError'; this.code = code; this.type = type; this.details = details }
}

export class ValidationError extends CoreAppError { constructor(code = 'VALIDATION_ERROR', message = 'اطلاعات واردشده معتبر نیست.', details?: unknown) { super(code, message, 'VALIDATION', details) } }
export class AuthorizationError extends CoreAppError { constructor(code = 'PERMISSION_ERROR', message = 'اجازه انجام این عملیات را ندارید.', details?: unknown) { super(code, message, 'AUTHORIZATION', details) } }
export class AuthenticationError extends CoreAppError { constructor(code = 'AUTH_ERROR', message = 'ورود به سامانه الزامی است.', details?: unknown) { super(code, message, 'AUTHENTICATION', details) } }
export class NotFoundError extends CoreAppError { constructor(code = 'NOT_FOUND', message = 'اطلاعات موردنظر پیدا نشد.', details?: unknown) { super(code, message, 'NOT_FOUND', details) } }
export class NetworkError extends CoreAppError { constructor(code = 'NETWORK_ERROR', message = 'ارتباط با سامانه برقرار نشد.', details?: unknown) { super(code, message, 'NETWORK', details) } }
