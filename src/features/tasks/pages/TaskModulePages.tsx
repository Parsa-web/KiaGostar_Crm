import {useCallback,useMemo,useState} from 'react'
import {Button,DatePicker,DescriptionList,ErrorState,FileInput,FilterBar,FormActions,FormSection,Icon,LinearProgress,PropertyList,SearchSummary,StatusBadge,Switch,TextArea,TextField,Toolbar,ViewSwitcher,Tag,TagList,TagListItem,type SelectOption,type TableSort} from '../../../components/ui'
import {AttachmentsPanel,EntityCalendar,QuickActionsPanel,RelatedLinksPanel,WorkPanel,type CalendarEvent} from '../../../components/work'
import {departmentOptions,meetingOptions,taskViews,teamWorkload,useDemoState,userOptions,type CreateTaskAttachmentPayload,type TaskView} from '../../../demo'
import {formatNumber,formatPersianDate,formatRelativeTime} from '../../../core/utils'
import {paginate,sortRows,useCollectionView} from '../../../hooks/useCollectionView'
import {TaskBoard,TaskCardGrid,TaskDeadlineCell,TaskEmptyState,TaskFilterSlots,TaskKpiRow,TaskPaginationBar,TaskPersonCell,TaskTable} from '../components/TaskWorkspace'
import {buildActiveFilters,summarizeTasks,taskPriorityLabels,taskPriorityOptions,taskStatusLabels} from '../components/taskPresentation'
import {reportStageLabels} from '../../reports/pages/reportPresentation'
type TaskFilters={status:string;priority:string;department:string;assignee:string;meeting:string}
const emptyFilters:TaskFilters={status:'',priority:'',department:'',assignee:'',meeting:''}
const sortAccessors:Readonly<Record<string,(task:TaskView)=>string|number>>={
 code:(task)=>task.code,title:(task)=>task.title,assignee:(task)=>task.assigneeName,status:(task)=>task.status,
 priority:(task)=>['LOW','NORMAL','HIGH','CRITICAL'].indexOf(task.priority),deadline:(task)=>new Date(task.deadline).getTime(),
}
const matches=(task:TaskView,keyword:string,filters:TaskFilters)=>{
 const term=keyword.trim()
 if(term&&!`${task.title} ${task.code} ${task.assigneeName} ${task.departmentName}`.includes(term))return false
 if(filters.status&&task.status!==filters.status)return false
 if(filters.priority&&task.priority!==filters.priority)return false
 if(filters.department&&task.departmentId!==filters.department)return false
 if(filters.assignee&&task.assigneeId!==filters.assignee)return false
 if(filters.meeting&&task.meetingId!==filters.meeting)return false
 return true
}
type TaskDisplay='table'|'board'|'cards'
export interface TaskCollectionPageProps{tasks?:readonly TaskView[];title?:string;description?:string;loading?:boolean;error?:boolean;onOpenTask?(task:TaskView):void;onCreateTask?():void;onUpdateStatus?(taskId:string,status:TaskView['status']):void;onRetry?():void;defaultView?:TaskDisplay;onCreateReport?(taskId:string):void}
export function TasksCollectionPage({tasks=taskViews,title='وظایف',description,loading=false,error=false,onOpenTask,onCreateTask,onUpdateStatus,onRetry,defaultView='table',onCreateReport}:TaskCollectionPageProps){
 const view=useCollectionView<TaskFilters>({initialFilters:emptyFilters,initialSort:{key:'deadline',direction:'asc'},initialPageSize:10})
 const [display,setDisplay]=useState<TaskDisplay>(defaultView)
 const [statusOverrides,setStatusOverrides]=useState<Readonly<Record<string,TaskView['status']>>>({})
 const source=useMemo(()=>tasks.map((task)=>statusOverrides[task.id]?{...task,status:statusOverrides[task.id]}:task),[statusOverrides,tasks])
 const filtered=useMemo(()=>source.filter((task)=>matches(task,view.keyword,view.filters)),[source,view.filters,view.keyword])
 const sorted=useMemo(()=>sortRows(filtered,view.sort,sortAccessors),[filtered,view.sort])
 const paged=useMemo(()=>paginate(sorted,view.page,view.pageSize),[sorted,view.page,view.pageSize])
 const stats=useMemo(()=>summarizeTasks(source),[source])
 const openTask=useCallback((task:TaskView)=>onOpenTask?.(task),[onOpenTask])
 const activeFilters=buildActiveFilters([
  {key:'status',label:'وضعیت',value:view.filters.status,display:taskStatusLabels[view.filters.status as TaskView['status']],onRemove:()=>view.clearFilter('status')},
  {key:'priority',label:'اولویت',value:view.filters.priority,display:taskPriorityLabels[view.filters.priority as TaskView['priority']],onRemove:()=>view.clearFilter('priority')},
  {key:'department',label:'واحد',value:view.filters.department,display:departmentOptions.find((item)=>item.value===view.filters.department)?.label,onRemove:()=>view.clearFilter('department')},
  {key:'assignee',label:'مسئول',value:view.filters.assignee,display:userOptions.find((item)=>item.value===view.filters.assignee)?.label,onRemove:()=>view.clearFilter('assignee')},
  {key:'meeting',label:'جلسه',value:view.filters.meeting,display:meetingOptions.find((item)=>item.value===view.filters.meeting)?.label,onRemove:()=>view.clearFilter('meeting')},
 ])
 if(error)return <ErrorState title="نمایش وظایف ممکن نیست" onRetry={onRetry}/>
 return <div className="module-page">
  <Toolbar
   title={title}
   subtitle={description}
   selectionSummary={view.selection.length>0?`${formatNumber(view.selection.length)} وظیفه انتخاب شده`:undefined}
   bulkActions={view.selection.length>0?<Button size="sm" variant="secondary" onClick={view.clearSelection}>لغو انتخاب</Button>:undefined}
   actions={<>
    <ViewSwitcher<TaskDisplay> views={[{id:'table',label:'جدول'},{id:'board',label:'تخته'},{id:'cards',label:'کارت'}]} value={display} onChange={setDisplay}/>
    {onCreateTask&&<Button startIcon={<Icon name="plus" size="sm"/>} onClick={onCreateTask}>وظیفه جدید</Button>}
   </>}
  />
  <TaskKpiRow stats={stats} loading={loading} onSelectStatus={(status)=>view.setFilter('status',status)}/>
  <FilterBar
   searchValue={view.keyword}
   onSearchChange={view.setKeyword}
   searchPlaceholder="جست‌وجو در عنوان، کد یا مسئول…"
   advancedFilters={<TaskFilterSlots status={view.filters.status} priority={view.filters.priority} department={view.filters.department} assignee={view.filters.assignee} meeting={view.filters.meeting} departmentOptions={departmentOptions} assigneeOptions={userOptions} meetingOptions={meetingOptions} onChange={(key,value)=>view.setFilter(key,value)}/>}
   activeFilters={activeFilters}
   onResetAll={view.resetAll}
  />
  <SearchSummary total={sorted.length} keyword={view.keyword||undefined} activeFilters={activeFilters} onClear={view.resetAll} label="وظیفه"/>
  {display==='table'&&<TaskTable
   tasks={paged}
   sort={view.sort as TableSort|null}
   onSortChange={(sort)=>view.setSort(sort)}
   selection={view.selection}
   onSelectionChange={view.setSelection}
   onOpen={openTask}
   loading={loading}
   emptyState={<TaskEmptyState onCreate={onCreateTask}/>}
   pagination={<TaskPaginationBar page={view.page} pageSize={view.pageSize} total={sorted.length} onPageChange={view.setPage} onPageSizeChange={view.setPageSize}/>}
    onCreateReport={onCreateReport}
  />}
  {display==='board'&&<TaskBoard tasks={sorted} onOpen={openTask} loading={loading} onStatusChange={(taskId,status)=>{const next=status as TaskView['status'];if(onUpdateStatus)onUpdateStatus(taskId,next);else setStatusOverrides((current)=>({...current,[taskId]:next}))}}/>}
  {display==='cards'&&<>
   <TaskCardGrid tasks={paged} onOpen={openTask} loading={loading}/>
   <TaskPaginationBar page={view.page} pageSize={view.pageSize} total={sorted.length} onPageChange={view.setPage} onPageSizeChange={view.setPageSize}/>
  </>}
 </div>
}
export function MyTasksPage({userId,onOpenTask,onCreateTask}:{userId:string;onOpenTask?(task:TaskView):void;onCreateTask?():void}){
 const mine=useMemo(()=>taskViews.filter((task)=>task.assigneeId===userId),[userId])
 return <TasksCollectionPage tasks={mine} title="وظایف من" description="وظایفی که به شما محول شده است" onOpenTask={onOpenTask} onCreateTask={onCreateTask} defaultView="board"/>
}
/** Tabbed view for department manager: "my tasks" / "employee tasks" */
export function DepartmentManagerTasksPage({userId,departmentId,onOpenTask,onCreateTask,onCreateReport}:{userId:string;departmentId?:string;onOpenTask?(task:TaskView):void;onCreateTask?():void;onCreateReport?(taskId:string):void}){
 const [activeTab,setActiveTab]=useState<'mine'|'employees'>('mine')
 const mine=useMemo(()=>taskViews.filter((task)=>task.assigneeId===userId),[userId])
 const employees=useMemo(()=>departmentId?taskViews.filter((task)=>task.departmentId===departmentId&&task.assigneeId!==userId):taskViews.filter((task)=>task.assigneeId!==userId),[departmentId,userId])
 const tasks=activeTab==='mine'?mine:employees
 const tabTitle=activeTab==='mine'?'وظایف من':'وظایف کارکنان واحد'
 const tabDescription=activeTab==='mine'?'وظایفی که مسئول اجرای آن‌ها هستید':'فقط وظایف واگذارشده به کارکنان همین واحد'
 const showCreate=activeTab==='employees'?onCreateTask:undefined
 const showCreateReport=onCreateReport
 return <div className="module-page">
  <div className="module-tabs" role="tablist">
   <button role="tab" aria-selected={activeTab==='mine'} onClick={()=>setActiveTab('mine')} className={activeTab==='mine'?'active':''}>وظایف من</button>
   <button role="tab" aria-selected={activeTab==='employees'} onClick={()=>setActiveTab('employees')} className={activeTab==='employees'?'active':''}>وظایف کارکنان واحد</button>
  </div>
  <TasksCollectionPage tasks={tasks} title={tabTitle} description={tabDescription} onOpenTask={onOpenTask} onCreateTask={showCreate} onCreateReport={showCreateReport} defaultView="board"/>
 </div>
}
export function TeamTasksPage({departmentId,onOpenTask}:{departmentId?:string;onOpenTask?(task:TaskView):void}){
 const teamTasks=useMemo(()=>departmentId?taskViews.filter((task)=>task.departmentId===departmentId):taskViews,[departmentId])
 const workload=useMemo(()=>teamWorkload(departmentId),[departmentId])
 return <div className="module-page">
  <TasksCollectionPage tasks={teamTasks} title="وظایف تیم" description="نمای کلی وظایف اعضای واحد" onOpenTask={onOpenTask}/>
  <WorkPanel title="بار کاری اعضا" icon="users" count={workload.length}>
   <ul className="module-list">
    {workload.map((row)=><li className="module-list__item" key={row.user.id}>
     <TaskPersonCell name={row.user.fullName} caption={row.departmentName}/>
     <span className="module-cell"><span className="module-cell__secondary">فعال: {formatNumber(row.active)} · تکمیل: {formatNumber(row.completed)} · تأخیر: {formatNumber(row.overdue)}</span></span>
     <span className="workload"><LinearProgress value={row.load} size="sm" showValue tone={row.overdue?'danger':'primary'} label={<span className="visually-hidden">{`بار کاری ${row.user.fullName}`}</span>}/></span>
    </li>)}
   </ul>
  </WorkPanel>
 </div>
}
export function TaskCalendarPage({tasks=taskViews,onOpenTask}:{tasks?:readonly TaskView[];onOpenTask?(task:TaskView):void}){
 const events=useMemo<readonly CalendarEvent[]>(()=>tasks.map((task)=>({
  id:task.id,title:task.title,date:task.deadline,
  tone:task.status==='OVERDUE'?'danger':task.status==='COMPLETED'?'success':task.priority==='CRITICAL'?'warning':'primary',
  meta:`${task.assigneeName} · ${taskStatusLabels[task.status]}`,
 })),[tasks])
 return <div className="module-page">
  <Toolbar title="تقویم وظایف" subtitle="مهلت وظایف بر اساس تاریخ"/>
  <EntityCalendar
   events={events}
   onEventActivate={(event)=>{const task=tasks.find((item)=>item.id===event.id);if(task)onOpenTask?.(task)}}
   legend={<TagList>
    <TagListItem><Tag tone="primary" size="sm">در جریان</Tag></TagListItem>
    <TagListItem><Tag tone="danger" size="sm">دارای تأخیر</Tag></TagListItem>
    <TagListItem><Tag tone="success" size="sm">تکمیل‌شده</Tag></TagListItem>
   </TagList>}/>
 </div>
}
export interface CreateTaskPageProps{onCancel?():void;onSubmit?(payload:Readonly<Record<string,unknown>>):void;submitting?:boolean;assigneeOptions?:readonly SelectOption[];defaultDepartment?:string}
export function CreateTaskPage({onCancel,onSubmit,submitting=false,assigneeOptions=userOptions,defaultDepartment}:CreateTaskPageProps){
 const [title,setTitle]=useState('')
 const [description,setDescription]=useState('')
 const [assignees,setAssignees]=useState<readonly string[]>([])
 const [department,setDepartment]=useState<string|undefined>(defaultDepartment)
 const [priority,setPriority]=useState<string|undefined>('NORMAL')
 const [deadline,setDeadline]=useState<string|undefined>()
 const [meeting,setMeeting]=useState<string|undefined>()
 const [touched,setTouched]=useState(false)
 const titleError=touched&&!title.trim()?'عنوان وظیفه را وارد کنید.':undefined
 const assigneeError=touched&&!assignees.length?'حداقل یک مسئول انتخاب کنید.':undefined
 const submit=()=>{setTouched(true);if(!title.trim()||!assignees.length)return;onSubmit?.({title,description,assignees,department,priority,deadline,meeting})}
 return <form className="module-form" noValidate onSubmit={(event)=>{event.preventDefault();submit()}}>
  <FormSection title="اطلاعات پایه" description="عنوان و شرح وظیفه را مشخص کنید.">
   <TextField label="عنوان وظیفه" required value={title} onChange={(event)=>setTitle(event.target.value)} error={titleError} maxLength={120} showCounter/>
   <TextArea label="شرح وظیفه" value={description} onChange={(event)=>setDescription(event.target.value)} rows={4} maxLength={800} showCounter helperText="جزئیات اجرایی و انتظارات را بنویسید."/>
  </FormSection>
  <FormSection title="تخصیص" description="مسئول اجرا و واحد سازمانی را انتخاب کنید.">
   <MultiSelect label="مسئولان" options={assigneeOptions} value={assignees} onChange={setAssignees} error={assigneeError} required/>
   <Select label="واحد سازمانی" options={departmentOptions} value={department} onChange={setDepartment} searchable clearable/>
  </FormSection>
  <FormSection title="زمان‌بندی و اولویت">
   <Select label="اولویت" options={taskPriorityOptions.slice(1)} value={priority} onChange={setPriority}/>
   <DatePicker label="مهلت انجام" value={deadline} onChange={setDeadline} helperText="تاریخ پایان مورد انتظار"/>
  </FormSection>
  <FormSection title="ارتباطات" description="در صورت نیاز وظیفه را به جلسه مرتبط کنید.">
   <Select label="جلسه مرتبط" options={meetingOptions} value={meeting} onChange={setMeeting} searchable clearable placeholder="بدون جلسه"/>
  </FormSection>
  <FormActions className="module-form__actions">
   {onCancel&&<Button type="button" variant="ghost" onClick={onCancel}>انصراف</Button>}
   <Button type="submit" loading={submitting}>ثبت وظیفه</Button>
  </FormActions>
 </form>
}
export function TaskDetailsPage({task,onBack,onOpenRelated,onOpenCalendar,onOpenMeeting,onCreateReport,canUpdate,onUpdateStatus,canManageAttachments,onAddAttachments,onRemoveAttachment}:{task:TaskView;onBack?():void;onOpenRelated?(kind:string,id:string):void;onOpenCalendar?():void;onOpenMeeting?():void;onCreateReport?():void;canUpdate?:boolean;onUpdateStatus?(status:TaskView['status']):void;canManageAttachments?:boolean;onAddAttachments?(files:readonly CreateTaskAttachmentPayload[]):void|Promise<void>;onRemoveAttachment?(fileId:string):void}){
 const {reports,files}=useDemoState()
 const taskFiles=useMemo(()=>files.filter((file)=>file.entityType==='TASK'&&file.entityId===task.id),[files,task.id])
 const attachments=useMemo(()=>taskFiles.map((file)=>({id:file.id,name:file.name,mimeType:file.mimeType,sizeBytes:file.sizeBytes,uploaderName:file.uploaderName,uploadedAt:file.uploadedAt})),[taskFiles])
 const [selectedFiles,setSelectedFiles]=useState<readonly File[]>([])
 const [showUploader,setShowUploader]=useState(false)
 const [uploading,setUploading]=useState(false)
 const relatedReports=useMemo(()=>reports.filter((report)=>report.taskId===task.id),[reports,task.id])
 const readTaskFile=(file:File)=>new Promise<CreateTaskAttachmentPayload>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>resolve({name:file.name,mimeType:file.type,sizeBytes:file.size,dataUrl:String(reader.result)});reader.readAsDataURL(file)})
 const upload=async()=>{if(!selectedFiles.length||!onAddAttachments)return;setUploading(true);try{await onAddAttachments(await Promise.all(selectedFiles.map(readTaskFile)));setSelectedFiles([]);setShowUploader(false)}finally{setUploading(false)}}
 const preview=(id:string)=>{const file=taskFiles.find((item)=>item.id===id);if(!file?.dataUrl)return;const link=document.createElement('a');link.href=file.dataUrl;link.download=file.name;link.click()}
 return <div className="module-page">
  <Toolbar
   title={task.title}
   subtitle={`${task.code} · ${task.departmentName}`}
   actions={<>
    {onBack&&<Button variant="ghost" startIcon={<Icon name="arrow-back" size="sm" directional/>} onClick={onBack}>بازگشت</Button>}
    {canUpdate&&onUpdateStatus&&task.status==='PENDING'&&<Button onClick={()=>onUpdateStatus('IN_PROGRESS')}>شروع انجام</Button>}
    {canUpdate&&onUpdateStatus&&task.status==='IN_PROGRESS'&&<Button onClick={()=>onUpdateStatus('COMPLETED')}>ثبت تکمیل</Button>}
    <StatusBadge status={task.status} label={taskStatusLabels[task.status]}/>
   </>}
  />
  <div className="module-grid module-grid--split">
   <div className="module-page__section">
    <WorkPanel title="مشخصات وظیفه" icon="check-square">
     <PropertyList items={[
      {key:'assignee',label:'مسئول اجرا',value:<TaskPersonCell name={task.assigneeName} caption={task.departmentName}/>,icon:'user'},
      {key:'creator',label:'ایجادکننده',value:task.creatorName,icon:'user'},
      {key:'priority',label:'اولویت',value:taskPriorityLabels[task.priority],icon:'alert'},
      {key:'status',label:'وضعیت',value:<StatusBadge status={task.status} label={taskStatusLabels[task.status]} size="sm"/>},
      {key:'deadline',label:'مهلت انجام',value:`${formatPersianDate(task.deadline,{dateStyle:'full'})} (${formatRelativeTime(task.deadline)})`,icon:'calendar'},
      {key:'created',label:'تاریخ ایجاد',value:formatPersianDate(task.createdAt,{dateStyle:'medium'}),icon:'clock'},
      {key:'description',label:'شرح',value:task.description,multiline:true,fullWidth:true},
     ]}/>
    </WorkPanel>
    <WorkPanel title="وضعیت اجرا" icon="chart">
     <TaskDeadlineCell task={task}/>
     <DescriptionList layout="horizontal" compact items={[
      {key:'state',term:'وضعیت فعلی',description:taskStatusLabels[task.status]},
      {key:'meeting',term:'جلسه مرتبط',description:task.meetingTitle??'—'},
      {key:'reports',term:'گزارش‌های ثبت‌شده',description:formatNumber(relatedReports.length)},
     ]}/>
    </WorkPanel>
    <WorkPanel title="گزارش‌های این وظیفه" icon="report" count={relatedReports.length}>
     {relatedReports.length
      ?<ul className="module-list">{relatedReports.map((report)=><li key={report.id} className="module-list__item">
        <button type="button" className="module-list__button" onClick={()=>onOpenRelated?.('report-details',report.id)}>
         <span className="module-cell"><span className="module-cell__primary">{report.title}</span><span className="module-cell__secondary">{report.code} · {formatPersianDate(report.submittedAt,{dateStyle:'medium'})}{report.meetingTitle?` · ${report.meetingTitle}`:''}</span></span>
         <StatusBadge status={report.status} label={reportStageLabels[report.stage]} size="sm"/>
        </button>
       </li>)}</ul>
      :<p className="module-cell__secondary">برای این وظیفه گزارشی ثبت نشده است.</p>}
    </WorkPanel>
    <div id={`task-${task.id}-attachments`}>
     <AttachmentsPanel
      attachments={attachments}
      actions={canManageAttachments&&<Button size="sm" variant="secondary" onClick={()=>setShowUploader((value)=>!value)}>{showUploader?'بستن':'افزودن پیوست'}</Button>}
      onPreview={(item)=>preview(item.id)}
      onRemove={canManageAttachments&&onRemoveAttachment?(item)=>onRemoveAttachment(item.id):undefined}
     />
     {showUploader&&canManageAttachments&&<WorkPanel title="بارگذاری پیوست" icon="folder">
      <FileInput files={selectedFiles} onChange={setSelectedFiles} multiple maxSize={524288} disabled={uploading} helperText="حداکثر حجم هر فایل ۵۱۲ کیلوبایت."/>
      <div className="button-row"><Button loading={uploading} disabled={!selectedFiles.length} onClick={upload}>ذخیره پیوست‌ها</Button><Button variant="ghost" onClick={()=>{setSelectedFiles([]);setShowUploader(false)}}>انصراف</Button></div>
     </WorkPanel>}
    </div>
   </div>
   <div className="module-page__section">
    <QuickActionsPanel actions={[
     ...(onCreateReport?[{id:'report',label:'ثبت گزارش برای این وظیفه',icon:'report' as const,onSelect:onCreateReport}]:[]),
     ...(onOpenCalendar?[{id:'calendar',label:'مشاهده در تقویم',icon:'calendar' as const,onSelect:onOpenCalendar}]:[]),
     ...(task.meetingId&&onOpenMeeting?[{id:'meeting',label:'مشاهده جلسه مرتبط',icon:'users' as const,onSelect:onOpenMeeting}]:[]),
     ...(canManageAttachments?[{id:'files',label:'مدیریت پیوست‌ها',icon:'folder' as const,onSelect:()=>{setShowUploader(true);requestAnimationFrame(()=>document.getElementById(`task-${task.id}-attachments`)?.scrollIntoView({behavior:'smooth',block:'center'}))}}]:[]),
    ]}/>
    <RelatedLinksPanel links={[
     ...(task.meetingId?[{id:task.meetingId,label:task.meetingTitle??'جلسه مرتبط',description:'مشاهده جزئیات جلسه',icon:'users' as const,onNavigate:()=>onOpenRelated?.('meeting',task.meetingId as string)}]:[]),
     {id:`${task.id}-dept`,label:task.departmentName,description:'وظایف این واحد',icon:'building',onNavigate:()=>onOpenRelated?.('department',task.departmentId)},
    ]}/>
   </div>
  </div>
 </div>
}