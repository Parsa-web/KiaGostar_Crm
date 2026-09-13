/* Every surface of this product is Persian-first: dates must always be rendered
   with the Jalali (Hijri-Shamsi) calendar and Persian digits. The locale tag is
   pinned explicitly (`-u-ca-persian`) so the output can never fall back to the
   Gregorian calendar on runtimes whose `fa-IR` default differs. */
export const PERSIAN_LOCALE = 'fa-IR-u-ca-persian'
export const PERSIAN_NUMBER_LOCALE = 'fa-IR'

export const formatPersianDate = (value: string | Date, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }) => new Intl.DateTimeFormat(PERSIAN_LOCALE, options).format(new Date(value))
export const compareDates = (a: string | Date, b: string | Date) => new Date(a).getTime() - new Date(b).getTime()

export const isInDateRange = (value: string | Date, from?: string, to?: string) => (!from || compareDates(value, from) >= 0) && (!to || compareDates(value, to) <= 0)

export const formatPersianDay = (value: string | Date) => formatPersianDate(value, { dateStyle: 'medium' })
export const formatPersianTime = (value: string | Date) => formatPersianDate(value, { timeStyle: 'short' })
export const formatPersianWeekday = (value: string | Date) => formatPersianDate(value, { weekday: 'long' })
export const formatPersianMonthYear = (value: string | Date) => formatPersianDate(value, { month: 'long', year: 'numeric' })
export const formatPersianDayNumber = (value: string | Date) => new Intl.DateTimeFormat(PERSIAN_LOCALE, { day: 'numeric' }).format(new Date(value))
export const formatPersianDateTime = (value: string | Date) => formatPersianDate(value, { dateStyle: 'medium', timeStyle: 'short' })

export const startOfDay = (value: string | Date) => { const date = new Date(value); date.setHours(0, 0, 0, 0); return date }
export const addDays = (value: string | Date, amount: number) => { const date = new Date(value); date.setDate(date.getDate() + amount); return date }
export const isSameDay = (a: string | Date, b: string | Date) => startOfDay(a).getTime() === startOfDay(b).getTime()
export const isToday = (value: string | Date) => isSameDay(value, new Date())
export const isTomorrow = (value: string | Date) => isSameDay(value, addDays(new Date(), 1))
export const isWithinNextDays = (value: string | Date, days: number) => { const now = startOfDay(new Date()).getTime(); const target = startOfDay(value).getTime(); return target >= now && target <= startOfDay(addDays(new Date(), days)).getTime() }
export const isPast = (value: string | Date) => compareDates(value, new Date()) < 0
const relativeUnits: readonly [Intl.RelativeTimeFormatUnit, number][] = [['year', 31_536_000_000], ['month', 2_592_000_000], ['day', 86_400_000], ['hour', 3_600_000], ['minute', 60_000]]
export const formatRelativeTime = (value: string | Date) => { const diff = new Date(value).getTime() - Date.now(); const formatter = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' }); for (const [unit, ms] of relativeUnits) { if (Math.abs(diff) >= ms) return formatter.format(Math.round(diff / ms), unit) } return formatter.format(Math.round(diff / 1000), 'second') }
export const durationMinutes = (start: string | Date, end?: string | Date) => end ? Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000)) : 0
export const formatDuration = (minutes: number) => { const hours = Math.floor(minutes / 60); const rest = minutes % 60; if (!hours) return `${new Intl.NumberFormat('fa-IR').format(rest)} دقیقه`; if (!rest) return `${new Intl.NumberFormat('fa-IR').format(hours)} ساعت`; return `${new Intl.NumberFormat('fa-IR').format(hours)} ساعت و ${new Intl.NumberFormat('fa-IR').format(rest)} دقیقه` }
export const startOfWeek = (value: string | Date) => { const date = startOfDay(value); const day = date.getDay(); return addDays(date, -((day + 1) % 7)) }
export const buildMonthMatrix = (value: string | Date) => { const anchor = startOfDay(value); const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1); const gridStart = startOfWeek(first); return Array.from({ length: 6 }, (_, week) => Array.from({ length: 7 }, (_, day) => addDays(gridStart, week * 7 + day))) }
export const buildWeekDays = (value: string | Date) => { const start = startOfWeek(value); return Array.from({ length: 7 }, (_, index) => addDays(start, index)) }
export const persianWeekdayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'] as const
export const persianWeekdayShortNames = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const
export const toISODate = (value: string | Date) => startOfDay(value).toISOString()

/* ==========================================================================
   Jalali (Persian) calendar helpers
   The UI is Persian-first, therefore every month grid must follow the Jalali
   month boundaries — never the Gregorian ones. Conversion is delegated to the
   platform Intl engine so no hand-rolled arithmetic can drift.
   ========================================================================== */

/** Local (not UTC) day key — `toISOString()` shifts the day for TZ offsets such as +03:30. */
export const toDateKey = (value: string | Date) => { const date = new Date(value); const month = `${date.getMonth() + 1}`.padStart(2, '0'); const day = `${date.getDate()}`.padStart(2, '0'); return `${date.getFullYear()}-${month}-${day}` }

const persianPartsFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' })
export interface PersianDateParts { year: number; month: number; day: number }
/** Jalali year/month/day of a Gregorian date. */
export const persianParts = (value: string | Date): PersianDateParts => {
  const parts = persianPartsFormatter.formatToParts(new Date(value))
  const read = (type: Intl.DateTimeFormatPartTypes) => Number.parseInt(parts.find((part) => part.type === type)?.value ?? '0', 10)
  return { year: read('year'), month: read('month'), day: read('day') }
}
/** First Gregorian day of the Jalali month that contains `value`. */
export const startOfPersianMonth = (value: string | Date) => addDays(startOfDay(value), 1 - persianParts(value).day)
/** 29, 30 or 31 depending on the Jalali month (and leap years for اسفند). */
export const persianMonthLength = (value: string | Date) => { const start = startOfPersianMonth(value); const month = persianParts(start).month; for (let length = 29; length <= 31; length += 1) { if (persianParts(addDays(start, length)).month !== month) return length } return 31 }
export const addPersianMonths = (value: string | Date, amount: number) => {
  let cursor = startOfPersianMonth(value)
  for (let step = 0; step < Math.abs(amount); step += 1) cursor = amount > 0 ? addDays(cursor, persianMonthLength(cursor)) : startOfPersianMonth(addDays(cursor, -1))
  return addDays(cursor, Math.min(persianParts(value).day, persianMonthLength(cursor)) - 1)
}

export const isSamePersianMonth = (a: string | Date, b: string | Date) => { const left = persianParts(a); const right = persianParts(b); return left.year === right.year && left.month === right.month }
/** Saturday-first grid covering the whole Jalali month (5 or 6 weeks, never a ragged row). */
export const buildPersianMonthMatrix = (value: string | Date) => {
  const start = startOfPersianMonth(value)
  const gridStart = startOfWeek(start)
  const offset = Math.round((startOfDay(start).getTime() - gridStart.getTime()) / 86_400_000)
  const weeks = Math.ceil((offset + persianMonthLength(start)) / 7)
  return Array.from({ length: weeks }, (_, week) => Array.from({ length: 7 }, (_, day) => addDays(gridStart, week * 7 + day)))
}


/** Long Persian date in natural reading order: «شنبه ۱۷ مرداد ۱۴۰۵». Intl's
    `dateStyle: 'full'` yields «۱۴۰۵ مرداد ۱۷، شنبه», which reads wrong in RTL. */
export const formatPersianFullDate = (value: string | Date) => {
  const date = new Date(value)
  const part = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(PERSIAN_LOCALE, options).format(date)
  return `${part({ weekday: 'long' })} ${part({ day: 'numeric' })} ${part({ month: 'long' })} ${part({ year: 'numeric' })}`
}

/* ==========================================================================
   Local ISO helpers
   `Date.prototype.toISOString()` serialises in UTC, which silently rolls a
   19:00 Tehran meeting into the following day. Everything the user picks in a
   form is local wall-clock time, so it is serialised as local time too.
   ========================================================================== */

const pad2 = (value: number) => String(value).padStart(2, '0')
/** `YYYY-MM-DDTHH:mm:ss` in local time — round-trips through `new Date(...)` unchanged. */
export const toLocalIso = (value: string | Date) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}
/** Combines a `YYYY-MM-DD` date with an `HH:mm` time into a local ISO stamp. */
export const combineDateAndTime = (date: string, time: string) => date && time ? `${date}T${time.length === 5 ? `${time}:00` : time}` : ''
/** Adds minutes to an ISO stamp, preserving the local-time representation. */
export const addMinutesIso = (value: string | Date, minutes: number) => toLocalIso(new Date(new Date(value).getTime() + minutes * 60_000))

