import {memo,useMemo,type ReactNode} from 'react'
import {Avatar,BarChart,DonutChart,EmptyState,Icon,KPIGrid,KPIWidget,LinearProgress,LineChart,MultiSeriesLineChart,StatusBadge,Table,Tag,type ChartPoint,type IconName,type StatusTone,type TableColumn,type TrendSeries} from '../ui'
import {formatPersianDate,formatRelativeTime} from '../../core/utils'
import {DashboardWidget,type WidgetSize} from './DashboardShell'
/** Declarative KPI definition so each dashboard only supplies data, never layout. */
export interface KpiDefinition{id:string;title:string;value:number;previousValue?:number;icon?:IconName;tone?:'default'|'primary'|'success'|'warning'|'danger'|'info';format?:'number'|'compact'|'percent'|'currency';tooltip?:string;invertedTrend?:boolean;onActivate?():void}
export interface KpiSummaryProps{items:readonly KpiDefinition[];columns?:2|3|4|6;loading?:boolean}
function KpiSummaryBase({items,columns=4,loading=false}:KpiSummaryProps){
 return <KPIGrid columns={columns}>
  {items.map((item)=><KPIWidget
   key={item.id}
   title={item.title}
   value={item.value}
   previousValue={item.previousValue}
   icon={item.icon}
   tone={item.tone}
   format={item.format}
   tooltip={item.tooltip}
   invertedTrend={item.invertedTrend}
   loading={loading}
   onActivate={item.onActivate}
   actionLabel={item.onActivate?`مشاهده جزئیات ${item.title}`:undefined}/>)}
 </KPIGrid>
}
export const KpiSummary=memo(KpiSummaryBase)
export interface DepartmentSummaryRow{id:string;name:string;managerName:string;members:number;activeTasks:number;pendingReports:number;meetings:number;performance:number}
/** Department comparison table used by the executive dashboard. */
export function DepartmentOverviewWidget({rows,loading=false,error,onRetry,onOpenDepartment}:{rows:readonly DepartmentSummaryRow[];loading?:boolean;error?:ReactNode;onRetry?():void;onOpenDepartment?(row:DepartmentSummaryRow):void}){
 const columns=useMemo<readonly TableColumn<DepartmentSummaryRow>[]>(()=>[
  {key:'name',header:'واحد سازمانی',cell:(row)=><span className="module-cell__primary">{row.name}</span>},
  {key:'manager',header:'مدیر',cell:(row)=>row.managerName,hideBelow:'md'},
  {key:'members',header:'اعضا',align:'center',cell:(row)=>row.members,hideBelow:'sm'},
  {key:'activeTasks',header:'وظایف فعال',align:'center',cell:(row)=>row.activeTasks},
  {key:'pendingReports',header:'گزارش در انتظار',align:'center',cell:(row)=>row.pendingReports,hideBelow:'md'},
  {key:'meetings',header:'جلسات',align:'center',cell:(row)=>row.meetings,hideBelow:'lg'},
  {key:'performance',header:'عملکرد',cell:(row)=><LinearProgress value={row.performance} tone={row.performance>=70?'success':row.performance>=40?'warning':'danger'} label={`عملکرد ${row.name}`} showValue/>},
 ],[])
 return <DashboardWidget title="نمای واحدهای سازمانی" icon="building" size="full" loading={loading} error={error} onRetry={onRetry} empty={!rows.length}>
  <Table columns={columns} rows={rows} rowKey={(row)=>row.id} caption="مقایسه عملکرد واحدهای سازمانی" zebra stickyHeader onRowActivate={onOpenDepartment}/>
 </DashboardWidget>
}
export interface TeamMemberRow{id:string;name:string;avatar?:string;positionTitle:string;active:number;overdue:number;completed:number;load:number}
/** Team workload widget for managers. */
export function TeamSummaryWidget({rows,loading=false,error,onRetry,onOpenMember}:{rows:readonly TeamMemberRow[];loading?:boolean;error?:ReactNode;onRetry?():void;onOpenMember?(row:TeamMemberRow):void}){
 const columns=useMemo<readonly TableColumn<TeamMemberRow>[]>(()=>[
  {key:'member',header:'همکار',cell:(row)=><span className="module-person"><Avatar name={row.name} alt={row.name} src={row.avatar} size="sm"/><span className="module-person__body"><span className="module-person__name">{row.name}</span><span className="module-person__meta">{row.positionTitle}</span></span></span>},
  {key:'active',header:'وظایف فعال',align:'center',cell:(row)=>row.active},
  {key:'overdue',header:'تأخیر',align:'center',cell:(row)=>row.overdue?<StatusBadge tone="danger" label={String(row.overdue)} size="sm"/>:'—'},
  {key:'completed',header:'انجام‌شده',align:'center',cell:(row)=>row.completed,hideBelow:'md'},
  {key:'load',header:'بار کاری',cell:(row)=><LinearProgress value={row.load} tone={row.load>=75?'danger':row.load>=50?'warning':'success'} label={`بار کاری ${row.name}`} showValue/>},
 ],[])
 return <DashboardWidget title="ظرفیت و بار کاری تیم" icon="users" size="full" loading={loading} error={error} onRetry={onRetry} empty={!rows.length}>

  <Table columns={columns} rows={rows} rowKey={(row)=>row.id} caption="بار کاری اعضای تیم" zebra onRowActivate={onOpenMember}/>
 </DashboardWidget>
}
export interface CalendarPreviewItem{id:string;title:string;startTime:string;location:string;statusLabel:string;tone?:StatusTone}
/** Compact agenda preview for the coming meetings. */
export function CalendarPreviewWidget({items,title='پیش‌نمای تقویم',loading=false,error,onRetry,onSelect,onOpenCalendar}:{items:readonly CalendarPreviewItem[];title?:string;loading?:boolean;error?:ReactNode;onRetry?():void;onSelect?(item:CalendarPreviewItem):void;onOpenCalendar?():void}){
 return <DashboardWidget title={title} icon="calendar" size="lg" loading={loading} error={error} onRetry={onRetry} empty={!items.length} emptyState={<EmptyState variant="inline" title="جلسه‌ای در تقویم ثبت نشده است"/>} footer={onOpenCalendar&&<button type="button" className="dashboard-widget__link" onClick={onOpenCalendar}>مشاهده تقویم کامل</button>}>
  <ul className="dashboard-agenda">
   {items.map((item)=><li key={item.id}>
    <button type="button" className="dashboard-agenda__item" onClick={()=>onSelect?.(item)}>
     <time className="dashboard-agenda__time" dateTime={item.startTime}>{formatPersianDate(item.startTime,{hour:'2-digit',minute:'2-digit'})}</time>
     <span className="dashboard-agenda__body">
      <span className="dashboard-agenda__title">{item.title}</span>
      <span className="dashboard-agenda__meta">{item.location}</span>
     </span>
     <StatusBadge tone={item.tone??'info'} label={item.statusLabel} size="sm"/>
    </button>
   </li>)}
  </ul>
 </DashboardWidget>
}
export interface DeadlineItem{id:string;title:string;deadline:string;assigneeName:string;overdue:boolean}
/** Upcoming deadlines widget, shared by manager and employee dashboards. */
export function DeadlinesWidget({items,loading=false,error,onRetry,onSelect,size='md'}:{items:readonly DeadlineItem[];loading?:boolean;error?:ReactNode;onRetry?():void;onSelect?(item:DeadlineItem):void;size?:WidgetSize}){
 return <DashboardWidget title="مهلت‌های نزدیک" icon="clock" size={size} loading={loading} error={error} onRetry={onRetry} empty={!items.length} emptyState={<EmptyState variant="inline" title="مهلت نزدیکی ثبت نشده است"/>}>

  <ul className="dashboard-deadlines">
   {items.map((item)=><li key={item.id}>
    <button type="button" className="dashboard-deadlines__item" onClick={()=>onSelect?.(item)}>
     <span className="dashboard-deadlines__title">{item.title}</span>
     <span className="dashboard-deadlines__meta">
      <span>{item.assigneeName}</span>
      <StatusBadge tone={item.overdue?'danger':'warning'} label={formatRelativeTime(item.deadline)} size="sm" dot/>
     </span>
    </button>
   </li>)}
  </ul>
 </DashboardWidget>
}
export interface RecentFileItem{id:string;name:string;uploaderName:string;uploadedAt:string;kind:string}
/** Recently uploaded files widget. */
export function RecentFilesWidget({items,loading=false,error,onRetry,onSelect}:{items:readonly RecentFileItem[];loading?:boolean;error?:ReactNode;onRetry?():void;onSelect?(item:RecentFileItem):void}){
 return <DashboardWidget title="فایل‌های اخیر" icon="folder" size="md" loading={loading} error={error} onRetry={onRetry} empty={!items.length} emptyState={<EmptyState variant="inline" title="فایلی بارگذاری نشده است"/>}>
  <ul className="dashboard-files">
   {items.map((item)=><li key={item.id}>
    <button type="button" className="dashboard-files__item" onClick={()=>onSelect?.(item)}>
     <Tag tone="info" size="sm">{item.kind}</Tag>
     <span className="dashboard-files__name">{item.name}</span>
     <span className="dashboard-files__meta">{item.uploaderName} · {formatRelativeTime(item.uploadedAt)}</span>
    </button>
   </li>)}
  </ul>
 </DashboardWidget>
}
export interface ApprovalItem{id:string;title:string;requesterName:string;createdAt:string;statusLabel:string;tone?:StatusTone}
/** Pending approvals queue widget. */
export function PendingApprovalsWidget({items,title='در انتظار تأیید',loading=false,error,onRetry,onSelect}:{items:readonly ApprovalItem[];title?:string;loading?:boolean;error?:ReactNode;onRetry?():void;onSelect?(item:ApprovalItem):void}){
 return <DashboardWidget title={title} icon="shield" size="lg" loading={loading} error={error} onRetry={onRetry} empty={!items.length} emptyState={<EmptyState variant="inline" title="موردی در انتظار تأیید نیست"/>}>
  <ul className="dashboard-approvals">
   {items.map((item)=><li key={item.id}>
    <button type="button" className="dashboard-approvals__item" onClick={()=>onSelect?.(item)}>
     <span className="dashboard-approvals__title">{item.title}</span>
     <span className="dashboard-approvals__meta">{item.requesterName} · {formatRelativeTime(item.createdAt)}</span>
     <StatusBadge tone={item.tone??'warning'} label={item.statusLabel} size="sm"/>
    </button>
   </li>)}
  </ul>
 </DashboardWidget>
}
export interface StatBreakdownItem{id:string;label:string;value:number;tone?:StatusTone}
export type StatBreakdownPresentation='default'|'operations'|'personal'
export type StatBreakdownCategory='minutes'|'resolutions'|'tasks'|'requests'|'reports'
/** Simple statistics breakdown used for report/request/task status summaries. */
export function StatBreakdownWidget({title,icon='chart',items,loading=false,error,onRetry,onSelect,size='md',presentation='default',category}:{title:string;icon?:IconName;items:readonly StatBreakdownItem[];loading?:boolean;error?:ReactNode;onRetry?():void;onSelect?(item:StatBreakdownItem):void;size?:WidgetSize;presentation?:StatBreakdownPresentation;category?:StatBreakdownCategory}){
 const presentationClass=presentation==='operations'?'dashboard-stat-workspace':presentation==='personal'?'dashboard-personal-status':undefined
 const categoryClass=category&&presentationClass?`${presentationClass}--${category}`:undefined
 const className=[presentationClass,categoryClass].filter(Boolean).join(' ')||undefined
 return <DashboardWidget title={title} icon={icon} size={size} loading={loading} error={error} onRetry={onRetry} empty={!items.length} className={className}>
  <ul className="dashboard-breakdown">
   {items.map((item)=><li key={item.id}>
    <button type="button" className="dashboard-breakdown__item" data-tone={item.tone??'neutral'} onClick={()=>onSelect?.(item)} disabled={!onSelect}>
     <span className="dashboard-breakdown__value">{item.value}</span>
     <span className="dashboard-breakdown__label">{item.label}</span>
     {presentation!=='default'&&<Icon name="chevron" size="xs" className="dashboard-breakdown__affordance" aria-hidden="true"/>}
    </button>
   </li>)}
  </ul>
 </DashboardWidget>
}
export type DashboardChartKind='bar'|'line'|'area'|'donut'
/** Chart widget wrapper: keeps chart choice declarative and accessible. */
export function ChartWidget({title,description,kind='bar',data,trendSeries,loading=false,error,onRetry,size='lg',valueSuffix,height}:{title:string;description?:string;kind?:DashboardChartKind;data:readonly ChartPoint[];trendSeries?:readonly TrendSeries[];loading?:boolean;error?:ReactNode;onRetry?():void;size?:WidgetSize;valueSuffix?:string;height?:number}){
 return <DashboardWidget title={title} icon="chart" description={description} size={size} loading={loading} error={error} onRetry={onRetry} empty={trendSeries?!trendSeries.length:!data.length}>
  {trendSeries?<MultiSeriesLineChart title={title} description={description} series={trendSeries} unit="تعداد رخداد" height={height}/>
   :kind==='donut'?<DonutChart data={data} title={title} valueSuffix={valueSuffix} height={height}/>
   :kind==='bar'?<BarChart data={data} title={title} valueSuffix={valueSuffix} height={height}/>
   :<LineChart data={data} title={title} area={kind==='area'} valueSuffix={valueSuffix} height={height}/>}
 </DashboardWidget>
}

export function ActivityTrendWidget({series,loading=false,error,onRetry}:{series:readonly TrendSeries[];loading?:boolean;error?:ReactNode;onRetry?():void}){
 const empty=!series.length||series.every((item)=>item.data.every((point)=>point.value===0))
 return <DashboardWidget title="روند فعالیت سازمان" description="شش ماه اخیر بر پایه شاخص‌های کلیدی" icon="chart" size="lg" loading={loading} error={error} onRetry={onRetry} empty={empty}>
  <MultiSeriesLineChart title="روند فعالیت سازمان" description="مقایسه شاخص‌های عملکردی سازمان" unit="تعداد رخداد" series={series}/>
 </DashboardWidget>
}

/** Compact bullet-style comparison: exact values remain visible and the bars only aid scanning. */
export function DepartmentPerformanceWidget({rows,loading=false,onSelect}:{rows:readonly DepartmentSummaryRow[];loading?:boolean;onSelect?(row:DepartmentSummaryRow):void}){
 const ordered=useMemo(()=>rows.slice().sort((a,b)=>b.performance-a.performance),[rows])
 return <DashboardWidget title="عملکرد واحدها" description="نرخ تکمیل وظایف هر واحد" icon="building" size="md" loading={loading} empty={!ordered.length} className="department-performance-widget">
  <ol className="department-performance-list">{ordered.map((row,index)=><li key={row.id}><button type="button" onClick={()=>onSelect?.(row)} disabled={!onSelect}><span className="department-performance-list__rank">{index+1}</span><span className="department-performance-list__body"><span><strong>{row.name}</strong><b>{row.performance}٪</b></span><span className="department-performance-list__track"><i style={{inlineSize:`${row.performance}%`}}/></span><small>{row.activeTasks} وظیفه فعال · {row.members} عضو</small></span></button></li>)}</ol>
 </DashboardWidget>
}
