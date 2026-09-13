/**
 * Phase 11 verification: data display, overlay/feedback, dashboards and the meetings module.
 * Behaviour-focused assertions (semantics, ARIA, RTL, state machines) — no snapshots.
 */
import type {ReactNode} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {
 ActivityFeed,BarChart,BottomSheet,CircularProgress,ConfirmDialog,ContextMenu,DataCard,DataGrid,DescriptionList,Dialog,DonutChart,
 Drawer,Dropdown,EmptyState,ErrorState,FilterBar,KPIGrid,KPIWidget,LinearProgress,LineChart,LoadingOverlay,LoadingState,Modal,
 NotificationBanner,Pagination,Popover,PropertyList,SearchSummary,Snackbar,StatCard,Statistic,StatusBadge,StepProgress,Table,Tag,
 Timeline,ToastViewport,Toolbar,Tooltip,UploadProgressList,overlayStack,toastStore,TOAST_MAX_VISIBLE,
 type ActivityItemData,type DataGridColumn,type TableColumn,type TimelineItemData,
} from '../src/components/ui'
import {
 CalendarPreviewWidget,ChartWidget,DashboardGrid,DashboardHeader,DashboardWidget,DeadlinesWidget,DepartmentOverviewWidget,
 KpiSummary,NotificationSummary,PendingApprovalsWidget,QuickActions,RecentActivityWidget,RecentFilesWidget,StatBreakdownWidget,
 TeamSummaryWidget,UpcomingEvents,
} from '../src/components/dashboard'
import {CeoDashboardPage,DepartmentManagerDashboardPage,EmployeeDashboardPage,SecretaryDashboardPage} from '../src/features/dashboard'
import {SettingsPage} from '../src/features/settings'
import {PersistentQuickAction} from '../src/app/layout/PersistentQuickAction'
import {getQuickActions,quickActionsByRole} from '../src/app/navigation/quickActionConfig'
import {roleCapabilities} from '../src/features/auth/utils/roleCapabilities'
import type {AuthorizedPrincipal} from '../src/security'
import {
 AgendaPanel,AttendanceSummaryPanel,CreateMeetingPage,DecisionsPanel,MeetingCalendarPage,MeetingDetailsPage,
 MeetingRequestsPage,MeetingTasksPanel,MeetingWorkspacePage,MeetingsListPage,MinutesPanel,ParticipantsPanel,
} from '../src/features/meetings'
import {
 activityViews,demoDataset,demoUserByRole,departmentOverview,meetingRequestViews,meetingViews,notificationsForUser,
 organizationMetrics,upcomingEvents,
} from '../src/demo'

const failures:string[]=[]
const assert=(condition:unknown,message:string)=>{if(!condition)failures.push(message)}
const html=(node:ReactNode)=>renderToStaticMarkup(<div dir="rtl">{node}</div>)
const noop=()=>undefined

/* ---------------------------------------------------------------- Demo seed data */
const {users,departments,positions,meetings,meetingRequests,tasks,reports,requests,notifications,files,activities,audit}=demoDataset
assert(users.filter((user)=>user.role==='CEO').length===1,'Demo data must contain exactly one CEO')
assert(users.filter((user)=>user.role==='DEPARTMENT_MANAGER').length>=3,'Demo data must contain at least 3 department managers')
assert(users.filter((user)=>user.role==='SECRETARY').length>=2,'Demo data must contain at least 2 secretaries')
assert(users.filter((user)=>user.role==='EMPLOYEE').length>=15,'Demo data must contain at least 15 employees')
assert(departments.length>=5&&positions.length>=5,'Demo data must contain departments and positions')
assert(meetings.length>0&&meetingRequests.length>0,'Demo data must contain meetings and meeting requests')
assert(tasks.length>0&&reports.length>0&&requests.length>0,'Demo data must contain tasks, reports and requests')
assert(notifications.length>0&&files.length>0,'Demo data must contain notifications and files')
assert(activities.length>0&&audit.length>0,'Demo data must contain activity logs and audit records')
assert(users.every((user)=>/[\u0600-\u06FF]/.test(user.fullName)),'Demo users must use Persian names')
assert(users.every((user)=>!user.departmentId||departments.some((department)=>department.id===user.departmentId)),'Every demo user must reference a real department')
assert(meetings.every((meeting)=>users.some((user)=>user.id===meeting.organizerId)),'Every demo meeting must reference a real organizer')

/* -------------------------------------------------------------- Table */
interface Row{id:string;name:string;score:number}
const rows:readonly Row[]=Array.from({length:5},(_,index)=>({id:`r${index}`,name:`ردیف شماره ${index+1}`,score:index*10}))
const columns:readonly TableColumn<Row>[]=[
 {key:'name',header:'نام',sortable:true,cell:(row)=>row.name},
 {key:'score',header:'امتیاز',sortable:true,align:'center',cell:(row)=>row.score},
]
const tableMarkup=html(<Table
 columns={columns} rows={rows} rowKey={(row)=>row.id} caption="جدول آزمایشی"
 sort={{key:'name',direction:'asc'}} onSortChange={noop}
 selectable selectedKeys={['r1']} onSelectionChange={noop}
 stickyHeader stickyFirstColumn zebra
 renderExpanded={(row)=><span>{row.name}</span>}
 rowActions={()=><button type="button">اقدام</button>}
 pagination={<Pagination page={1} pageSize={10} total={40} onPageChange={noop} onPageSizeChange={noop}/>}/>)
assert(tableMarkup.includes('<caption'),'Table must expose an accessible caption')
assert(tableMarkup.includes('aria-sort="ascending"'),'Sorted column must expose aria-sort')
assert(tableMarkup.includes('scope="col"'),'Table headers must expose column scope')
assert(tableMarkup.includes('aria-selected="true"'),'Selected rows must expose aria-selected')
assert(tableMarkup.includes('aria-expanded'),'Expandable rows must expose aria-expanded')
assert(tableMarkup.includes('ui-table--zebra'),'Zebra mode must apply its modifier class')
assert(tableMarkup.includes('ui-table--sticky-header')&&tableMarkup.includes('ui-table-scroll--sticky-column'),'Sticky header/column modifiers must be applied')
assert(html(<Table columns={columns} rows={[]} rowKey={(row)=>row.id} caption="خالی"/>).includes('ui-empty'),'Table must render its empty state')
assert(html(<Table columns={columns} rows={[]} rowKey={(row)=>row.id} caption="بارگذاری" loading/>).includes('ui-skel--table'),'Loading table must render the shared table skeleton')
assert(html(<Table columns={columns} rows={[]} rowKey={(row)=>row.id} caption="خطا" error="خطا در بارگذاری" onRetry={noop}/>).includes('role="alert"'),'Table must render the shared error state')

/* -------------------------------------------------------------- DataGrid */
const gridColumns:readonly DataGridColumn<Row>[]=[
 {key:'name',header:'نام',cell:(row)=>row.name,sortValue:(row)=>row.name,hideable:true},
 {key:'score',header:'امتیاز',cell:(row)=>row.score,sortValue:(row)=>row.score,align:'center'},
]
const manyRows:readonly Row[]=Array.from({length:400},(_,index)=>({id:`g${index}`,name:`سطر ${index+1}`,score:index}))
const gridMarkup=html(<DataGrid columns={gridColumns} rows={manyRows} rowKey={(row)=>row.id} caption="گرید آزمایشی" selectable selectedKeys={['g1']} onSelectionChange={noop} sort={{key:'score',direction:'desc'}} onSortChange={noop}/>)
assert(gridMarkup.includes('role="grid"'),'DataGrid must expose role="grid"')
assert(gridMarkup.includes('role="row"')&&gridMarkup.includes('role="gridcell"'),'DataGrid must expose row/cell semantics')
assert(gridMarkup.includes('aria-rowcount'),'DataGrid must expose aria-rowcount')
assert(gridMarkup.includes('aria-colcount'),'DataGrid must expose aria-colcount')
assert(gridMarkup.includes('aria-sort="descending"'),'DataGrid must expose the active sort direction')
assert((gridMarkup.match(/role="row"/g)??[]).length<manyRows.length,'DataGrid must virtualize large datasets')
assert(html(<DataGrid columns={gridColumns} rows={[]} rowKey={(row)=>row.id} caption="خالی"/>).includes('ui-empty'),'DataGrid must render an empty state')

/* -------------------------------------------------------------- Pagination */
const paginationMarkup=html(<Pagination page={3} pageSize={20} total={240} onPageChange={noop} onPageSizeChange={noop} label="صفحه‌بندی"/>)
assert(paginationMarkup.includes('aria-current="page"'),'Pagination must mark the current page')
assert(paginationMarkup.includes('<nav'),'Pagination must use navigation semantics')
assert(paginationMarkup.includes('aria-label="صفحه‌بندی"'),'Pagination must expose its label')
assert(paginationMarkup.includes('<select'),'Pagination must render the page-size selector')

/* -------------------------------------------------------------- Filters / toolbar */
const filterMarkup=html(<FilterBar
 searchValue="مدیر" onSearchChange={noop}
 activeFilters={[{key:'status',label:'وضعیت',value:'تأییدشده',onRemove:noop}]}
 advancedFilters={<span>پیشرفته</span>} onResetAll={noop}/>)
assert(filterMarkup.includes('role="search"'),'FilterBar must expose search landmark semantics')
assert(filterMarkup.includes('تأییدشده'),'FilterBar must render active filter chips')
assert(filterMarkup.includes('ui-tag__remove'),'Active filters must be individually removable')
assert(html(<SearchSummary total={12} keyword="جلسه" activeFilters={[{key:'a',label:'واحد',value:'مالی',onRemove:noop}]} onClear={noop}/>).includes('role="status"'),'SearchSummary must announce results politely')
assert(html(<Toolbar title="عنوان" subtitle="زیرعنوان" actions={<button type="button">اقدام</button>}/>).includes('زیرعنوان'),'Toolbar must render its subtitle')

/* -------------------------------------------------------------- Cards, KPI, statistics */
assert(html(<DataCard title="کارت" value="۱۲" icon="calendar" onSelect={noop} selectable/>).includes('ui-data-card--interactive'),'Selectable DataCard must be interactive')
assert(html(<DataCard title="کارت" loading/>).includes('ui-skel'),'Loading DataCard must render a skeleton')
assert(html(<StatCard label="آمار" value={42} tone="success"/>).includes('آمار'),'StatCard must render its label')
const kpiMarkup=html(<KPIGrid columns={4}><KPIWidget title="وظایف" value={120} previousValue={100} icon="check-square" tone="primary" onActivate={noop} actionLabel="مشاهده وظایف" tooltip="راهنما"/></KPIGrid>)
assert(kpiMarkup.includes('aria-label="مشاهده وظایف"'),'Clickable KPI must expose an accessible action label')
assert(kpiMarkup.includes('۱۲۰'),'KPI value must be formatted with Persian digits')
assert(kpiMarkup.includes('ui-trend--positive'),'KPI must render its trend indicator')
assert(html(<KPIWidget title="در حال بارگذاری" value={0} loading/>).includes('ui-kpi--loading'),'Loading KPI must render its skeleton')
assert(html(<Statistic value={1250000} format="currency"/>).includes('ریال'),'Currency statistic must include a currency unit')
assert(html(<Statistic value={42} format="percent"/>).includes('٪'),'Percent statistic must include a percent sign')
assert(html(<Statistic value={12500} format="compact"/>).includes('هزار'),'Compact statistic must abbreviate large values')
assert(html(<Statistic value={1234} digits="latin"/>).includes('1,234'),'Latin digit mode must render latin digits')

/* -------------------------------------------------------------- Timeline & activity */
const timelineItems:readonly TimelineItemData[]=[{
 id:'t1',timestamp:new Date().toISOString(),title:'ایجاد جلسه',actor:{name:'سارا محمدی'},description:'جلسه ایجاد شد',
 icon:'calendar',iconTone:'success',attachmentsCount:2,typeLabel:'جلسه',expandedContent:<span>جزئیات رویداد</span>,
}]
const timelineMarkup=html(<Timeline items={timelineItems}/>)
assert(timelineMarkup.includes('<ol'),'Timeline must use ordered list semantics')
assert(timelineMarkup.includes('<time'),'Timeline must render machine-readable timestamps')
assert(timelineMarkup.includes('aria-expanded'),'Timeline details must be expandable')
assert(timelineMarkup.includes('پیوست'),'Timeline must show the attachments indicator')
assert(html(<Timeline items={[]}/>).includes('ui-empty'),'Timeline must render an empty state')
assert(html(<Timeline items={[]} loading/>).includes('ui-skel'),'Timeline must render a loading skeleton')
const activityItems:readonly ActivityItemData[]=[{id:'a1',actor:{id:'u1',name:'رضا کریمی'},action:'ثبت کرد',target:'گزارش ماهانه',timestamp:new Date().toISOString()}]
assert(html(<ActivityFeed items={activityItems}/>).includes('رضا کریمی'),'ActivityFeed must render the actor')
assert(html(<ActivityFeed items={[]} loading/>).includes('ui-skel'),'Loading ActivityFeed must render a skeleton')
assert(html(<ActivityFeed items={[]}/>).includes('ui-empty'),'ActivityFeed must render an empty state')

/* -------------------------------------------------------------- Badges, tags, lists, states */
for(const tone of ['success','warning','danger','info','neutral'] as const){
 assert(html(<StatusBadge tone={tone} label={tone}/>).includes(`ui-status-badge--${tone}`),`StatusBadge must apply the ${tone} tone token`)
}
assert(html(<Tag tone="info" onRemove={noop}>برچسب</Tag>).includes('ui-tag__remove'),'Removable tag must render a remove control')
assert(html(<Tag tone="info" onSelect={noop} selected>فیلتر</Tag>).includes('is-selected'),'Filter tag must expose its selected state')
assert(html(<PropertyList items={[{key:'a',label:'نام',value:'علی',icon:'user'},{key:'b',label:'توضیح',value:'متن طولانی',multiline:true}]}/>).includes('نام'),'PropertyList must render labels')
const descriptionMarkup=html(<DescriptionList items={[{key:'a',term:'واحد',description:'مالی'}]} layout="horizontal"/>)
assert(descriptionMarkup.includes('<dl')&&descriptionMarkup.includes('<dt')&&descriptionMarkup.includes('<dd'),'DescriptionList must use dl/dt/dd semantics')
assert(html(<EmptyState title="خالی" description="توضیح" primaryAction={<button type="button">افزودن</button>}/>).includes('افزودن'),'EmptyState must render its primary action')
assert(html(<ErrorState title="خطا" onRetry={noop}/>).includes('role="alert"'),'ErrorState must expose an alert role')
for(const variant of ['table','card','dashboard','list','timeline'] as const){
 assert(html(<LoadingState variant={variant}/>).includes('ui-skel'),`LoadingState "${variant}" must render a skeleton`)
}
assert(html(<LoadingState variant="table"/>).includes('aria-hidden="true"'),'Skeletons must be hidden from assistive technology')

/* -------------------------------------------------------------- Charts */
const series=[{label:'فروردین',value:12},{label:'اردیبهشت',value:24},{label:'خرداد',value:18}]
for(const chart of [<BarChart key="b" data={series} title="نمودار میله‌ای"/>,<LineChart key="l" data={series} title="نمودار خطی" area/>,<DonutChart key="d" data={series} title="نمودار دایره‌ای"/>]){
 const markup=html(chart)
 assert(markup.includes('<figure')&&markup.includes('<figcaption'),'Charts must use figure/figcaption semantics')
 assert(markup.includes('<table'),'Charts must provide an accessible data table')
 assert(markup.includes('role="img"')||markup.includes('aria-label'),'Charts must expose an accessible description')
}
assert(html(<BarChart data={[]} title="خالی"/>).includes('ui-empty'),'Charts must render an empty state')

/* -------------------------------------------------------------- Progress */
assert(html(<LinearProgress value={40} label="پیشرفت"/>).includes('role="progressbar"'),'LinearProgress must expose progressbar role')
assert(html(<LinearProgress value={40} label="پیشرفت"/>).includes('aria-valuenow="40"'),'LinearProgress must expose aria-valuenow')
assert(html(<LinearProgress indeterminate label="نامشخص"/>).includes('is-indeterminate'),'Indeterminate progress must apply its modifier')
assert(html(<CircularProgress value={60} label="دایره‌ای"/>).includes('role="progressbar"'),'CircularProgress must expose progressbar role')
assert(html(<StepProgress steps={[{id:'s1',label:'گام یک'},{id:'s2',label:'گام دو'}]} activeIndex={1}/>).includes('گام دو'),'StepProgress must render every step')
assert(html(<StepProgress steps={[{id:'s1',label:'گام یک'},{id:'s2',label:'گام دو'}]} activeIndex={1}/>).includes('aria-current="step"'),'StepProgress must mark the active step')
assert(html(<UploadProgressList items={[{id:'u1',name:'file.pdf',progress:55,status:'UPLOADING',sizeLabel:'۱ مگابایت'}]}/>).includes('role="progressbar"'),'UploadProgress must expose progressbar role')

/* -------------------------------------------------------------- Overlays */
const modalMarkup=html(<Modal open title="عنوان مودال" onClose={noop} actions={<button type="button">تأیید</button>}>محتوا</Modal>)
assert(modalMarkup.includes('role="dialog"'),'Modal must expose role="dialog"')
assert(modalMarkup.includes('aria-modal="true"'),'Modal must expose aria-modal')
assert(modalMarkup.includes('aria-labelledby'),'Modal must be labelled by its title')
assert(html(<Modal open={false} title="بسته" onClose={noop}>محتوا</Modal>)==='<div dir="rtl"></div>','Closed modal must not mount content')
assert(html(<Modal open title="بارگذاری" onClose={noop} loading>محتوا</Modal>).includes('aria-busy="true"'),'Loading modal must expose aria-busy')
for(const size of ['sm','md','lg','fullscreen'] as const){
 assert(html(<Modal open size={size} title="اندازه" onClose={noop}>محتوا</Modal>).includes(`ui-modal--${size}`),`Modal size "${size}" must apply its modifier`)
}
for(const tone of ['info','success','warning','error'] as const){
 assert(html(<Dialog open tone={tone} title="گفت‌وگو" onClose={noop}>متن</Dialog>).includes(`ui-dialog--${tone}`),`Dialog tone "${tone}" must apply its modifier`)
}
const confirmMarkup=html(<ConfirmDialog open title="حذف رکورد" description="آیا مطمئن هستید؟" destructive confirmLabel="حذف" onConfirm={noop} onCancel={noop}/>)
assert(confirmMarkup.includes('role="alertdialog"'),'Destructive ConfirmDialog must use alertdialog role')
assert(confirmMarkup.includes('حذف'),'ConfirmDialog must render its confirm label')
for(const side of ['start','end','bottom','fullscreen'] as const){
 assert(html(<Drawer open side={side} title="کشو" onClose={noop}>محتوا</Drawer>).includes(`ui-drawer--${side}`),`Drawer side "${side}" must apply its modifier`)
}
assert(!html(<Drawer open persistent title="ثابت" onClose={noop}>محتوا</Drawer>).includes('aria-modal="true"'),'Persistent drawer must not be modal')
assert(html(<BottomSheet open title="برگه" onClose={noop}>محتوا</BottomSheet>).includes('role="dialog"'),'BottomSheet must expose dialog semantics')
assert(html(<Popover content={<span>محتوای پاپ‌اور</span>}><button type="button">باز کن</button></Popover>).includes('aria-expanded="false"'),'Popover trigger must expose its expanded state')
assert(html(<Tooltip content="راهنما"><button type="button">دکمه</button></Tooltip>).includes('aria-describedby'),'Tooltip must describe its trigger')
const dropdownMarkup=html(<Dropdown label="منو" items={[{id:'i1',label:'مورد یک'},{id:'i2',label:'مورد دو',disabled:true,separatorBefore:true}]}/>)
assert(dropdownMarkup.includes('aria-haspopup="menu"'),'Dropdown trigger must expose a menu popup')
assert(dropdownMarkup.includes('aria-expanded="false"'),'Dropdown must expose its collapsed state')
assert(html(<ContextMenu items={[{id:'c1',label:'کپی'}]}><span>ناحیه</span></ContextMenu>).includes('ناحیه'),'ContextMenu must render its trigger area')
toastStore.clear()
const ovenToastId=toastStore.push({title:'نمونه',tone:'info'})
assert(html(<ToastViewport/>).includes('aria-live'),'Toast viewport must announce when toasts are present')
toastStore.dismiss(ovenToastId)
assert(html(<Snackbar messages={[{id:'s1',message:'ذخیره شد',actionLabel:'بازگردانی',onAction:noop}]} onDismiss={noop}/>).includes('بازگردانی'),'Snackbar must render its action')
for(const tone of ['success','warning','error','info'] as const){
 assert(html(<NotificationBanner tone={tone} title="پیام" dismissible onDismiss={noop}/>).includes(`ui-banner--${tone}`),`NotificationBanner tone "${tone}" must apply its modifier`)
}
assert(html(<LoadingOverlay open label="در حال بارگذاری"/>).includes('role="status"'),'LoadingOverlay must announce its state')

/* -------------------------------------------------------- Overlay manager & toast queue */
overlayStack.push('overlay-a');overlayStack.push('overlay-b')
assert(overlayStack.isTop('overlay-b'),'Overlay manager must track the topmost overlay')
assert(overlayStack.indexOf('overlay-b')>overlayStack.indexOf('overlay-a'),'Overlay manager must preserve stacking order')
overlayStack.remove('overlay-b');overlayStack.remove('overlay-a')
assert(overlayStack.size()===0,'Overlay manager must release overlays on unmount')

toastStore.clear()
const toastId=toastStore.push({title:'ذخیره شد',tone:'success'})
assert(toastStore.all().length===1,'Toast queue must accept messages')
toastStore.push({title:'ذخیره شد',tone:'success'})
assert(toastStore.all().length===1,'Toast queue must de-duplicate identical messages')
toastStore.dismiss(toastId)
assert(toastStore.all().length===0,'Toast queue must dismiss messages by id')
for(let index=0;index<TOAST_MAX_VISIBLE+3;index+=1)toastStore.push({title:`پیام ${index}`,tone:'info'})
assert(toastStore.all().length>0,'Toast queue must retain queued messages')
toastStore.clear()
assert(toastStore.all().length===0,'Toast queue must support clearing')

/* -------------------------------------------------------------- Dashboard widgets */
const ceo=demoUserByRole('CEO')
const manager=demoUserByRole('DEPARTMENT_MANAGER')
const secretary=demoUserByRole('SECRETARY')
const employee=demoUserByRole('EMPLOYEE')
assert(Boolean(ceo&&manager&&secretary&&employee),'Demo data must expose one user per role')
if(!ceo||!manager||!secretary||!employee)throw new Error('Demo dataset is missing one of the four roles')

const headerMarkup=html(<DashboardHeader title="داشبورد" userName={ceo.fullName} roleLabel="مدیرعامل" organizationName="کیا گستر" departmentLabel="ستاد"/>)
assert(headerMarkup.includes('<header'),'DashboardHeader must use header semantics')
assert(headerMarkup.includes('<time'),'DashboardHeader must render the current date')
assert(headerMarkup.includes(ceo.fullName),'DashboardHeader must greet the user')

const widgetMarkup=html(<DashboardWidget title="ویجت" icon="chart" collapsible onRefresh={noop}>محتوا</DashboardWidget>)
assert(widgetMarkup.includes('aria-expanded'),'Collapsible widget must expose aria-expanded')
assert(widgetMarkup.includes('<article'),'Widgets must expose a semantic article surface')
assert(widgetMarkup.includes('aria-labelledby'),'Widgets must be labelled by their title')
assert(html(<DashboardWidget title="بارگذاری" loading>محتوا</DashboardWidget>).includes('ui-skel'),'Loading widget must render a skeleton')
assert(html(<DashboardWidget title="خطا" error="خطا" onRetry={noop}>محتوا</DashboardWidget>).includes('role="alert"'),'Widget error state must use the shared ErrorState')
assert(html(<DashboardWidget title="خالی" empty>محتوا</DashboardWidget>).includes('ui-empty'),'Widget empty state must use the shared EmptyState')
assert(html(<DashboardGrid><span>ویجت</span></DashboardGrid>).includes('dashboard-grid'),'DashboardGrid must apply its layout class')
assert(html(<QuickActions actions={[{id:'q1',title:'ایجاد جلسه',icon:'calendar',onSelect:noop},{id:'q2',title:'پنهان',visible:false}]}/>).includes('<nav'),'QuickActions must use navigation semantics')
assert(!html(<QuickActions actions={[{id:'q2',title:'پنهان',visible:false}]}/>).includes('پنهان'),'QuickActions must respect visibility flags')
const events=upcomingEvents({role:'CEO',userId:ceo.id})
assert(html(<UpcomingEvents items={events.map((event)=>({id:event.id,title:event.title,date:event.date,meta:event.meta}))}/>).includes('<time'),'UpcomingEvents must render timestamps')
assert(html(<UpcomingEvents items={[]}/>).includes('ui-empty'),'UpcomingEvents must render an empty state')
assert(html(<NotificationSummary items={notificationsForUser(ceo.id).map((item)=>({id:item.id,title:item.title,body:item.body,createdAt:item.createdAt,priority:item.priority,read:item.read}))} unreadCount={3}/>).length>0,'NotificationSummary must render')
assert(html(<KpiSummary items={[{id:'k1',title:'وظایف',value:12,icon:'check-square'}]}/>).includes('وظایف'),'KpiSummary must render KPI cards')
assert(html(<RecentActivityWidget items={activityViews.slice(0,4).map((item)=>({id:item.id,actorId:item.actorId,actorName:item.actorName,action:item.action,targetLabel:item.targetLabel,createdAt:item.createdAt}))}/>).includes('ui-activity-feed'),'RecentActivityWidget must render the shared feed')
assert(html(<DepartmentOverviewWidget rows={departmentOverview()}/>).includes('<table'),'DepartmentOverviewWidget must use the shared table')
assert(html(<TeamSummaryWidget rows={[]}/>).includes('ui-empty'),'TeamSummaryWidget must render an empty state')
assert(html(<ChartWidget title="روند" kind="line" data={series}/>).includes('<figure'),'ChartWidget must render an accessible chart')
assert(html(<PendingApprovalsWidget items={[]}/>).includes('ui-empty'),'PendingApprovalsWidget must render an empty state')
assert(html(<DeadlinesWidget items={[]}/>).includes('ui-empty'),'DeadlinesWidget must render an empty state')
assert(html(<CalendarPreviewWidget items={[]}/>).includes('ui-empty'),'CalendarPreviewWidget must render an empty state')
assert(html(<RecentFilesWidget items={[]}/>).includes('ui-empty'),'RecentFilesWidget must render an empty state')
assert(html(<StatBreakdownWidget title="خلاصه" items={[{id:'s1',label:'انجام‌شده',value:8,tone:'success'}]}/>).includes('انجام‌شده'),'StatBreakdownWidget must render its items')

const metrics=organizationMetrics()
assert(metrics.employees.value>0&&metrics.departments.value>0,'Organization metrics must be derived from demo data')

/* -------------------------------------------------------------- Role dashboards */
const ceoMarkup=html(<CeoDashboardPage/>)
const managerMarkup=html(<DepartmentManagerDashboardPage/>)
const secretaryMarkup=html(<SecretaryDashboardPage/>)
const employeeMarkup=html(<EmployeeDashboardPage/>)
assert(ceoMarkup.includes('<main')&&ceoMarkup.includes('<header'),'CEO dashboard must expose semantic landmarks')
assert(ceoMarkup.includes(ceo.fullName),'CEO dashboard must be personalised')
assert(ceoMarkup.includes('<figure'),'CEO dashboard must render charts')
assert(managerMarkup.includes(manager.fullName),'Manager dashboard must be personalised')
assert(secretaryMarkup.includes(secretary.fullName),'Secretary dashboard must be personalised')
assert(employeeMarkup.includes(employee.fullName),'Employee dashboard must be personalised')
assert(secretaryMarkup.includes('data-stack="true"'),'Secretary dashboard must group compatible compact summaries as a stack')
assert(employeeMarkup.includes('data-dashboard-item="reports"')&&employeeMarkup.includes('dashboard-personal-status--reports'),'Employee report summary must render with the shared personal-status treatment')
assert(![ceoMarkup,managerMarkup,secretaryMarkup,employeeMarkup].some((markup)=>markup.includes('شخصی‌سازی داشبورد')),'Dashboard personalization controls must not render inside role dashboards')
const dashboardBandExpectations=[[ceoMarkup,3],[managerMarkup,2],[secretaryMarkup,3],[employeeMarkup,3]] as const
for(const [markup,minimumBands] of dashboardBandExpectations){
 assert(!markup.includes('undefined')&&!markup.includes('NaN'),'Dashboards must not leak undefined/NaN values')
 assert(markup.includes('aria-label'),'Dashboards must label their landmarks')
 assert(markup.includes('dashboard-composition'),'Every role dashboard must use the shared composed layout')
 assert((markup.match(/class="dashboard-band"/g)??[]).length>=minimumBands,'Every role dashboard must render its deliberate content bands after settings extraction')
 assert(markup.includes('dashboard-band__column'),'Every role dashboard must render responsive composition columns')
 assert(markup.includes('--dashboard-band-units:12'),'Every role dashboard band must resolve against the shared 12-column system')
}
for(const roles of [['MAIN_MANAGER'],['DEPARTMENT_MANAGER'],['SECRETARY'],['EMPLOYEE']] as const){
 const settingsMarkup=html(<SettingsPage roles={roles}/>)
 assert(settingsMarkup.includes('settings-workspace')&&settingsMarkup.includes('شخصی‌سازی داشبورد'),'Every role must share the settings personalization architecture')
}
assert(html(<CeoDashboardPage loading/>).includes('ui-skel'),'Dashboards must support a loading state')
assert(html(<CeoDashboardPage error onRetry={noop}/>).includes('role="alert"'),'Dashboards must support an error state')

/* ------------------------------------------------------ Global quick actions */
const quickActionPrincipals=(Object.keys(quickActionsByRole) as Array<keyof typeof quickActionsByRole>).map((role):AuthorizedPrincipal=>({
 userId:`qa-${role}`,
 roles:[role],
 capabilities:roleCapabilities[role],
 departmentIds:role==='MAIN_MANAGER'?[]:['dep-1'],
}))
const quickActionSets=quickActionPrincipals.map((principal)=>getQuickActions(principal))
const expectedPrimaryActions=['ایجاد جلسه','وظیفه جدید','جلسات و صورت‌جلسه‌ها','گزارش جدید']
assert(quickActionSets.every((actions,index)=>actions[0]?.label===expectedPrimaryActions[index]),'Each role must retain its own prioritised primary quick action')
assert(new Set(quickActionSets.map((actions)=>actions.map((action)=>action.id).join('|'))).size===4,'All four roles must resolve to genuinely distinct quick-action sets')
assert(quickActionSets.every((actions,index)=>actions.every((action)=>action.requiredCapabilities.every((capability)=>quickActionPrincipals[index].capabilities.includes(capability)))),'Every visible quick action must be backed by the principal capabilities')
assert(getQuickActions({...quickActionPrincipals[0],capabilities:[]}).length===0,'Quick actions must disappear when their required permissions are absent')
assert(!quickActionSets[2].some((action)=>action.href==='/tasks/create'||action.href==='/requests/create'),'Secretary quick actions must not expose task or request creation')
assert(!quickActionSets[3].some((action)=>action.href==='/tasks/create'||action.href==='/organization'),'Employee quick actions must not expose management operations')
const quickActionMarkup=html(<PersistentQuickAction actions={quickActionSets[0]}/>)
assert(quickActionMarkup.includes('<button')&&quickActionMarkup.includes('aria-haspopup="dialog"'),'Global quick-action trigger must use accessible native button semantics')
assert(!quickActionMarkup.includes('quick-action-panel'),'Quick-action panel must remain closed until explicitly opened')

/* -------------------------------------------------------------- Meetings module */
const listMarkup=html(<MeetingsListPage meetings={meetingViews} onOpenMeeting={noop} onCreateMeeting={noop}/>)
assert(listMarkup.includes('<table'),'Meetings list must render the shared table')
assert(listMarkup.includes('role="search"'),'Meetings list must render the shared filter bar')
assert(meetingViews.some((meeting)=>listMarkup.includes(meeting.title)),'Meetings list must render demo meetings')
assert(listMarkup.includes('ui-pagination'),'Meetings list must integrate pagination')
assert(html(<MeetingsListPage meetings={[]}/>).includes('ui-empty'),'Meetings list must render an empty state')
assert(html(<MeetingsListPage meetings={[]} loading/>).includes('ui-skel'),'Meetings list must render its loading state')
assert(html(<MeetingsListPage meetings={[]} error onRetry={noop}/>).includes('role="alert"'),'Meetings list must render the shared error state')
const calendarMarkup=html(<MeetingCalendarPage meetings={meetingViews}/>)
assert(calendarMarkup.includes('calendar__day'),'Meeting calendar must render the calendar surface')
assert(calendarMarkup.includes('<time')||calendarMarkup.includes('aria-label'),'Meeting calendar must expose accessible day labels')
assert(html(<MeetingRequestsPage requests={meetingRequestViews}/>).includes('<table'),'Meeting requests must render the shared table')
const createMarkup=html(<CreateMeetingPage/>)
assert(createMarkup.includes('<form'),'Create meeting must render a form')
assert(createMarkup.includes('دستور جلسه'),'Create meeting must render the agenda editor')
assert(createMarkup.includes('پیوست'),'Create meeting must render the attachment uploader')
assert(createMarkup.includes('پیش‌نویس'),'Create meeting must offer a save-draft action')
const detailsMarkup=html(<MeetingDetailsPage meeting={meetingViews[0]}/>)
assert(detailsMarkup.includes('<dl'),'Meeting details must reuse DescriptionList semantics')
assert(detailsMarkup.includes(meetingViews[0].organizerName),'Meeting details must show the organizer')

const workspaceMarkup=html(<MeetingWorkspacePage meeting={meetingViews[0]} onOpenMinutes={noop} onExport={noop} onNavigate={noop}/>)
assert(workspaceMarkup.includes('<header'),'Meeting workspace must render a header region')
assert(workspaceMarkup.includes('<aside'),'Meeting workspace must render the quick-actions sidebar')
assert(workspaceMarkup.includes('aria-label'),'Meeting workspace regions must be labelled')
assert(workspaceMarkup.includes(meetingViews[0].title),'Meeting workspace must render the meeting title')
assert(!workspaceMarkup.includes('undefined'),'Meeting workspace must not leak undefined values')
assert(html(<MeetingWorkspacePage meeting={meetingViews[0]} error onRetry={noop}/>).includes('role="alert"'),'Meeting workspace must render the shared error state')
assert(html(<MeetingWorkspacePage meeting={meetingViews[0]} loading/>).includes('ui-skel'),'Meeting workspace must render its loading state')
assert(html(<AgendaPanel meetingId={meetingViews[0].id}/>).includes('aria-expanded'),'Agenda items must be expandable')
assert(html(<AttendanceSummaryPanel meetingId={meetingViews[0].id}/>).includes('٪'),'Attendance summary must display percentages')
assert(html(<ParticipantsPanel meetingId={meetingViews[0].id}/>).includes('<table'),'Participants panel must reuse the shared table')
assert(html(<MinutesPanel meetingId={meetingViews[0].id} onOpenMinutes={noop}/>).length>0,'Minutes panel must render')
assert(html(<DecisionsPanel meetingId={meetingViews[0].id}/>).length>0,'Decisions panel must render')
assert(html(<MeetingTasksPanel meetingId={meetingViews[0].id}/>).length>0,'Tasks panel must render')
assert(html(<AgendaPanel meetingId="missing-meeting"/>).includes('ui-empty'),'Agenda panel must render an empty state for unknown meetings')
assert(html(<ParticipantsPanel meetingId="missing-meeting"/>).includes('ui-empty'),'Participants panel must render an empty state for unknown meetings')

/* -------------------------------------------------------- RTL & styling guarantees */
const surfaces=[tableMarkup,gridMarkup,modalMarkup,ceoMarkup,managerMarkup,secretaryMarkup,employeeMarkup,workspaceMarkup,listMarkup,createMarkup]
for(const markup of surfaces){
 assert(markup.startsWith('<div dir="rtl">'),'Every surface must render inside an RTL root')
 const inline=markup.match(/style="[^"]*"/g)??[]
 assert(inline.every((declaration)=>!/#[0-9a-fA-F]{3,8}|rgb\(|hsl\(/.test(declaration)),'Components must not inline hardcoded colours')
 assert(inline.every((declaration)=>!/(margin|padding|border)-(left|right)\s*:/.test(declaration)),'Components must use logical properties instead of physical ones')
}

if(failures.length){
 console.error(`Phase 11 verification failed with ${failures.length} issue(s):`)
 for(const failure of failures)console.error(` - ${failure}`)
 throw new Error(`Phase 11 verification failed (${failures.length} issues)`)
}
console.log('Phase 11 verification passed: data display, overlays, dashboards, meetings module and demo seed data.')
