import { loggerService } from '../logger'
import { CoreAppError, type AppErrorShape } from './AppError'

const fallbackMessage = 'عملیات انجام نشد؛ لطفاً دوباره تلاش کنید.'

export const normalizeError = (error: unknown): AppErrorShape => {
  if (error instanceof CoreAppError) return error
  return { code: 'UNKNOWN_ERROR', message: fallbackMessage, type: 'UNKNOWN', timestamp: new Date().toISOString() }
}

export const handleError = (error: unknown, context?: unknown): AppErrorShape => {
  const normalized = normalizeError(error)
  void loggerService.error(normalized.code, { error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error, context })
  return normalized
}
