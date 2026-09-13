import {useMemo,useState,type ReactNode} from 'react'
import {Button,ButtonGroup,Icon,EmptyState} from '../ui'
import {addDays,addPersianMonths,buildPersianMonthMatrix,buildWeekDays,formatNumber,formatPersianDayNumber,formatPersianMonthYear,formatPersianDay,formatPersianTime,isSameDay,isSamePersianMonth,isToday,persianWeekdayNames,persianWeekdayShortNames,startOfDay} from '../../core/utils'

import {cx} from '../ui/utils'
export type CalendarView='month'|'week'|'day'
export interface CalendarEvent{id:string;title:string;date:string;endDate?:string;tone?:'neutral'|'primary'|'success'|'warning'|'danger'|'info';meta?:ReactNode}
export interface EntityCalendarProps{
 events:readonly CalendarEvent[];view?:CalendarView;onViewChange?(view:CalendarView):void;
 anchorDate?:string|Date;onAnchorChange?(date:Date):void;onEventActivate?(event:CalendarEvent):void;
 legend?:ReactNode;emptyLabel?:string;className?:string
}
const viewLabels:Readonly<Record<CalendarView,string>>={month:'ماه',week:'هفته',day:'روز'}
export function EntityCalendar({events,view:viewProp,onViewChange,anchorDate,onAnchorChange,onEventActivate,legend,emptyLabel='رویدادی ثبت نشده است',className}:EntityCalendarProps){
 const [internalView,setInternalView]=useState<CalendarView>('month')
 const [internalAnchor,setInternalAnchor]=useState<Date>(()=>startOfDay(anchorDate??new Date()))
 const view=viewProp??internalView
 const anchor=useMemo(()=>startOfDay(anchorDate??internalAnchor),[anchorDate,internalAnchor])
 const setView=(next:CalendarView)=>{setInternalView(next);onViewChange?.(next)}
 const setAnchor=(next:Date)=>{setInternalAnchor(next);onAnchorChange?.(next)}
 /** Month steps must follow the Jalali month length, never a fixed 30 days. */
 const shift=(direction:1|-1)=>setAnchor(view==='month'?addPersianMonths(anchor,direction):addDays(anchor,direction*(view==='week'?7:1)))

 const eventsByDay=useMemo(()=>{
  const map=new Map<string,CalendarEvent[]>()
  for(const event of events){
   const key=startOfDay(event.date).toDateString()
   const bucket=map.get(key)
   if(bucket)bucket.push(event);else map.set(key,[event])
  }
  return map
 },[events])
 const eventsFor=(date:Date)=>eventsByDay.get(startOfDay(date).toDateString())??[]
 const days=view==='month'?buildPersianMonthMatrix(anchor).flat():view==='week'?buildWeekDays(anchor):[anchor]

 const title=view==='month'?formatPersianMonthYear(anchor):view==='week'?`${formatPersianDay(days[0])} — ${formatPersianDay(days[days.length-1])}`:formatPersianDay(anchor)
 return <section className={cx('calendar',`calendar--${view}`,className)} aria-label="تقویم">
  <header className="calendar__toolbar">
   <div className="calendar__nav">
    <Button variant="outline" size="sm" onClick={()=>shift(-1)} aria-label="بازه قبلی"><Icon name="chevron" size="sm" directional/></Button>
    <Button variant="outline" size="sm" onClick={()=>setAnchor(startOfDay(new Date()))}>امروز</Button>
    <Button variant="outline" size="sm" onClick={()=>shift(1)} aria-label="بازه بعدی"><Icon name="chevron" size="sm" directional/></Button>

   </div>
   <h3 className="calendar__title" aria-live="polite">{title}</h3>
   <ButtonGroup aria-label="نمای تقویم">
    {(Object.keys(viewLabels) as CalendarView[]).map((item)=><Button key={item} size="sm" variant={item===view?'primary':'ghost'} aria-pressed={item===view} onClick={()=>setView(item)}>{viewLabels[item]}</Button>)}
   </ButtonGroup>
  </header>
  {legend&&<div className="calendar__legend">{legend}</div>}
  {view==='month'&&<div className="calendar__weekdays" aria-hidden="true">{persianWeekdayNames.map((name,index)=><span key={name}><span className="calendar__weekday-long">{name}</span><span className="calendar__weekday-short">{persianWeekdayShortNames[index]}</span></span>)}</div>}

  <div className={cx('calendar__grid',`calendar__grid--${view}`)} role="grid" aria-label={title}>
   {days.map((day)=>{
    const dayEvents=eventsFor(day)
    const outside=view==='month'&&!isSamePersianMonth(day,anchor)

    return <div key={day.toISOString()} role="gridcell" aria-selected={isSameDay(day,anchor)||undefined} className={cx('calendar__day',isToday(day)&&'is-today',outside&&'is-outside')}>
     <div className="calendar__day-head">
      <span className="calendar__day-number">{formatPersianDayNumber(day)}</span>
      {view!=='day'&&dayEvents.length>0&&<span className="calendar__day-count">{formatNumber(dayEvents.length)}</span>}
     </div>
     <ul className="calendar__events">
      {dayEvents.map((event)=><li key={event.id}>
       <button type="button" className={cx('calendar__event',`calendar__event--${event.tone??'primary'}`)} onClick={onEventActivate?()=>onEventActivate(event):undefined}>
        <span className="calendar__event-time">{formatPersianTime(event.date)}</span>
        <span className="calendar__event-title">{event.title}</span>
        {view==='day'&&event.meta&&<span className="calendar__event-meta">{event.meta}</span>}
       </button>
      </li>)}
     </ul>
     {view==='day'&&!dayEvents.length&&<EmptyState compact variant="inline" title={emptyLabel}/>}
    </div>
   })}
  </div>
 </section>
}
