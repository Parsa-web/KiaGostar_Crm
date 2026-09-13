import {Children,isValidElement,memo,useCallback,useEffect,useId,useMemo,useRef,useState,type ReactNode} from 'react'
import {Avatar,Button,Card,EmptyState,ErrorState,Icon,IconButton,LoadingState,StatusBadge,Typography,type IconName} from '../ui'
import {formatPersianDate,formatPersianFullDate,formatPersianTime,formatRelativeTime} from '../../core/utils'
import {cx} from '../ui/utils'
import { PersianCalendar } from './PersianCalendar'
import type {PersonalizationState} from './useDashboardPersonalization'
/** Live clock that ticks every second. */
const useClock = () => {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

/** Popover wrapper for the calendar button in the header. */
function CalendarButton() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div className="dashboard-header__calendar">
      <IconButton
        ref={buttonRef}
        icon="calendar"
        label="تقویم"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
      />
      {open && (
        <div className="dashboard-header__calendar-popover" role="dialog" aria-label="تقویم">
          <PersianCalendar onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}
/** Page header shared by every role dashboard: greeting, organisation context, date and quick actions. */
export interface DashboardHeaderProps{
 title:ReactNode;greeting?:ReactNode;userName:string;roleLabel:string;departmentLabel?:string;organizationName?:string;
 avatar?:string;status?:ReactNode;message?:ReactNode;date?:Date;breadcrumb?:ReactNode;search?:ReactNode;actions?:ReactNode;className?:string;showClock?:boolean
}
const greetingFor=(hour:number)=>hour<12?'صبح بخیر':hour<17?'ظهر بخیر':'وقت بخیر'
export function DashboardHeader({title,greeting,userName,roleLabel,departmentLabel,organizationName,avatar,status,message,date,breadcrumb,search,actions,className,showClock=true}:DashboardHeaderProps){
 const now=date??new Date()
 const clockTime=useClock()
 return <header className={cx('dashboard-header',className)}>
  {breadcrumb}
  <div className="dashboard-header__main">
   <Avatar name={userName} alt={userName} src={avatar} size="lg"/>
   <div className="dashboard-header__intro">
    <Typography variant="h1" className="dashboard-header__title">{title}</Typography>
     <p className="dashboard-header__greeting">{greeting??`${greetingFor(now.getHours())}، ${userName}`}</p>
    <p className="dashboard-header__meta">
     <span>{roleLabel}</span>
      {departmentLabel&&<><span aria-hidden="true">•</span><span>{departmentLabel}</span></>}
      {organizationName&&<><span aria-hidden="true">•</span><span>{organizationName}</span></>}
      <span aria-hidden="true">•</span>
     <time className="dashboard-header__date" dateTime={now.toISOString()}>{formatPersianFullDate(now)}</time>
      {showClock&&<><span aria-hidden="true">•</span><time className="dashboard-header__clock" dateTime={clockTime.toISOString()}>{formatPersianTime(clockTime)}</time></>}
    </p>
    {status&&<p className="dashboard-header__status">{status}</p>}
    {message&&<p className="dashboard-header__message">{message}</p>}
   </div>
  </div>
  {(search||actions)&&<div className="dashboard-header__tools">
   {search}
   {actions&&<div className="dashboard-header__actions">{actions}</div>}
  </div>}
 </header>
}
/** Responsive widget grid; widget spans are declarative so layouts never hardcode pixel sizes. */
export function DashboardGrid({children,columns=12,className}:{children:ReactNode;columns?:6|12;className?:string}){
 return <div className={cx('dashboard-grid',`dashboard-grid--${columns}`,className)}>{children}</div>
}
/** Explicit visual row: the cards that actually render always divide the full
    width equally, so hidden personalization items never leave a dead column. */
export function DashboardRow({children,columns=2,className}:{children:ReactNode;columns?:2|3;className?:string}){
 const items=useMemo(()=>Children.toArray(children).filter(isValidElement),[children])
 if(!items.length)return null
 return <div className={cx('dashboard-row',`dashboard-row--${columns}`,className)}>{items}</div>
}
export type DashboardContentKind='chart'|'table'|'list'|'summary'|'controls'
export interface DashboardLayoutItem{
 id:string;node:ReactNode;kind:DashboardContentKind;itemCount?:number;prominence?:'primary'|'normal';importance?:'primary'|'secondary'|'utility';fullWidth?:boolean
}
export interface DashboardCompositionColumn{ids:readonly string[];span:3|4|5|6|7|8|9|12}
export type DashboardRowHeight='compact'|'standard'|'large'
export interface DashboardCompositionBand{height:DashboardRowHeight;columns:readonly DashboardCompositionColumn[]}
type DashboardContentDensity='compact'|'regular'|'dense'
interface MeasuredDashboardItem extends DashboardLayoutItem{span:4|6|12;contentUnits:number;density:DashboardContentDensity;node:ReactNode}
const dashboardContentDensity=(kind:DashboardContentKind,count:number):DashboardContentDensity=>{
 if(kind==='chart'||kind==='summary')return 'compact'
 if(kind==='table')return count>8?'dense':count>4?'regular':'compact'
 if(kind==='controls')return count>8?'dense':'regular'
 return count>6?'dense':count>3?'regular':'compact'
}
const measureDashboardItem=(item:DashboardLayoutItem):MeasuredDashboardItem=>{
 const count=Math.max(0,item.itemCount??0)
 const contentUnits=item.kind==='chart'?7:item.kind==='table'?Math.min(12,count+3):item.kind==='controls'?Math.min(9,count+4):item.kind==='summary'?Math.min(7,count+2):Math.min(10,Math.max(3,count))
 const span:4|6|12=item.fullWidth?12:item.prominence==='primary'||item.kind==='chart'||item.kind==='table'||item.kind==='list'&&count>6?6:4
 return {...item,node:item.node,span,contentUnits,density:dashboardContentDensity(item.kind,count)}
}
const combinations=<T,>(items:readonly T[],maximum:number):T[][]=>{
 const result:T[][]=[[]]
 items.forEach((item)=>{result.slice().forEach((entry)=>{if(entry.length<maximum)result.push([...entry,item])})})
 return result
}
type DashboardRowLayout='single'|'pair'|'triplet'|'split-stack'
interface ComposedDashboardRow{items:MeasuredDashboardItem[];layout:DashboardRowLayout;featureId?:string}
const importanceValue=(item:MeasuredDashboardItem)=>item.importance==='utility'?0:item.importance==='primary'||item.prominence==='primary'?2:1
const splitStackFeature=(row:readonly MeasuredDashboardItem[])=>{
 if(row.length!==3)return undefined
 const feature=row.find((item)=>item.span===6&&item.importance!=='utility'&&item.kind!=='summary')
 const support=row.filter((item)=>item.id!==feature?.id)
 return feature&&support.length===2&&support.every((item)=>item.span===4)&&feature.contentUnits>=support.reduce((sum,item)=>sum+item.contentUnits,0)-2?feature:undefined
}
const describeDashboardRow=(row:MeasuredDashboardItem[]):ComposedDashboardRow=>{
 const feature=splitStackFeature(row)
 return {items:row,layout:feature?'split-stack':row.length===1?'single':row.length===2?'pair':'triplet',featureId:feature?.id}
}
const dashboardRowScore=(row:readonly MeasuredDashboardItem[])=>{
 const feature=splitStackFeature(row);const total=row.reduce((sum,item)=>sum+item.span,0)
 const units=row.map((item)=>item.contentUnits);const importance=row.map(importanceValue)
 const densitySpread=Math.max(...units)-Math.min(...units);const importanceSpread=Math.max(...importance)-Math.min(...importance)
 const widthPenalty=feature?0:Math.abs(12-total)*3
 const balancePenalty=feature?Math.abs(feature.contentUnits-row.filter((item)=>item.id!==feature.id).reduce((sum,item)=>sum+item.contentUnits,0))*2:densitySpread*2
 return widthPenalty+balancePenalty+importanceSpread*2+(row.length===1?18:0)-row.length*.5
}
const composeDashboardSegment=(items:readonly MeasuredDashboardItem[])=>{
 const memo=new Map<string,{rows:ComposedDashboardRow[];score:number}>()
 const solve=(remaining:readonly MeasuredDashboardItem[]):{rows:ComposedDashboardRow[];score:number}=>{
  if(!remaining.length)return {rows:[],score:0}
  const key=remaining.map((item)=>item.id).join('|');const cached=memo.get(key);if(cached)return cached
  const seed=remaining[0]!
  const candidates=combinations(remaining.slice(1),2).map((entries)=>[seed,...entries]).filter((row)=>row.reduce((sum,item)=>sum+item.span,0)<=12||Boolean(splitStackFeature(row)))
  const result=candidates.reduce<{rows:ComposedDashboardRow[];score:number}|undefined>((best,row)=>{
   const ids=new Set(row.map((item)=>item.id));const tail=solve(remaining.filter((item)=>!ids.has(item.id)))
   const candidate={rows:[describeDashboardRow(row),...tail.rows],score:dashboardRowScore(row)+tail.score}
   return !best||candidate.score<best.score?candidate:best
  },undefined)!
  memo.set(key,result);return result
 }
 return solve(items).rows
}
/** Content-aware dashboard composition. It estimates visual density from the
    real item count and content kind, then pairs cards with similar footprints. */
export function DashboardAutoLayout({items,className}:{items:readonly DashboardLayoutItem[];className?:string}){
 const visible=useMemo(()=>items.filter((item)=>isValidElement(item.node)).map(measureDashboardItem),[items])
 const rows=useMemo(()=>{
  const result:ComposedDashboardRow[]=[];let segment:MeasuredDashboardItem[]=[]
  const flush=()=>{if(segment.length){result.push(...composeDashboardSegment(segment));segment=[]}}
  visible.forEach((item)=>{if(item.span===12){flush();result.push(describeDashboardRow([item]))}else segment.push(item)});flush()
  return result
 },[visible])
 return <>{rows.map((row,index)=>{
  const units=row.layout==='split-stack'?12:row.items.reduce((sum,item)=>sum+item.span,0)
  return <div key={`${row.items.map((item)=>item.id).join('-')}-${index}`} className={cx('dashboard-row','dashboard-row--adaptive',className)} data-layout={row.layout} style={{['--dashboard-row-units' as string]:units}}>
   {row.items.map((item)=><div key={item.id} className="dashboard-row__item" data-content-kind={item.kind} data-content-density={item.density} data-importance={item.importance??(item.prominence==='primary'?'primary':item.kind==='controls'?'utility':'secondary')} data-layout-slot={row.featureId===item.id?'feature':row.layout==='split-stack'?'support':undefined} style={{['--dashboard-item-span' as string]:item.span}}>{item.node}</div>)}
  </div>
 })}</>
}

/** Role-aware composition uses the same measured items, but arranges them into
    explicit visual bands. Hidden items collapse their column and the remaining
    columns automatically reclaim the full width. */
export function DashboardComposedLayout({items,composition,className}:{items:readonly DashboardLayoutItem[];composition:readonly DashboardCompositionBand[];className?:string}){
 const visible=useMemo(()=>items.filter((item)=>isValidElement(item.node)).map(measureDashboardItem),[items])
 const bands=useMemo(()=>{
  const byId=new Map(visible.map((item)=>[item.id,item]));const used=new Set<string>()
  const prescribed=composition.map((band)=>({height:band.height,columns:band.columns.map((column)=>{
   const columnItems=column.ids
    .map((id)=>byId.get(id))
    .filter((item):item is MeasuredDashboardItem=>Boolean(item))
    .filter((item)=>!used.has(item.id))
   columnItems.forEach((item)=>used.add(item.id))
   return {span:column.span,items:columnItems}
  }).filter((column)=>column.items.length)})).filter((band)=>band.columns.length)
  const remaining=visible.filter((item)=>!used.has(item.id))
  return [...prescribed,...remaining.map((item)=>({height:'standard' as const,columns:[{span:12 as const,items:[item]}]}))]
 },[composition,visible])
 return <div className={cx('dashboard-composition',className)}>{bands.map((band,index)=>{
  const units=band.columns.reduce((sum,column)=>sum+column.span,0)
  return <section key={`${band.columns.flatMap((column)=>column.items.map((item)=>item.id)).join('-')}-${index}`} className="dashboard-band" data-row-height={band.height} style={{['--dashboard-band-units' as string]:units}}>
   {band.columns.map((column,columnIndex)=><div key={`${column.items.map((item)=>item.id).join('-')}-${columnIndex}`} className="dashboard-band__column" data-column-size={band.columns.length===1?'full':column.span>=7?'wide':'narrow'} data-stack={column.items.length>1||undefined} style={{['--dashboard-column-span' as string]:column.span,['--dashboard-stack-size' as string]:column.items.length}}>
    {column.items.map((item)=><div key={item.id} className="dashboard-row__item" data-dashboard-item={item.id} data-content-kind={item.kind} data-content-density={item.density} data-importance={item.importance??(item.prominence==='primary'?'primary':item.kind==='controls'?'utility':'secondary')}>{item.node}</div>)}
   </div>)}
  </section>
 })}</div>
}
export type WidgetSize='sm'|'md'|'lg'|'xl'|'full'
export interface DashboardWidgetProps{
 id?:string;title:ReactNode;icon?:IconName;description?:ReactNode;size?:WidgetSize;actions?:ReactNode;
 loading?:boolean;error?:ReactNode;onRetry?():void;onRefresh?():void;empty?:boolean;emptyState?:ReactNode;
 collapsible?:boolean;defaultCollapsed?:boolean;footer?:ReactNode;children:ReactNode;className?:string
}
/** Every dashboard widget shares the same state machine: loading â†’ error â†’ empty â†’ populated. */
function DashboardWidgetBase({id,title,icon,description,size='md',actions,loading=false,error,onRetry,onRefresh,empty=false,emptyState,collapsible=false,defaultCollapsed=false,footer,children,className}:DashboardWidgetProps){
const [collapsed,setCollapsed]=useState(defaultCollapsed)
 const toggle=useCallback(()=>setCollapsed((current)=>!current),[])
 const titleId=useId()
 return <Card id={id} className={cx('dashboard-widget',`dashboard-widget--${size}`,collapsed&&'is-collapsed',className)} aria-labelledby={title?titleId:undefined} aria-busy={loading||undefined}>
   <div className="dashboard-widget__header">
    <div className="dashboard-widget__heading">
     {icon&&<span className="dashboard-widget__icon" aria-hidden="true"><Icon name={icon} size="sm"/></span>}
     <div>
      <Typography variant="h3" id={titleId} className="dashboard-widget__title">{title}</Typography>
     {description&&<p className="dashboard-widget__description">{description}</p>}
    </div>
   </div>
   <div className="dashboard-widget__tools">
    {actions}
    {onRefresh&&<IconButton icon="clock" label="بازخوانی" variant="ghost" size="sm" onClick={onRefresh}/>}
    {collapsible&&<IconButton icon={collapsed?'chevron':'collapse'} label={collapsed?'باز کردن':'جمع کردن'} variant="ghost" size="sm" aria-expanded={!collapsed} onClick={toggle}/>}
   </div>
  </div>
  {!collapsed&&<div className="dashboard-widget__body">
   {loading?<LoadingState variant="list" rows={3}/>
    :error?<ErrorState title="بارگذاری این بخش ممکن نیست" description={typeof error==='string'?error:undefined} onRetry={onRetry} compact/>
    :empty?(emptyState??<EmptyState variant="inline" title="داده‌ای برای نمایش وجود ندارد"/>)
    :children}
  </div>}
  {footer&&!collapsed&&<div className="dashboard-widget__footer">{footer}</div>}
 </Card>
}
export const DashboardWidget=memo(DashboardWidgetBase)
export interface QuickActionDefinition{id:string;title:string;description?:string;icon?:IconName;visible?:boolean;onSelect?():void}
/** Permission-aware shortcut tiles; visibility is decided by the caller, never inside the widget. */
export function QuickActions({actions,columns=3,title='اقدامات سریع'}:{actions:readonly QuickActionDefinition[];columns?:2|3|4;title?:string}){
 const visible=useMemo(()=>actions.filter((action)=>action.visible!==false),[actions])
 if(!visible.length)return null
 return <nav className="dashboard-quick-actions" aria-label={title}>
  <ul className={cx('dashboard-quick-actions__list',`dashboard-quick-actions__list--${columns}`)}>
   {visible.map((action)=><li key={action.id}>
    <button type="button" className="dashboard-quick-actions__item" onClick={action.onSelect}>
     {action.icon&&<span className="dashboard-quick-actions__icon" aria-hidden="true"><Icon name={action.icon} size="md"/></span>}
     <span className="dashboard-quick-actions__label">{action.title}</span>
     {action.description&&<span className="dashboard-quick-actions__description">{action.description}</span>}
    </button>
   </li>)}
  </ul>
 </nav>
}
export interface UpcomingEventItem{id:string;title:string;date:string;kind?:'MEETING'|'TASK'|'REPORT';meta?:ReactNode;tone?:'neutral'|'success'|'warning'|'danger'|'info'}
const dayBucket=(iso:string)=>{
 const target=new Date(iso);const today=new Date()
 const diff=Math.round((new Date(target.toDateString()).getTime()-new Date(today.toDateString()).getTime())/86400000)
 return diff<=0?'امروز':diff===1?'فردا':diff<=7?'این هفته':'آینده'
}
/** Chronological list grouped into today / tomorrow / this week buckets. */
export function UpcomingEvents({items,onSelect,emptyLabel='رویداد پیش‌رویی ثبت نشده است'}:{items:readonly UpcomingEventItem[];onSelect?(item:UpcomingEventItem):void;emptyLabel?:string}){
 const ordered=useMemo(()=>items.slice().sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()),[items])
 const groups=useMemo(()=>ordered.reduce<Record<string,UpcomingEventItem[]>>((accumulator,item)=>{
  const bucket=dayBucket(item.date);(accumulator[bucket]??=[]).push(item);return accumulator
 },{}),[ordered])
 if(!items.length)return <EmptyState variant="inline" title={emptyLabel}/>
 return <div className="dashboard-upcoming">
  {Object.entries(groups).map(([bucket,bucketItems])=><section key={bucket} className="dashboard-upcoming__group" aria-label={bucket}>
   <h4 className="dashboard-upcoming__bucket">{bucket}</h4>
   <ul className="dashboard-upcoming__list">
    {bucketItems.map((item)=>{const delta=new Date(item.date).getTime()-Date.now();const state=delta<0?{label:'سررسید شده',tone:'danger' as const}:delta<=86400000?{label:'نزدیک',tone:'warning' as const}:{label:'برنامه‌ریزی‌شده',tone:'info' as const};const kindLabel=item.kind==='TASK'?'وظیفه':item.kind==='REPORT'?'گزارش':'جلسه';return <li key={item.id}>
     <button type="button" className={cx('dashboard-upcoming__item',item.id===ordered[0]?.id&&'is-next')} onClick={()=>onSelect?.(item)}>
      <span className="dashboard-upcoming__time"><time dateTime={item.date}><strong>{formatPersianDate(item.date,{day:'numeric',month:'short'})}</strong><small>{formatPersianDate(item.date,{hour:'2-digit',minute:'2-digit'})}</small></time></span>
      <span className="dashboard-upcoming__body">
       <span className="dashboard-upcoming__eyebrow"><StatusBadge tone="neutral" label={kindLabel} size="sm"/><StatusBadge tone={item.tone??state.tone} label={state.label} size="sm" dot/></span>
       <span className="dashboard-upcoming__title">{item.title}</span>
       {item.meta&&<span className="dashboard-upcoming__meta">{item.meta}</span>}
      </span>
      <Icon name="chevron" size="xs" className="dashboard-upcoming__chevron" aria-hidden="true"/>
     </button>
    </li>})}
   </ul>
  </section>)}
 </div>
}
export interface NotificationSummaryItem{id:string;title:string;body:string;createdAt:string;priority:'LOW'|'NORMAL'|'HIGH';read:boolean}
/** Compact notification digest reusing StatusBadge tones for priority. */
export function NotificationSummary({items,unreadCount,onSelect,onViewAll}:{items:readonly NotificationSummaryItem[];unreadCount:number;onSelect?(item:NotificationSummaryItem):void;onViewAll?():void}){
 if(!items.length)return <EmptyState variant="inline" title="اعلان جدیدی ندارید"/>
 return <div className="dashboard-notifications">
  <p className="dashboard-notifications__summary">{unreadCount} اعلان خوانده‌نشده</p>
  <ul className="dashboard-notifications__list">
   {items.map((item)=><li key={item.id} className={cx('dashboard-notifications__item',!item.read&&'is-unread')}>
    <button type="button" onClick={()=>onSelect?.(item)}>
     <span className="dashboard-notifications__title">{item.title}</span>
     <span className="dashboard-notifications__body">{item.body}</span>
     <span className="dashboard-notifications__meta">
       <StatusBadge tone={item.priority==='HIGH'?'danger':item.priority==='NORMAL'?'info':'neutral'} label={item.priority==='HIGH'?'فوری':item.priority==='NORMAL'?'عادی':'کم‌اهمیت'} size="sm" dot/>
      <time dateTime={item.createdAt}>{formatRelativeTime(item.createdAt)}</time>
     </span>
    </button>
   </li>)}
  </ul>
  {onViewAll&&<Button variant="ghost" size="sm" onClick={onViewAll}>مشاهده همه اعلان‌ها</Button>}
 </div>
}
/** Personalization control surface: visibility toggles and ordering for the current dashboard. */
export function DashboardPersonalizationPanel({state}:{state:PersonalizationState}){
 return <div className="dashboard-personalization">
  <fieldset className="dashboard-personalization__appearance">
   <legend>ظاهر سامانه</legend>
   <label><span>حالت رنگ</span><select value={state.appearance.colorScheme} onChange={(event)=>state.updateAppearance({colorScheme:event.target.value as typeof state.appearance.colorScheme})}><option value="light">روشن</option><option value="dark">تاریک</option><option value="system">مطابق دستگاه</option></select></label>
   <label><span>تم</span><select value={state.appearance.theme} onChange={(event)=>state.updateAppearance({theme:event.target.value as typeof state.appearance.theme})}><option value="brand">آبی کیا گستر</option><option value="neutral">آبی خنثی</option></select></label>
   <label><span>فونت</span><select value={state.appearance.font} onChange={(event)=>state.updateAppearance({font:event.target.value as typeof state.appearance.font})}><option value="brand">فونت اصلی</option><option value="system">فونت دستگاه</option></select></label>
   <label><span>تراکم رابط</span><select value={state.appearance.density} onChange={(event)=>state.updateAppearance({density:event.target.value as typeof state.appearance.density})}><option value="comfortable">راحت</option><option value="compact">فشرده</option></select></label>
  </fieldset>
  <p className="dashboard-personalization__section-title">چیدمان کارت‌ها</p>
  <ul className="dashboard-personalization__list">
   {state.entries.map((entry,index)=><li key={entry.id} className="dashboard-personalization__item">
    <label className="dashboard-personalization__toggle">
     <input type="checkbox" checked={entry.visible} onChange={()=>state.toggleVisibility(entry.id)}/>
     <span>{entry.title}</span>
    </label>
    <span className="dashboard-personalization__controls">
     <IconButton icon="collapse" label={`انتقال ${entry.title} به بالا`} variant="ghost" size="sm" disabled={index===0} onClick={()=>state.move(entry.id,-1)}/>
     <IconButton icon="chevron" label={`انتقال ${entry.title} به پایین`} variant="ghost" size="sm" disabled={index===state.entries.length-1} onClick={()=>state.move(entry.id,1)}/>
    </span>
   </li>)}
  </ul>
  <Button variant="ghost" size="sm" onClick={state.reset}>بازنشانی چیدمان</Button>
 </div>
}

