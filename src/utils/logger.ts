import { environment } from '../config/environment'

type LogPayload = Readonly<Record<string, unknown>> | unknown
type ExternalLogger = (level: LogLevel, message: string, payload?: LogPayload) => void
type LogLevel = 'info' | 'warning' | 'error' | 'debug'

let externalLogger: ExternalLogger | undefined

export const registerExternalLogger = (adapter: ExternalLogger): void => {
  externalLogger = adapter
}

const write = (level: LogLevel, message: string, payload?: LogPayload): void => {
  if (externalLogger) {
    externalLogger(level, message, payload)
    return
  }
  if (environment.ENVIRONMENT === 'production') return
  const args = payload === undefined ? [message] : [message, payload]
  if (level === 'warning') console.warn(...args)
  else console[level](...args)
}

export const logger = {
  info: (message: string, payload?: LogPayload) => write('info', message, payload),
  warning: (message: string, payload?: LogPayload) => write('warning', message, payload),
  error: (message: string, payload?: LogPayload) => write('error', message, payload),
  debug: (message: string, payload?: LogPayload) => write('debug', message, payload),
}
