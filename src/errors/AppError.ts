import type { ErrorCode, ErrorDetails } from '../types/errors'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly details?: ErrorDetails

  constructor(code: ErrorCode, message: string, details?: ErrorDetails) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = details
  }
}
