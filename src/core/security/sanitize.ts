const sensitiveKeys = /password|token|secret|authorization|cookie|credential/i

export const sanitizeText = (value: string): string => value
  .replace(/[<>]/g, '')
  .replace(/javascript:/gi, '')
  .trim()

export const sanitizeFileName = (value: string): string => [...sanitizeText(value)]
  .filter((character) => character.charCodeAt(0) >= 32)
  .join('')
  .replace(/[\\/:*?"|]/g, '_')
  .replace(/\.\.+/g, '.')
  .slice(0, 180)

export const redactSensitive = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return '[Circular]'
  seen.add(value)
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, seen))
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    sensitiveKeys.test(key) ? '[REDACTED]' : redactSensitive(item, seen),
  ]))
}
