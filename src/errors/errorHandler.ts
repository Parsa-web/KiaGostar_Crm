import { AppError } from './AppError'

export const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) return error
  if (error instanceof Error) return new AppError('UNKNOWN_ERROR', error.message)
  return new AppError('UNKNOWN_ERROR', 'خطای پیش‌بینی‌نشده رخ داد.')
}
