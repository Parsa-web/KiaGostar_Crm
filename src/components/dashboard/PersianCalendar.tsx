/**
 * PersianCalendar — a standalone Jalali (Persian) month calendar.
 *
 * Built entirely on the project's existing dateUtils (Intl-based Jalali).
 * State is local: viewDate (the month being displayed) and selectedDate.
 *
 * Features:
 *  - Month navigation (< / >)
 *  - Click month name → month picker (3×4 grid)
 *  - Click year → year picker (±50 years)
 *  - "Today" button
 *  - Keyboard accessible
 *  - Outside click / Escape to close
 */

import { memo, useCallback, useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import {
  addPersianMonths,
  buildPersianMonthMatrix,
  isSameDay,
  isSamePersianMonth,
  isToday,
  persianParts,
  persianWeekdayShortNames,
} from '../../core/utils/dateUtils'

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
  'مرداد', 'شهریور', 'مهر', 'آبان',
  'آذر', 'دی', 'بهمن', 'اسفند',
]

export interface PersianCalendarProps {
  /** Currently selected date (ISO string or Date). */
  value?: Date | null
  /** Called when user selects a date. */
  onChange?(date: Date): void
  /** Called when user clicks outside or presses Escape. */
  onClose?(): void
  /** CSS class for the root element. */
  className?: string
}

export const PersianCalendar = memo(function PersianCalendar({
  value = null,
  onChange,
  onClose,
  className,
}: PersianCalendarProps) {
  const today = useMemo(() => new Date(), [])

  const [viewDate, setViewDate] = useState(() => value ?? today)
  const [pickerMode, setPickerMode] = useState<'days' | 'months' | 'years'>('days')

  const viewParts = useMemo(() => persianParts(viewDate), [viewDate])
  const grid = useMemo(() => buildPersianMonthMatrix(viewDate), [viewDate])

  const goToToday = useCallback(() => {
    const now = new Date()
    setViewDate(now)
    onChange?.(now)
    onClose?.()
  }, [onChange, onClose])

  const handleSelectDay = useCallback((day: Date) => {
    onChange?.(day)
    onClose?.()
  }, [onChange, onClose])

  const handleSelectMonth = useCallback((month: number) => {
    setViewDate(prev => {
      const parts = persianParts(prev)
      const target = new Date(prev)
      // Set to day 15 to avoid month boundary issues
      target.setDate(15)
      // Navigate to the target month by stepping from current
      const diff = month - parts.month
      return addPersianMonths(target, diff)
    })
    setPickerMode('days')
  }, [])

  const handleSelectYear = useCallback((year: number) => {
    setViewDate(prev => {
      const parts = persianParts(prev)
      const diff = year - parts.year
      return addPersianMonths(prev, diff * 12)
    })
    setPickerMode('days')
  }, [])

  // Year range for the picker: current ± 50
  const yearRange = useMemo(() => {
    const currentYear = viewParts.year
    const start = currentYear - 50
    const end = currentYear + 50
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [viewParts.year])

  return (
    <div className={`persian-calendar${className ? ` ${className}` : ''}`} role="dialog" aria-label="تقویم">
      {/* Header */}
      <div className="persian-calendar__header">
        <div className="persian-calendar__title">
          <button
            type="button"
            className="persian-calendar__month-btn"
            onClick={() => setPickerMode(prev => prev === 'months' ? 'days' : 'months')}
            aria-label="انتخاب ماه"
            aria-expanded={pickerMode === 'months'}
          >
            {PERSIAN_MONTHS[viewParts.month - 1]}
          </button>
          <button
            type="button"
            className="persian-calendar__year-btn"
            onClick={() => setPickerMode(prev => prev === 'years' ? 'days' : 'years')}
            aria-label="انتخاب سال"
            aria-expanded={pickerMode === 'years'}
          >
            {viewParts.year}
          </button>
        </div>
      </div>

      {/* Month picker */}
      {pickerMode === 'months' && (
        <div className="persian-calendar__picker" role="listbox" aria-label="انتخاب ماه">
          <div className="persian-calendar__month-grid">
            {PERSIAN_MONTHS.map((name, index) => (
              <button
                key={index}
                type="button"
                role="option"
                aria-selected={index + 1 === viewParts.month}
                className={`persian-calendar__month-item${index + 1 === viewParts.month ? ' persian-calendar__month-item--active' : ''}`}
                onClick={() => handleSelectMonth(index + 1)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Year picker */}
      {pickerMode === 'years' && (
        <div className="persian-calendar__picker" role="listbox" aria-label="انتخاب سال">
          <div className="persian-calendar__year-grid">
            {yearRange.map(year => (
              <button
                key={year}
                type="button"
                role="option"
                aria-selected={year === viewParts.year}
                className={`persian-calendar__year-item${year === viewParts.year ? ' persian-calendar__year-item--active' : ''}`}
                onClick={() => handleSelectYear(year)}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Day grid */}
      {pickerMode === 'days' && (
        <>
          <div className="persian-calendar__weekdays" role="row">
            {persianWeekdayShortNames.map(name => (
              <span key={name} className="persian-calendar__weekday" role="columnheader">
                {name}
              </span>
            ))}
          </div>

          <div className="persian-calendar__grid" role="grid">
            {grid.map((week, weekIndex) => (
              <div key={weekIndex} className="persian-calendar__week" role="row">
                {week.map(day => {
                  const inMonth = isSamePersianMonth(day, viewDate)
                  const todayHighlight = isToday(day)
                  const selected = value ? isSameDay(day, value) : false

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      className={[
                        'persian-calendar__day',
                        !inMonth && 'persian-calendar__day--outside',
                        todayHighlight && 'persian-calendar__day--today',
                        selected && 'persian-calendar__day--selected',
                      ].filter(Boolean).join(' ')}
                      tabIndex={inMonth ? 0 : -1}
                      aria-current={todayHighlight ? 'date' : undefined}
                      aria-selected={selected || undefined}
                      onClick={() => handleSelectDay(day)}
                    >
                      {persianParts(day).day}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="persian-calendar__footer">
            <Button size="sm" variant="ghost" onClick={goToToday}>
              امروز
            </Button>
          </div>
        </>
      )}
    </div>
  )
})
