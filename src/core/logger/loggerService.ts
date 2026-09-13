import { redactSensitive } from '../security/sanitize'
import type { LogEntry, LogLevel } from './types'

export interface LogSink { write(entry: LogEntry): void | Promise<void> }

export class LoggerService {
  private readonly entries: LogEntry[] = []
  private readonly sinks: readonly LogSink[]
  constructor(sinks: readonly LogSink[] = []) { this.sinks = sinks }

  info(message: string, context?: unknown, userId?: string) { return this.write('INFO', message, context, userId) }
  warning(message: string, context?: unknown, userId?: string) { return this.write('WARNING', message, context, userId) }
  error(message: string, context?: unknown, userId?: string) { return this.write('ERROR', message, context, userId) }
  debug(message: string, context?: unknown, userId?: string) { return this.write('DEBUG', message, context, userId) }
  getEntries(): readonly LogEntry[] { return structuredClone(this.entries) }

  private async write(level: LogLevel, message: string, context?: unknown, userId?: string) {
    const entry: LogEntry = { id: crypto.randomUUID(), level, message, context: redactSensitive(context), userId, createdAt: new Date().toISOString() }
    this.entries.push(entry)
    await Promise.allSettled(this.sinks.map((sink) => sink.write(entry)))
    return entry
  }
}

export const loggerService = new LoggerService()
