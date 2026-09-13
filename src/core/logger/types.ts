export type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG'

export interface LogEntry {
  id: string
  level: LogLevel
  message: string
  context?: unknown
  userId?: string
  createdAt: string
}
