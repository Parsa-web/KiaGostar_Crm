export const errorCodes = [
  'AUTH_ERROR',
  'PERMISSION_ERROR',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'NETWORK_ERROR',
  'SESSION_EXPIRED',
  'ACCESS_DENIED',
  'UNKNOWN_ERROR',
] as const

export type ErrorCode = (typeof errorCodes)[number]

export interface ErrorDetails {
  field?: string
  metadata?: Readonly<Record<string, unknown>>
}
