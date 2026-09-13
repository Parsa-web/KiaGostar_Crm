export const formatFileSize = (bytes: number): string => { if (bytes < 1024) return `${bytes} B`; const units = ['KB', 'MB', 'GB']; let size = bytes / 1024; let unit = 0; while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++ } return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unit]}` }
export const truncateText = (value: string, length = 80) => value.length > length ? `${value.slice(0, length - 1)}…` : value
export const statusLabel = (status: string) => ({ PENDING: 'در انتظار', ACTIVE: 'فعال', COMPLETED: 'تکمیل‌شده', APPROVED: 'تأییدشده', REJECTED: 'ردشده', DRAFT: 'پیش‌نویس' }[status] ?? status)

export type DigitStyle = 'persian' | 'latin'
const localeFor = (digits: DigitStyle) => digits === 'persian' ? 'fa-IR' : 'en-US'
export interface NumberFormatOptions { digits?: DigitStyle; minimumFractionDigits?: number; maximumFractionDigits?: number }
export const formatNumber = (value: number, { digits = 'persian', minimumFractionDigits, maximumFractionDigits }: NumberFormatOptions = {}) => new Intl.NumberFormat(localeFor(digits), { minimumFractionDigits, maximumFractionDigits }).format(value)
export const formatCompactNumber = (value: number, { digits = 'persian', maximumFractionDigits = 1 }: NumberFormatOptions = {}) => new Intl.NumberFormat(localeFor(digits), { notation: 'compact', maximumFractionDigits }).format(value)
export const formatCurrency = (value: number, { digits = 'persian', currency = 'ریال' }: NumberFormatOptions & { currency?: string } = {}) => `${formatNumber(value, { digits, maximumFractionDigits: 0 })} ${currency}`
export const formatPercent = (value: number, { digits = 'persian', maximumFractionDigits = 1 }: NumberFormatOptions = {}) => `${formatNumber(value, { digits, maximumFractionDigits })}٪`
export const formatSignedPercent = (value: number, options: NumberFormatOptions = {}) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatPercent(Math.abs(value), options)}`
export const percentageChange = (current: number, previous: number) => previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / Math.abs(previous)) * 100
export const clampPercent = (value: number) => Math.min(100, Math.max(0, value))
export const toPersianDigits = (value: string) => value.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
export const initialsOf = (value: string) => value.trim().split(/\s+/).slice(0, 2).map((part) => part.at(0) ?? '').join('')
export const pluralizeFa = (count: number, singular: string) => `${formatNumber(count)} ${singular}`
