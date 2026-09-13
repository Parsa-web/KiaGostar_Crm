import {memo,useMemo,type ReactNode} from 'react'
import {Avatar,Button,DataCard,EmptyState,Icon,KPIGrid,KPIWidget,Pagination,Select,StatusBadge,Table,Tag,TagList,TagListItem,type TableColumn,type TableSort} from '../../../components/ui'
import {KanbanBoard,type KanbanColumnConfig} from '../../../components/work'
import type {TaskView} from '../../../demo'
import {formatNumber,formatPersianDate,formatRelativeTime} from '../../../core/utils'
import {taskPriorityLabels,taskPriorityOptions,taskPriorityTone as priorityTone,taskStatusLabels,taskStatusOptions,type TaskStats} from './taskPresentation'
export function TaskPersonCell({name,caption}:{name:string;caption?:ReactNode}){
 return <span className="module-person"><Avatar name={name} alt={name} size="xs"/><span className="module-cell"><span className="module-cell__primary">{name}</span>{caption&&<span className="module-cell__secondary">{caption}</span>}</span></span>
}
/** Replaces the old percentage bar: advancement is judged from the reports filed
    against the task, so the card shows the deadline standing instead of a number
    the assignee typed in. */
export function TaskDeadlineCell({task}:{task:TaskView}){
 const tone=task.status==='OVERDUE'?'danger':task.status==='COMPLETED'?'success':'neutral'
 const label=task.status==='COMPLETED'?'انجام‌شده':task.status==='OVERDUE'?'گذشته از مهلت':formatRelativeTime(task.deadline)
 return <span className="module-cell"><Tag tone={tone} size="sm" icon="clock">{label}</Tag><span className="module-cell__secondary">{formatPersianDate(task.deadline,{dateStyle:'medium'})}</span></span>
}
export interface TaskTableProps{
 tasks:readonly TaskView[];sort:TableSort|null;onSortChange(sort:TableSort):void;
 selection?:readonly string[];onSelectionChange?(keys:readonly string[]):void;
 onOpen(task:TaskView):void;loading?:boolean;error?:ReactNode;onRetry?():void;pagination?:ReactNode;emptyState?:ReactNode;onCreateReport?(taskId:string):void
}
export function TaskTable({tasks,sort,onSortChange,selection,onSelectionChange,onOpen,loading,error,onRetry,pagination,emptyState,onCreateReport}:TaskTableProps){
 const columns=useMemo<readonly TableColumn<TaskView>[]>(()=>[
  {key:'code',header:'کد',sortable:true,width:'xs',cell:(task)=><span className="module-cell__secondary">{task.code}</span>},
  {key:'title',header:'عنوان وظیفه',sortable:true,wrap:true,width:'lg',cell:(task)=><span className="module-cell"><span className="module-cell__primary">{task.title}</span>{task.meetingTitle&&<span className="module-cell__secondary">برگرفته از {task.meetingTitle}</span>}</span>},
  {key:'assignee',header:'مسئول',sortable:true,width:'md',cell:(task)=><TaskPersonCell name={task.assigneeName} caption={task.departmentName}/>},
  {key:'status',header:'وضعیت',sortable:true,width:'sm',cell:(task)=><StatusBadge status={task.status} label={taskStatusLabels[task.status]} size="sm"/>},
  {key:'priority',header:'اولویت',sortable:true,width:'sm',hideBelow:'md',cell:(task)=><Tag tone={priorityTone[task.priority]} size="sm">{taskPriorityLabels[task.priority]}</Tag>},
  {key:'meeting',header:'جلسه مرتبط',sortable:false,width:'md',hideBelow:'lg',cell:(task)=>task.meetingTitle?<span className="module-cell__secondary">{task.meetingTitle}</span>:<span className="module-cell__secondary">—</span>},
  {key:'deadline',header:'مهلت',sortable:true,width:'md',cell:(task)=><span className="module-cell"><time dateTime={task.deadline}>{formatPersianDate(task.deadline,{dateStyle:'medium'})}</time><span className="module-cell__secondary">{formatRelativeTime(task.deadline)}</span></span>},
 ],[])
 return <Table
  columns={columns}
  rows={tasks}
  rowKey={(task)=>task.id}
  caption="فهرست وظایف"
  sort={sort}
  onSortChange={onSortChange}
  selectable={Boolean(onSelectionChange)}
  selectedKeys={selection}
  onSelectionChange={onSelectionChange}
  onRowActivate={onOpen}
  isRowHighlighted={(task)=>task.status==='OVERDUE'}
  zebra
  loading={loading}
  error={error}
  onRetry={onRetry}
  emptyState={emptyState}
  pagination={pagination}
  rowActions={(task)=><><Button size="sm" variant="ghost" onClick={()=>onOpen(task)}>جزئیات</Button>{onCreateReport&&task.status!=='COMPLETED'&&<Button size="sm" variant="secondary" onClick={(e)=>{e.stopPropagation();onCreateReport(task.id)}}>گزارش‌نویسی</Button>}</>}
  renderExpanded={(task)=><div className="module-cell"><p>{task.description}</p><span className="module-cell__secondary">ایجادکننده: {task.creatorName} · واحد: {task.departmentName}</span></div>}
 />
}
const boardColumns:readonly KanbanColumnConfig[]=[
 {id:'PENDING',title:taskStatusLabels.PENDING,tone:'neutral'},
 {id:'IN_PROGRESS',title:taskStatusLabels.IN_PROGRESS,tone:'primary'},
 {id:'OVERDUE',title:taskStatusLabels.OVERDUE,tone:'danger'},
 {id:'COMPLETED',title:taskStatusLabels.COMPLETED,tone:'success'},
]
function TaskBoardCardBase({task}:{task:TaskView}){
 return <>
  <div className="module-cell"><span className="module-cell__primary">{task.title}</span><span className="module-cell__secondary">{task.code} · {task.departmentName}</span></div>
  <TagList><TagListItem><Tag tone={priorityTone[task.priority]} size="sm">{taskPriorityLabels[task.priority]}</Tag></TagListItem><TagListItem><Tag size="sm" icon="clock">{formatPersianDate(task.deadline,{dateStyle:'short'})}</Tag></TagListItem></TagList>
  {task.meetingTitle&&<span className="module-cell__secondary">برگرفته از {task.meetingTitle}</span>}
  <TaskPersonCell name={task.assigneeName}/>
 </>
}
const TaskBoardCard=memo(TaskBoardCardBase)
export function TaskBoard({tasks,onOpen,onStatusChange,loading}:{tasks:readonly TaskView[];onOpen(task:TaskView):void;onStatusChange?(taskId:string,status:string):void;loading?:boolean}){
 return <KanbanBoard
  columns={boardColumns}
  items={tasks}
  itemKey={(task)=>task.id}
  columnOf={(task)=>task.status}
  renderCard={(task)=><TaskBoardCard task={task}/>}
  onCardActivate={onOpen}
  onCardMove={onStatusChange}
  loading={loading}
  emptyState={<EmptyState icon="check-square" title="وظیفه‌ای برای نمایش وجود ندارد" description="با تغییر فیلترها دوباره تلاش کنید."/>}
 />
}
export function TaskCardGrid({tasks,onOpen,loading}:{tasks:readonly TaskView[];onOpen(task:TaskView):void;loading?:boolean}){
 if(loading)return <div className="module-grid module-grid--cards">{[0,1,2,3].map((item)=><DataCard key={item} title="" loading/>)}</div>
 if(!tasks.length)return <EmptyState icon="check-square" title="وظیفه‌ای یافت نشد" description="معیارهای جست‌وجو را تغییر دهید."/>
 return <div className="module-grid module-grid--cards">
  {tasks.map((task)=><DataCard
   key={task.id}
   className="task-card"
   title={task.title}
   subtitle={`${task.code} · ${task.departmentName}`}
   icon="check-square"
   badge={<StatusBadge status={task.status} label={taskStatusLabels[task.status]} size="sm"/>}
   description={task.description}
   footer={<span className="module-cell__secondary">مهلت: {formatPersianDate(task.deadline,{dateStyle:'medium'})}</span>}
   onActivate={()=>onOpen(task)}
   actions={<Button size="sm" variant="ghost" onClick={()=>onOpen(task)}>مشاهده</Button>}
  ><TaskDeadlineCell task={task}/><TaskPersonCell name={task.assigneeName}/></DataCard>)}
 </div>
}
export function TaskKpiRow({stats,loading,onSelectStatus}:{stats:TaskStats;loading?:boolean;onSelectStatus?(status:string):void}){
 return <KPIGrid columns={4}>
  <KPIWidget title="کل وظایف" value={stats.total} icon="check-square" loading={loading} onActivate={onSelectStatus?()=>onSelectStatus(''):undefined} actionLabel="نمایش همه وظایف"/>
  <KPIWidget title="در جریان" value={stats.active} icon="workflow" tone="info" loading={loading} onActivate={onSelectStatus?()=>onSelectStatus('IN_PROGRESS'):undefined} actionLabel="نمایش وظایف در جریان"/>
  <KPIWidget title="دارای تأخیر" value={stats.overdue} icon="alert" tone="danger" loading={loading} onActivate={onSelectStatus?()=>onSelectStatus('OVERDUE'):undefined} actionLabel="نمایش وظایف دارای تأخیر"/>
   <KPIWidget title="تکمیل‌شده" value={stats.completed} icon="check-square" tone="success" loading={loading} footer={<span className="module-cell__secondary">از مجموع {formatNumber(stats.total)} وظیفه</span>}/>
 </KPIGrid>
}
export function TaskPaginationBar({page,pageSize,total,onPageChange,onPageSizeChange}:{page:number;pageSize:number;total:number;onPageChange(page:number):void;onPageSizeChange(size:number):void}){
 return <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange}/>
}
export function TaskFilterSlots({status,priority,department,assignee,meeting,departmentOptions,assigneeOptions,meetingOptions,onChange}:{
 status:string;priority:string;department:string;assignee:string;meeting:string;
 departmentOptions:readonly {value:string;label:string}[];assigneeOptions:readonly {value:string;label:string}[];meetingOptions?:readonly {value:string;label:string}[];
 onChange(key:'status'|'priority'|'department'|'assignee'|'meeting',value:string):void
}){
 return <>
  <Select options={taskStatusOptions} value={status} onChange={(value)=>onChange('status',value??'')} label="وضعیت" placeholder="همه وضعیت‌ها"/>
  <Select options={taskPriorityOptions} value={priority} onChange={(value)=>onChange('priority',value??'')} label="اولویت" placeholder="همه اولویت‌ها"/>
  <Select options={[{value:'',label:'همه واحدها'},...departmentOptions]} value={department} onChange={(value)=>onChange('department',value??'')} label="واحد سازمانی" searchable/>
  <Select options={[{value:'',label:'همه کاربران'},...assigneeOptions]} value={assignee} onChange={(value)=>onChange('assignee',value??'')} label="مسئول" searchable/>
  {meetingOptions&&<Select options={[{value:'',label:'همه جلسات'},...meetingOptions]} value={meeting} onChange={(value)=>onChange('meeting',value??'')} label="جلسه مرتبط" searchable/>}
 </>
}
export function TaskEmptyState({onCreate}:{onCreate?():void}){
 return <EmptyState icon="check-square" title="وظیفه‌ای ثبت نشده است" description="برای شروع، وظیفه جدیدی ایجاد کنید یا فیلترها را تغییر دهید." primaryAction={onCreate&&<Button onClick={onCreate} startIcon={<Icon name="plus" size="sm"/>}>ایجاد وظیفه</Button>}/>
}
