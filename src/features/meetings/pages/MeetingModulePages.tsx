import {useMemo,useState,type FormEvent} from 'react'
import {
 Button,ConfirmDialog,DescriptionList,ErrorState,FilterBar,Icon,PropertyList,SearchSummary,StatusBadge,Table,Toolbar,ViewSwitcher,
 type TableColumn,type TableSort,
} from '../../../components/ui'
import {DatePicker,FileInput,Form,FormActions,FormSection,MultiSelect,Select,TextArea,TextField,TimePicker} from '../../../components/ui'
import {EntityCalendar,WorkPanel,type CalendarEvent} from '../../../components/work'
import {paginate,sortRows,useCollectionView} from '../../../hooks/useCollectionView'
import {formatNumber,formatPersianDate} from '../../../core/utils'
import {
 departmentOptions,meetingRequestViews,meetingStatusLabels,meetingViews,priorityLabels,userOptions,findDemoUser,
 isMeetingNameUnique,meetingToCreateFormValues,
 type CreateMeetingPayload,type MeetingAgendaRecord,type MeetingRequestView,type MeetingView,
} from '../../../demo'
import {
 MeetingCard,MeetingCompactRow,MeetingEmptyState,MeetingFilterSlots,MeetingKpiRow,MeetingPaginationBar,MeetingPersonCell,
} from '../components/meetingPresentation'
import {buildMeetingFilters,meetingStatusTone,summarizeMeetings} from '../components/meetingTokens'
type MeetingDisplay='table'|'cards'|'compact'
const meetingAccessors:Readonly<Record<string,(meeting:MeetingView)=>string|number>>={
 title:(meeting)=>meeting.title,start:(meeting)=>new Date(meeting.startTime).getTime(),
 department:(meeting)=>meeting.departmentName,status:(meeting)=>meeting.status,
}
const matchesKeyword=(meeting:MeetingView,keyword:string)=>{
 const needle=keyword.trim().toLowerCase()
 if(!needle)return true
 return [meeting.title,meeting.code,meeting.organizerName,meeting.departmentName,meeting.location].some((field)=>field.toLowerCase().includes(needle))
}
/** Meetings collection page: table, card and compact views over the shared data-display system. */
export function MeetingsListPage({meetings=meetingViews,title='جلسات',description='فهرست جلسات سازمان',loading=false,error=false,onOpenMeeting,onCreateMeeting,onRetry}:{
 meetings?:readonly MeetingView[];title?:string;description?:string;loading?:boolean;error?:boolean;
 onOpenMeeting?(meeting:MeetingView):void;onCreateMeeting?():void;onRetry?():void
}){
 const [display,setDisplay]=useState<MeetingDisplay>('table')
 const [activeTab,setActiveTab]=useState<'current'|'past'|'cancelled'>('current')
 const view=useCollectionView({initialFilters:{status:'',type:'',mode:'',department:'',dateRange:''},initialSort:{key:'start',direction:'asc'},initialPageSize:10})

 const tabFiltered=useMemo(()=>{
  const now=Date.now()
  if(activeTab==='cancelled')return meetings.filter((m)=>m.status==='CANCELLED'||m.status==='REJECTED')
  if(activeTab==='past')return meetings.filter((m)=>(m.status==='COMPLETED')&&new Date(m.endTime).getTime()<now)
  return meetings.filter((m)=>m.status!=='CANCELLED'&&m.status!=='REJECTED'&&new Date(m.endTime).getTime()>=now)
 },[meetings,activeTab])

 const filtered=useMemo(()=>{
  return tabFiltered.filter((meeting)=>
   matchesKeyword(meeting,view.keyword)
   &&(!view.filters.status||meeting.status===view.filters.status)
   &&(!view.filters.type||meeting.type===view.filters.type)
   &&(!view.filters.mode||meeting.mode===view.filters.mode)
   &&(!view.filters.department||meeting.departmentId===view.filters.department)
  )},[tabFiltered,view.filters,view.keyword])
 const sorted=useMemo(()=>sortRows(filtered,view.sort,meetingAccessors),[filtered,view.sort])
 const paged=useMemo(()=>paginate(sorted,view.page,view.pageSize),[sorted,view.page,view.pageSize])
 const stats=useMemo(()=>summarizeMeetings(filtered),[filtered])
 const activeFilters=useMemo(()=>buildMeetingFilters([
  {key:'status',label:'وضعیت',value:view.filters.status,display:meetingStatusLabels[view.filters.status as MeetingView['status']],onRemove:()=>view.clearFilter('status')},
  {key:'type',label:'نوع',value:view.filters.type,onRemove:()=>view.clearFilter('type')},
  {key:'mode',label:'شیوه',value:view.filters.mode,onRemove:()=>view.clearFilter('mode')},
  {key:'department',label:'واحد',value:view.filters.department,display:departmentOptions.find((option)=>option.value===view.filters.department)?.label,onRemove:()=>view.clearFilter('department')},
 ]),[view])
 const columns=useMemo<readonly TableColumn<MeetingView>[]>(()=>[
  {key:'title',header:'عنوان جلسه',sortable:true,wrap:true,cell:(meeting)=><span className="module-cell"><span className="module-cell__primary">{meeting.title}</span><span className="module-cell__secondary">{meeting.code} · {meeting.typeLabel}</span></span>},
  {key:'start',header:'تاریخ و ساعت',sortable:true,cell:(meeting)=><span className="module-cell"><span className="module-cell__primary">{formatPersianDate(meeting.startTime,{dateStyle:'medium'})}</span><span className="module-cell__secondary">{formatPersianDate(meeting.startTime,{timeStyle:'short'})} تا {formatPersianDate(meeting.endTime,{timeStyle:'short'})}</span></span>},
  {key:'location',header:'محل برگزاری',hideBelow:'lg',wrap:true,cell:(meeting)=><span className="module-cell__secondary">{meeting.location} · {meeting.modeLabel}</span>},
  {key:'status',header:'وضعیت',sortable:true,cell:(meeting)=><StatusBadge tone={meetingStatusTone(meeting.status)} label={meetingStatusLabels[meeting.status]} size="sm"/>},
 ],[])
 if(error)return <ErrorState title="نمایش جلسات ممکن نیست" onRetry={onRetry}/>
 return <div className="module-page">
  <div className="module-tabs" role="tablist">
   <button role="tab" aria-selected={activeTab==='current'} onClick={()=>setActiveTab('current')} className={activeTab==='current'?'active':''}>جلسات جاری</button>
   <button role="tab" aria-selected={activeTab==='past'} onClick={()=>setActiveTab('past')} className={activeTab==='past'?'active':''}>جلسات گذشته</button>
   <button role="tab" aria-selected={activeTab==='cancelled'} onClick={()=>setActiveTab('cancelled')} className={activeTab==='cancelled'?'active':''}>جلسات لغو شده</button>
  </div>
  <Toolbar
   title={title}
   subtitle={description}
   selectionSummary={view.selection.length>0?`${formatNumber(view.selection.length)} جلسه انتخاب شده`:undefined}
   bulkActions={view.selection.length>0?<Button size="sm" variant="secondary" onClick={view.clearSelection}>لغو انتخاب</Button>:undefined}
   actions={<>
    <ViewSwitcher<MeetingDisplay> views={[{id:'table',label:'جدول'},{id:'cards',label:'کارت'},{id:'compact',label:'فشرده'}]} value={display} onChange={setDisplay}/>
    {onCreateMeeting&&<Button startIcon={<Icon name="plus" size="sm"/>} onClick={onCreateMeeting}>جلسه جدید</Button>}
   </>}/>
  <MeetingKpiRow stats={stats} loading={loading} onSelectStatus={(status)=>view.setFilter('status',status)}/>
  <FilterBar
   searchValue={view.keyword}
   onSearchChange={view.setKeyword}
   searchPlaceholder="جست‌وجو در عنوان، کد، برگزارکننده یا محل…"
   advancedFilters={<MeetingFilterSlots
    status={view.filters.status} type={view.filters.type} mode={view.filters.mode}
    department={view.filters.department} dateRange={view.filters.dateRange}
    departmentOptions={departmentOptions}
    onChange={(key,value)=>view.setFilter(key,value)}/>}
   activeFilters={activeFilters}
   onResetAll={view.resetAll}/>
  <SearchSummary total={sorted.length} keyword={view.keyword||undefined} activeFilters={activeFilters} onClear={view.resetAll} label="جلسه"/>
  {display==='table'&&<Table
   columns={columns}
   rows={paged}
   rowKey={(meeting)=>meeting.id}
   caption="فهرست جلسات"
   sort={view.sort as TableSort|null}
   onSortChange={(sort)=>view.setSort(sort)}
   selectable
   selectedKeys={view.selection}
   onSelectionChange={view.setSelection}
   onRowActivate={onOpenMeeting}
   zebra
   stickyHeader
   loading={loading}
   emptyState={<MeetingEmptyState onCreate={onCreateMeeting}/>}
   pagination={<MeetingPaginationBar page={view.page} pageSize={view.pageSize} total={sorted.length} onPageChange={view.setPage} onPageSizeChange={view.setPageSize}/>}/>}
   {display==='cards'&&<>
   <div className="module-card-grid">{paged.map((meeting:MeetingView)=><MeetingCard key={meeting.id} meeting={meeting} onOpen={onOpenMeeting}/>)}</div>
   {!paged.length&&<MeetingEmptyState onCreate={onCreateMeeting}/>}
   <MeetingPaginationBar page={view.page} pageSize={view.pageSize} total={sorted.length} onPageChange={view.setPage} onPageSizeChange={view.setPageSize}/>
  </>}
  {display==='compact'&&<>
   <ul className="module-list">{paged.map((meeting)=><MeetingCompactRow key={meeting.id} meeting={meeting} onOpen={onOpenMeeting}/>)}</ul>
   {!paged.length&&<MeetingEmptyState onCreate={onCreateMeeting}/>}
   <MeetingPaginationBar page={view.page} pageSize={view.pageSize} total={sorted.length} onPageChange={view.setPage} onPageSizeChange={view.setPageSize}/>
  </>}
 </div>
}
/** Meeting calendar page (navigation only, no editing). */
export function MeetingCalendarPage({meetings=meetingViews,onOpenMeeting}:{meetings?:readonly MeetingView[];onOpenMeeting?(meeting:MeetingView):void}){
 const events=useMemo<readonly CalendarEvent[]>(()=>meetings.map((meeting)=>({
  id:meeting.id,title:meeting.title,date:meeting.startTime,
  tone:meeting.status==='CANCELLED'||meeting.status==='REJECTED'?'danger':meeting.status==='COMPLETED'?'success':meeting.status==='PENDING_APPROVAL'?'warning':'primary',
  meta:`${meeting.organizerName} · ${meetingStatusLabels[meeting.status]}`,
 })),[meetings])
 return <div className="module-page">
  <Toolbar title="تقویم جلسات" subtitle="نمای ماهانه، هفتگی و روزانه جلسات"/>
  <EntityCalendar events={events} onEventActivate={(event)=>{const meeting=meetings.find((item)=>item.id===event.id);if(meeting)onOpenMeeting?.(meeting)}}/>
 </div>
}
const requestAccessors:Readonly<Record<string,(request:MeetingRequestView)=>string|number>>={
 title:(request)=>request.title,requester:(request)=>request.requesterName,requested:(request)=>request.requestedDate,
 submitted:(request)=>request.submittedAt,status:(request)=>request.status,priority:(request)=>request.priority,
}
const requestStatusLabels:Readonly<Record<MeetingRequestView['status'],string>>={PENDING:'در انتظار بررسی',APPROVED:'تأییدشده',REJECTED:'ردشده'}
/** Meeting requests page (presentation only; approval logic stays in services). */
export function MeetingRequestsPage({requests=meetingRequestViews,loading=false,error=false,onOpenRequest,onRetry}:{
 requests?:readonly MeetingRequestView[];loading?:boolean;error?:boolean;onOpenRequest?(request:MeetingRequestView):void;onRetry?():void
}){
 const view=useCollectionView({initialFilters:{status:'',priority:'',department:''},initialSort:{key:'submitted',direction:'desc'},initialPageSize:10})
 const filtered=useMemo(()=>requests.filter((request)=>{
  const needle=view.keyword.trim().toLowerCase()
  const keywordMatch=!needle||[request.title,request.code,request.requesterName,request.targetManagerName].some((field)=>field.toLowerCase().includes(needle))
  return keywordMatch
   &&(!view.filters.status||request.status===view.filters.status)
   &&(!view.filters.priority||request.priority===view.filters.priority)
   &&(!view.filters.department||request.departmentId===view.filters.department)
 }),[requests,view.filters,view.keyword])
 const sorted=useMemo(()=>sortRows(filtered,view.sort,requestAccessors),[filtered,view.sort])
 const paged=useMemo(()=>paginate(sorted,view.page,view.pageSize),[sorted,view.page,view.pageSize])
 const activeFilters=useMemo(()=>buildMeetingFilters([
  {key:'status',label:'وضعیت',value:view.filters.status,display:requestStatusLabels[view.filters.status as MeetingRequestView['status']],onRemove:()=>view.clearFilter('status')},
  {key:'priority',label:'اولویت',value:view.filters.priority,display:priorityLabels[view.filters.priority as keyof typeof priorityLabels],onRemove:()=>view.clearFilter('priority')},
  {key:'department',label:'واحد',value:view.filters.department,display:departmentOptions.find((option)=>option.value===view.filters.department)?.label,onRemove:()=>view.clearFilter('department')},
 ]),[view])
 const columns=useMemo<readonly TableColumn<MeetingRequestView>[]>(()=>[
  {key:'title',header:'عنوان درخواست',sortable:true,wrap:true,cell:(request)=><span className="module-cell"><span className="module-cell__primary">{request.title}</span><span className="module-cell__secondary">{request.code}</span></span>},
  {key:'requester',header:'درخواست‌دهنده',sortable:true,cell:(request)=><MeetingPersonCell name={request.requesterName} caption={request.departmentName}/>},
  {key:'manager',header:'مدیر مقصد',hideBelow:'md',cell:(request)=>request.targetManagerName},
  {key:'requested',header:'تاریخ پیشنهادی',sortable:true,cell:(request)=>formatPersianDate(request.requestedDate,{dateStyle:'medium',timeStyle:'short'})},
  {key:'priority',header:'اولویت',align:'center',sortable:true,hideBelow:'sm',cell:(request)=><StatusBadge tone={request.priority==='CRITICAL'?'danger':request.priority==='HIGH'?'warning':'neutral'} label={request.priorityLabel} size="sm"/>},
  {key:'submitted',header:'تاریخ ثبت',sortable:true,hideBelow:'lg',cell:(request)=>formatPersianDate(request.submittedAt,{dateStyle:'short'})},
  {key:'status',header:'وضعیت',sortable:true,cell:(request)=><StatusBadge tone={request.status==='APPROVED'?'success':request.status==='REJECTED'?'danger':'warning'} label={requestStatusLabels[request.status]} size="sm"/>},
 ],[])
 if(error)return <ErrorState title="نمایش درخواست‌های جلسه ممکن نیست" onRetry={onRetry}/>
 return <div className="module-page">
  <Toolbar title="درخواست‌های جلسه" subtitle="درخواست‌های ثبت‌شده برای برگزاری جلسه"/>
  <FilterBar
   searchValue={view.keyword}
   onSearchChange={view.setKeyword}
   searchPlaceholder="جست‌وجو در عنوان، کد یا درخواست‌دهنده…"
   advancedFilters={<>
    <Select label="وضعیت" value={view.filters.status} options={[{value:'',label:'همه وضعیت‌ها'},...Object.entries(requestStatusLabels).map(([value,label])=>({value,label}))]} onChange={(value)=>view.setFilter('status',value??'')}/>
    <Select label="اولویت" value={view.filters.priority} options={[{value:'',label:'همه اولویت‌ها'},...Object.entries(priorityLabels).map(([value,label])=>({value,label}))]} onChange={(value)=>view.setFilter('priority',value??'')}/>
    <Select label="واحد سازمانی" value={view.filters.department} options={[{value:'',label:'همه واحدها'},...departmentOptions]} onChange={(value)=>view.setFilter('department',value??'')} searchable/>
   </>}
   activeFilters={activeFilters}
   onResetAll={view.resetAll}/>
  <SearchSummary total={sorted.length} keyword={view.keyword||undefined} activeFilters={activeFilters} onClear={view.resetAll} label="درخواست"/>
  <Table
   columns={columns}
   rows={paged}
   rowKey={(request)=>request.id}
   caption="فهرست درخواست‌های جلسه"
   sort={view.sort as TableSort|null}
   onSortChange={(sort)=>view.setSort(sort)}
   onRowActivate={onOpenRequest}
   zebra
   stickyHeader
   loading={loading}
   emptyState={<MeetingEmptyState/>}
   pagination={<MeetingPaginationBar page={view.page} pageSize={view.pageSize} total={sorted.length} onPageChange={view.setPage} onPageSizeChange={view.setPageSize}/>}/>
 </div>
}
interface AgendaDraft{id:string;title:string;description:string;duration:string}
/** Meeting creation UI. Submission is delegated to the caller; no business rules here.
 *  Supports three modes: create (fresh), edit (existing meeting), and recreate
 *  (prefilled from an existing meeting but creating a brand-new entity). */
export function CreateMeetingPage({initialMeeting,initialAgenda,recreateFrom,onCancel,onSubmit,onSaveDraft,userId}:{initialMeeting?:MeetingView;initialAgenda?:readonly MeetingAgendaRecord[];recreateFrom?:MeetingView;onCancel?():void;onSubmit?(payload:CreateMeetingPayload):void;onSaveDraft?(payload:CreateMeetingPayload):void;userId?:string}){
 /* ---------- mode detection ---------- */
 const isRecreate=Boolean(recreateFrom)
 const isEdit=Boolean(initialMeeting)&&!isRecreate
 /* Source data for prefill: prefer recreateFrom when present */
 const source=recreateFrom??initialMeeting

 /* ---------- deep-clone agenda from source (no shared references) ---------- */
 const [agenda,setAgenda]=useState<readonly AgendaDraft[]>(()=>initialAgenda?.length?initialAgenda.map((item)=>({id:item.id,title:item.title,description:item.description??'',duration:String(item.durationMinutes)})):[{id:'agenda-1',title:'',description:'',duration:'15'}])

 /* ---------- participants: deep-clone array ---------- */
 const [participants,setParticipants]=useState<readonly string[]>(source?.participantIds?[...source.participantIds]:[])
 const [attachments,setAttachments]=useState<readonly File[]>([])
 const [mode,setMode]=useState<string>(source?.mode??'IN_PERSON')
 /* ---------- Date: today for recreate (user picks new date), today for new create, source for edit ---------- */
 const todayStr=new Date().toISOString().slice(0,10)
 const [date,setDate]=useState<string|undefined>(isRecreate?todayStr:initialMeeting?.startTime.slice(0,10)??todayStr)
 const [startTime,setStartTime]=useState(source?.startTime?.slice(11,16)??'09:00')
 const [endTime,setEndTime]=useState(source?.endTime?.slice(11,16)??'10:00')
 const [participantDepartment,setParticipantDepartment]=useState<string>('')
 const [_durationError,_setDurationError]=useState<string|undefined>()

 /* ---------- Double-submit guard ---------- */
 const [submitting,setSubmitting]=useState(false)

 /* ---------- Name validation state ---------- */
 const [nameError,setNameError]=useState<string|undefined>()
 const validateName=(value:string)=>{
  const trimmed=value.trim()
  if(!trimmed){setNameError('عنوان جلسه نمی‌تواند خالی باشد.');return false}
  if(!isMeetingNameUnique(trimmed)){setNameError('جلسه‌ای با این نام قبلاً وجود دارد. لطفاً نام دیگری انتخاب کنید.');return false}
  setNameError(undefined)
  return true
 }

 const moveAgenda=(index:number,offset:number)=>setAgenda((items)=>{
  const target=index+offset
  if(target<0||target>=items.length)return items
  const next=[...items]
  const [moved]=next.splice(index,1)
  next.splice(target,0,moved)
  return next
 })
 /* Filter available participants by department and exclude the meeting creator */
 const availableParticipants=useMemo(()=>{
  return userOptions.filter((option)=>{
   if(userId&&option.value===userId)return false
   if(participantDepartment){const user=findDemoUser(option.value);if(user&&user.departmentId!==participantDepartment)return false}
   return true
  })
 },[participantDepartment,userId])

 /* Validate agenda total duration against meeting duration */
 const validateDuration=useMemo(()=>{
  const totalAgendaMinutes=agenda.reduce((sum,item)=>sum+(Number(item.duration)||0),0)
  const [sh,sm]=startTime.split(':').map(Number)
  const [eh,em]=endTime.split(':').map(Number)
  const meetingMinutes=(eh*60+em)-(sh*60+sm)
  if(meetingMinutes<=0)return 'ساعت پایان باید بعد از ساعت شروع باشد.'
  if(totalAgendaMinutes>meetingMinutes)return `مجموع زمان موضوعات (${totalAgendaMinutes} دقیقه) از مدت جلسه (${meetingMinutes} دقیقه) بیشتر است.`
  return undefined
 },[agenda,startTime,endTime])

 const buildPayload=():CreateMeetingPayload=>{
  const data=new FormData(document.querySelector('.meeting-create-form') as HTMLFormElement)
  const title=String(data.get('title')??'')
  const type=String(data.get('type')??'INTERNAL')
  const location=String(data.get('location')??'')
  return{
   title,
   purpose:String(data.get('purpose')??''),
   description:String(data.get('description')??''),
   type:type||undefined,
   mode,
   location:location||undefined,
   onlineUrl:String(data.get('onlineUrl')??'')||undefined,
   startTime:`${date}T${startTime}:00`,
   endTime:`${date}T${endTime}:00`,
   participantIds:participants,
   agendaItems:agenda.map((item)=>({title:item.title,description:item.description,durationMinutes:Number(item.duration)||15})),
  }
 }
 const submit=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault()
  if(submitting)return
  const data=new FormData(event.currentTarget)
  const title=String(data.get('title')??'')
  if(!title.trim()){alert('عنوان جلسه الزامی است.');return}
  /* Unique name validation */
  if(!isMeetingNameUnique(title.trim(),initialMeeting?.id)){alert('جلسه‌ای با این نام قبلاً وجود دارد. لطفاً نام دیگری انتخاب کنید.');return}
  if(!date||!startTime||!endTime){alert('تاریخ و ساعت شروع و پایان الزامی است.');return}
  const startISO=`${date}T${startTime}:00`
  const endISO=`${date}T${endTime}:00`
  if(new Date(endISO).getTime()<new Date(startISO).getTime()){alert('ساعت پایان نمی‌تواند قبل از ساعت شروع باشد.');return}
  if(validateDuration){alert(validateDuration);return}
  setSubmitting(true)
  onSubmit?.(buildPayload())
 }
 const handleSaveDraft=()=>{
  if(submitting)return
  setSubmitting(true)
  onSaveDraft?.(buildPayload())
 }
 const pageTitle=isRecreate?'ایجاد مجدد جلسه':isEdit?'ویرایش جلسه':'ایجاد جلسه'
 const submitLabel=isRecreate?'ثبت جلسه جدید':initialMeeting?.status==='DRAFT'?'زمان‌بندی جلسه':initialMeeting?'ذخیره تغییرات':'ثبت جلسه'
 return <div className="module-page">
  <Toolbar title={pageTitle} subtitle="ثبت اطلاعات، زمان‌بندی، شرکت‌کنندگان و دستور جلسه"/>
  <Form className="meeting-create-form" onSubmit={(event)=>{event.preventDefault();submit(event)}}>
   <FormSection title="اطلاعات پایه" description="عنوان، نوع و هدف جلسه">
    <TextField label="عنوان جلسه" name="title" defaultValue={isRecreate?'':initialMeeting?.title} required placeholder="مثال: جلسه بررسی عملکرد ماهانه"
     onChange={(e)=>validateName(e.target.value)}/>
    {nameError&&<p className="text-danger" style={{color:'var(--color-danger,#dc3545)',marginTop:4,fontSize:'0.85em'}}>{nameError}</p>}
    <Select label="نوع جلسه" name="type" defaultValue={source?.type??'INTERNAL'} options={[{value:'INTERNAL',label:'داخلی'},{value:'DEPARTMENT',label:'واحد سازمانی'},{value:'PROJECT',label:'پروژه‌ای'},{value:'WEEKLY',label:'هفتگی'}]}/>
    <TextField label="هدف جلسه" name="purpose" defaultValue={source?.purpose} placeholder="هدف اصلی برگزاری جلسه"/>
    <TextArea label="توضیحات" name="description" defaultValue={source?.description} rows={3} placeholder="توضیحات تکمیلی"/>
   </FormSection>
   <FormSection className="meeting-create-form__schedule" title="زمان‌بندی جلسه" description="تاریخ شمسی و ساعت محلی برگزاری">
     <DatePicker label="تاریخ برگزاری (شمسی)" name="date" calendar="jalali" value={date} onChange={setDate} required clearable={false} helperText={isRecreate?'تاریخ امروز به‌صورت پیش‌فرض انتخاب شده است. در صورت نیاز تغییر دهید.':'تاریخ امروز به‌صورت پیش‌فرض انتخاب شده است.'}/>
     <TimePicker label="ساعت شروع" name="startTime" value={startTime} onChange={setStartTime} required/>
     <TimePicker label="ساعت پایان" name="endTime" value={endTime} onChange={setEndTime} min={startTime} required/>
    </FormSection>
   <FormSection title="محل برگزاری" description="حضوری، آنلاین یا ترکیبی">
    <Select label="شیوه برگزاری" name="mode" value={mode} onChange={(value)=>setMode(value??'IN_PERSON')} options={[{value:'IN_PERSON',label:'حضوری'},{value:'ONLINE',label:'آنلاین'},{value:'HYBRID',label:'ترکیبی'}]}/>
    <TextField label="سالن / اتاق جلسه" name="location" defaultValue={source?.location} placeholder="مثال: اتاق کنفرانس مرکزی"/>
    {mode!=='IN_PERSON'&&<TextField label="نشانی جلسه آنلاین" name="onlineUrl" defaultValue={source?.onlineUrl} placeholder="https://"/>}
   </FormSection>
   <FormSection title="شرکت‌کنندگان" description={`${formatNumber(participants.length)} نفر انتخاب شده`}>
    <Select label="فیلتر بر اساس واحد" options={[{value:'',label:'همه واحدها'},...departmentOptions]} value={participantDepartment} onChange={(value)=>setParticipantDepartment(value??'')} searchable/>
    <MultiSelect label="افزودن شرکت‌کنندگان" options={availableParticipants} value={participants} onChange={(values)=>setParticipants(values)} placeholder="انتخاب چند نفر به صورت همزمان"/>
    <ul className="meeting-participant-picker">
     {participants.map((participantId)=>{
      const person=userOptions.find((option)=>option.value===participantId)
      return <li key={participantId}>
       <MeetingPersonCell name={person?.label??participantId}/>
       <Button size="sm" variant="ghost" onClick={()=>setParticipants((current)=>current.filter((id)=>id!==participantId))} aria-label={`حذف ${person?.label??''}`}>حذف</Button>
      </li>
     })}
    </ul>
   </FormSection>
   <FormSection title="دستور جلسه" description="موضوعات و ترتیب بررسی">
    {validateDuration&&<p className="text-danger" style={{color:'var(--color-danger,#dc3545)',marginBottom:8}}>{validateDuration}</p>}
    <ol className="meeting-agenda-editor">
     {agenda.map((item,index)=><li key={item.id}>
      <span className="meeting-agenda-editor__index">{formatNumber(index+1)}</span>
      <TextField label="عنوان موضوع" value={item.title} onChange={(event)=>setAgenda((items)=>items.map((entry)=>entry.id===item.id?{...entry,title:event.target.value}:entry))}/>
      <TextField label="مدت (دقیقه)" type="number" min={5} step={5} value={item.duration} onChange={(event)=>setAgenda((items)=>items.map((entry)=>entry.id===item.id?{...entry,duration:event.target.value}:entry))}/>
      <div className="meeting-agenda-editor__actions">
       <Button size="sm" variant="ghost" onClick={()=>moveAgenda(index,-1)} aria-label="انتقال موضوع به بالا">بالا</Button>
       <Button size="sm" variant="ghost" onClick={()=>moveAgenda(index,1)} aria-label="انتقال موضوع به پایین">پایین</Button>
       <Button size="sm" variant="danger" onClick={()=>setAgenda((items)=>items.filter((entry)=>entry.id!==item.id))} aria-label="حذف موضوع">حذف</Button>
      </div>
     </li>)}
    </ol>
    <Button variant="secondary" size="sm" startIcon={<Icon name="plus" size="sm"/>} onClick={()=>setAgenda((items)=>[...items,{id:`agenda-${items.length+1}-${Date.now()}`,title:'',description:'',duration:'15'}])}>افزودن موضوع</Button>
   </FormSection>
   <FormSection title="پیوست‌ها" description="مستندات مرتبط با جلسه">
    <FileInput label="بارگذاری فایل" multiple files={attachments} onChange={setAttachments} helperText="فایل‌ها را بکشید و رها کنید یا از دستگاه انتخاب کنید"/>
   </FormSection>
   <FormActions>
    <Button type="submit" disabled={submitting}>{submitting?'در حال پردازش…':submitLabel}</Button>
    {!isRecreate&&<Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={submitting}>ذخیره پیش‌نویس</Button>}
    <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>انصراف</Button>
   </FormActions>
  </Form>
 </div>
}
/** Meeting details page built from PropertyList / DescriptionList primitives. */
export function MeetingDetailsPage({meeting,participants:_participants,agendaCount,attachmentsCount,onOpenWorkspace,onOpenCalendar,onEdit,editLabel='ویرایش',onRecreate,onCancelMeeting,onDelete}:{
 meeting:MeetingView;participants?:number;agendaCount?:number;attachmentsCount?:number;onOpenWorkspace?():void;onOpenCalendar?():void;onEdit?():void;editLabel?:string;onRecreate?():void;onCancelMeeting?():void;onDelete?():void
}){
 const [confirmDelete,setConfirmDelete]=useState(false)
 return <div className="module-page">
  <Toolbar
   title={meeting.title}
   subtitle={`${meeting.code} · ${meeting.typeLabel}`}
   actions={<>
    {onOpenWorkspace&&<Button onClick={onOpenWorkspace}>میز کار جلسه</Button>}
    {onOpenCalendar&&<Button variant="secondary" onClick={onOpenCalendar}>تقویم</Button>}
    {onEdit&&<Button variant="secondary" onClick={onEdit}>{editLabel}</Button>}
    {onRecreate&&<Button variant="secondary" startIcon={<Icon name="plus" size="sm"/>} onClick={onRecreate}>ایجاد مجدد جلسه</Button>}
    {onCancelMeeting&&meeting.status!=='CANCELLED'&&meeting.status!=='COMPLETED'&&<Button variant="warning" onClick={onCancelMeeting}>لغو جلسه</Button>}
    {onDelete&&<Button variant="danger" onClick={()=>setConfirmDelete(true)}>حذف</Button>}
   </>}/>
  <WorkPanel title="مشخصات جلسه" icon="calendar">
   <PropertyList items={[
    {key:'status',label:'وضعیت',value:<StatusBadge tone={meetingStatusTone(meeting.status)} label={meetingStatusLabels[meeting.status]} size="sm"/>},
    {key:'organizer',label:'برگزارکننده',value:meeting.organizerName,icon:'user'},
    {key:'department',label:'واحد سازمانی',value:meeting.departmentName,icon:'building'},
    {key:'date',label:'تاریخ',value:formatPersianDate(meeting.startTime,{dateStyle:'full'}),icon:'calendar'},
    {key:'time',label:'ساعت',value:`${formatPersianDate(meeting.startTime,{timeStyle:'short'})} تا ${formatPersianDate(meeting.endTime,{timeStyle:'short'})}`,icon:'clock'},
    {key:'location',label:'محل برگزاری',value:`${meeting.location} · ${meeting.modeLabel}`,icon:'building'},
    {key:'purpose',label:'هدف جلسه',value:meeting.purpose,multiline:true,fullWidth:true},
    {key:'description',label:'توضیحات',value:meeting.description,multiline:true,fullWidth:true},
   ]}/>
  </WorkPanel>
  <WorkPanel title="خلاصه وضعیت" icon="chart">
   <DescriptionList
    layout="horizontal"
    items={[
     {key:'participants',term:'شرکت‌کنندگان',description:formatNumber(_participants??meeting.participantCount)},
     {key:'agenda',term:'موضوعات دستور جلسه',description:formatNumber(agendaCount??0)},
     {key:'attachments',term:'پیوست‌ها',description:formatNumber(attachmentsCount??0)},
     {key:'created',term:'تاریخ ایجاد',description:formatPersianDate(meeting.createdAt,{dateStyle:'medium'})},
     {key:'updated',term:'آخرین بروزرسانی',description:formatPersianDate(meeting.updatedAt,{dateStyle:'medium',timeStyle:'short'})},
    ]}/>
  </WorkPanel>
  <ConfirmDialog open={confirmDelete} title="حذف جلسه؟" description="جلسه و اطلاعات زمان‌بندی آن حذف می‌شود؛ وظایف و مصوبات ثبت‌شده برای حفظ سابقه باقی می‌مانند." confirmLabel="حذف جلسه" cancelLabel="انصراف" onCancel={()=>setConfirmDelete(false)} onConfirm={()=>{setConfirmDelete(false);onDelete?.()}}/>
 </div>
}
