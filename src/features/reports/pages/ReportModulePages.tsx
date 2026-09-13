import {useMemo,useState} from 'react'
import {Avatar,Button,DataCard,DescriptionList,EmptyState,ErrorState,FileInput,FilterBar,FormActions,FormSection,Icon,KPIGrid,KPIWidget,Modal,Pagination,PropertyList,SearchSummary,Select,StatusBadge,Table,Tag,TextArea,TextField,Timeline,Toolbar,ViewSwitcher,type TableColumn,type TableSort} from '../../../components/ui'
import {AttachmentsPanel,QuickActionsPanel,RelatedLinksPanel,WorkPanel} from '../../../components/work'
import {departmentOptions,filesForEntity,reportViews,userOptions,type ReportView} from '../../../demo'
import {formatNumber,formatPersianDate,formatRelativeTime} from '../../../core/utils'
import {paginate,sortRows,useCollectionView} from '../../../hooks/useCollectionView'
import {reportChainSteps,reportStageLabels,reportStageOptions,reportStageTone,reportStatusLabels,reportStatusOptions,reportTypeOptions} from './reportPresentation'
type ReportFilters={status:string;department:string;author:string;period:string;stage:string}
const emptyFilters:ReportFilters={status:'',department:'',author:'',period:'',stage:''}
const sortAccessors:Readonly<Record<string,(report:ReportView)=>string|number>>={
 code:(report)=>report.code,title:(report)=>report.title,author:(report)=>report.authorName,status:(report)=>report.status,
 period:(report)=>report.period,submittedAt:(report)=>new Date(report.submittedAt).getTime(),
}
const matches=(report:ReportView,keyword:string,filters:ReportFilters)=>{
 const term=keyword.trim()
 if(term&&!`${report.title} ${report.code} ${report.authorName} ${report.departmentName}`.includes(term))return false
 if(filters.status&&report.status!==filters.status)return false
 if(filters.stage&&report.stage!==filters.stage)return false
 if(filters.department&&report.departmentId!==filters.department)return false
 if(filters.author&&report.authorId!==filters.author)return false
 if(filters.period&&report.period!==filters.period)return false
 return true
}
const periodOptions=[{value:'',label:'همه دوره‌ها'},...[...new Set(reportViews.map((report)=>report.period))].map((period)=>({value:period,label:period}))]
export interface ReportsCollectionPageProps{reports?:readonly ReportView[];title?:string;description?:string;loading?:boolean;error?:boolean;onOpenReport?(report:ReportView):void;onCreateReport?():void;onRetry?():void}
export function ReportsCollectionPage({reports=reportViews,title='گزارش‌ها',description,loading=false,error=false,onOpenReport,onCreateReport,onRetry}:ReportsCollectionPageProps){
 const view=useCollectionView<ReportFilters>({initialFilters:emptyFilters,initialSort:{key:'submittedAt',direction:'desc'},initialPageSize:10})
 const [display,setDisplay]=useState<'table'|'cards'>('table')
 const filtered=useMemo(()=>reports.filter((report)=>matches(report,view.keyword,view.filters)),[reports,view.filters,view.keyword])
 const sorted=useMemo(()=>sortRows(filtered,view.sort,sortAccessors),[filtered,view.sort])
 const paged=useMemo(()=>paginate(sorted,view.page,view.pageSize),[sorted,view.page,view.pageSize])
 const stats=useMemo(()=>({
  total:reports.length,
  pending:reports.filter((report)=>report.status==='SUBMITTED'||report.status==='UNDER_REVIEW').length,
  approved:reports.filter((report)=>report.status==='APPROVED').length,
  rejected:reports.filter((report)=>report.status==='REJECTED').length,
 }),[reports])
 const columns=useMemo<readonly TableColumn<ReportView>[]>(()=>[
  {key:'code',header:'کد',sortable:true,width:'xs',cell:(report)=><span className="module-cell__secondary">{report.code}</span>},
  {key:'title',header:'عنوان گزارش',sortable:true,wrap:true,width:'lg',cell:(report)=><span className="module-cell"><span className="module-cell__primary">{report.title}</span><span className="module-cell__secondary">{report.type}</span></span>},
  {key:'author',header:'تهیه‌کننده',sortable:true,width:'md',cell:(report)=><span className="module-person"><Avatar name={report.authorName} alt={report.authorName} size="xs"/><span className="module-cell"><span className="module-cell__primary">{report.authorName}</span><span className="module-cell__secondary">{report.departmentName}</span></span></span>},
  {key:'period',header:'دوره',sortable:true,width:'sm',hideBelow:'md',cell:(report)=><Tag size="sm">{report.period}</Tag>},
  {key:'status',header:'وضعیت',sortable:true,width:'sm',cell:(report)=><StatusBadge status={report.status} label={reportStatusLabels[report.status]} size="sm"/>},
  /* «در انتظار چه کسی» is the question a reviewer actually asks of this list. */
  {key:'stage',header:'مرحله تأیید',sortable:false,width:'md',hideBelow:'md',cell:(report)=><Tag tone={reportStageTone[report.stage]} size="sm">{reportStageLabels[report.stage]}</Tag>},
  {key:'submittedAt',header:'تاریخ ثبت',sortable:true,width:'md',cell:(report)=><span className="module-cell"><time dateTime={report.submittedAt}>{formatPersianDate(report.submittedAt,{dateStyle:'medium'})}</time><span className="module-cell__secondary">{formatRelativeTime(report.submittedAt)}</span></span>},
 ],[])
 const activeFilters=[
  view.filters.status?{key:'status',label:'وضعیت',value:reportStatusLabels[view.filters.status as ReportView['status']],onRemove:()=>view.clearFilter('status')}:null,
  view.filters.stage?{key:'stage',label:'مرحله',value:reportStageLabels[view.filters.stage as ReportView['stage']],onRemove:()=>view.clearFilter('stage')}:null,
  view.filters.department?{key:'department',label:'واحد',value:departmentOptions.find((item)=>item.value===view.filters.department)?.label??'',onRemove:()=>view.clearFilter('department')}:null,
  view.filters.author?{key:'author',label:'تهیه‌کننده',value:userOptions.find((item)=>item.value===view.filters.author)?.label??'',onRemove:()=>view.clearFilter('author')}:null,
  view.filters.period?{key:'period',label:'دوره',value:view.filters.period,onRemove:()=>view.clearFilter('period')}:null,
 ].filter(Boolean) as {key:string;label:string;value:string;onRemove():void}[]
 if(error)return <ErrorState title="نمایش گزارش‌ها ممکن نیست" onRetry={onRetry}/>
 return <div className="module-page">
  <Toolbar title={title} subtitle={description} actions={<>
   <ViewSwitcher<'table'|'cards'> views={[{id:'table',label:'جدول'},{id:'cards',label:'کارت'}]} value={display} onChange={setDisplay}/>
   {onCreateReport&&<Button startIcon={<Icon name="plus" size="sm"/>} onClick={onCreateReport}>گزارش جدید</Button>}
  </>}/>
  <KPIGrid columns={4}>
   <KPIWidget title="کل گزارش‌ها" value={stats.total} icon="report" loading={loading}/>
   <KPIWidget title="در انتظار بررسی" value={stats.pending} icon="clock" tone="warning" loading={loading} onActivate={()=>view.setFilter('status','SUBMITTED')} actionLabel="نمایش گزارش‌های در انتظار"/>
   <KPIWidget title="تأییدشده" value={stats.approved} icon="check-square" tone="success" loading={loading} onActivate={()=>view.setFilter('status','APPROVED')} actionLabel="نمایش گزارش‌های تأییدشده"/>
   <KPIWidget title="بازگشت‌داده‌شده" value={stats.rejected} icon="alert" tone="danger" loading={loading} onActivate={()=>view.setFilter('status','REJECTED')} actionLabel="نمایش گزارش‌های بازگشتی"/>
  </KPIGrid>
  <FilterBar
   searchValue={view.keyword}
   onSearchChange={view.setKeyword}
   searchPlaceholder="جست‌وجو در عنوان، کد یا تهیه‌کننده…"
   advancedFilters={<>
     <Select label="وضعیت" options={reportStatusOptions} value={view.filters.status} onChange={(value)=>view.setFilter('status',value??'')}/>
     <Select label="مرحله تأیید" options={reportStageOptions} value={view.filters.stage} onChange={(value)=>view.setFilter('stage',value??'')}/>
    <Select label="واحد سازمانی" options={[{value:'',label:'همه واحدها'},...departmentOptions]} value={view.filters.department} onChange={(value)=>view.setFilter('department',value??'')} searchable/>
    <Select label="تهیه‌کننده" options={[{value:'',label:'همه کاربران'},...userOptions]} value={view.filters.author} onChange={(value)=>view.setFilter('author',value??'')} searchable/>
    <Select label="دوره گزارش" options={periodOptions} value={view.filters.period} onChange={(value)=>view.setFilter('period',value??'')}/>
   </>}
   activeFilters={activeFilters}
   onResetAll={view.resetAll}
  />
  <SearchSummary total={sorted.length} keyword={view.keyword||undefined} activeFilters={activeFilters} onClear={view.resetAll} label="گزارش"/>
  {display==='table'?<Table
   columns={columns}
   rows={paged}
   rowKey={(report)=>report.id}
   caption="فهرست گزارش‌ها"
   sort={view.sort as TableSort|null}
   onSortChange={(sort)=>view.setSort(sort)}
   selectable
   selectedKeys={view.selection}
   onSelectionChange={view.setSelection}
   onRowActivate={onOpenReport}
   zebra
   loading={loading}
   emptyState={<EmptyState icon="report" title="گزارشی یافت نشد" description="با تغییر فیلترها دوباره تلاش کنید." primaryAction={onCreateReport&&<Button onClick={onCreateReport}>ثبت گزارش</Button>}/>}
   rowActions={(report)=><Button size="sm" variant="ghost" onClick={()=>onOpenReport?.(report)}>مشاهده</Button>}
   renderExpanded={(report)=><p>{report.summary}</p>}
   pagination={<Pagination page={view.page} pageSize={view.pageSize} total={sorted.length} onPageChange={view.setPage} onPageSizeChange={view.setPageSize}/>}
  />:<>
   <div className="module-grid module-grid--cards">
    {paged.map((report)=><DataCard
     key={report.id}
     title={report.title}
     subtitle={`${report.code} · ${report.departmentName}`}
     icon="report"
     badge={<StatusBadge status={report.status} label={reportStatusLabels[report.status]} size="sm"/>}
     description={report.summary}
     footer={<span className="module-cell__secondary">{report.authorName} · {formatPersianDate(report.submittedAt,{dateStyle:'short'})}</span>}
     onActivate={()=>onOpenReport?.(report)}
    />)}
   </div>
   <Pagination page={view.page} pageSize={view.pageSize} total={sorted.length} onPageChange={view.setPage} onPageSizeChange={view.setPageSize}/>
  </>}
 </div>
}
export function MyReportsPage({userId,onOpenReport,onCreateReport}:{userId:string;onOpenReport?(report:ReportView):void;onCreateReport?():void}){
 const mine=useMemo(()=>reportViews.filter((report)=>report.authorId===userId),[userId])
 return <ReportsCollectionPage reports={mine} title="گزارش‌های من" description="گزارش‌های ثبت‌شده توسط شما" onOpenReport={onOpenReport} onCreateReport={onCreateReport}/>
}
/** Tabbed view for department manager: "my reports" / "employee reports" */
export function DepartmentManagerReportsPage({userId,departmentId,onOpenReport,onCreateReport}:{userId:string;departmentId?:string;onOpenReport?(report:ReportView):void;onCreateReport?():void}){
 const [activeTab,setActiveTab]=useState<'mine'|'employees'>('mine')
 const mine=useMemo(()=>reportViews.filter((report)=>report.authorId===userId),[userId])
 const employees=useMemo(()=>departmentId?reportViews.filter((report)=>report.departmentId===departmentId&&report.authorId!==userId):reportViews.filter((report)=>report.authorId!==userId),[departmentId,userId])
 const reports=activeTab==='mine'?mine:employees
 const tabTitle=activeTab==='mine'?'گزارش‌های خودم':'گزارش‌های کارکنان واحد'
 const tabDescription=activeTab==='mine'?'گزارش‌هایی که مستقیماً برای مدیرعامل ثبت کرده‌اید':'فقط گزارش‌های کارکنان همین واحد؛ تأیید شما آن‌ها را برای مدیرعامل ارسال می‌کند'
 const showCreate=activeTab==='mine'?onCreateReport:undefined
 return <div className="module-page">
  <div className="module-tabs" role="tablist">
   <button role="tab" aria-selected={activeTab==='mine'} onClick={()=>setActiveTab('mine')} className={activeTab==='mine'?'active':''}>گزارش‌های خودم</button>
   <button role="tab" aria-selected={activeTab==='employees'} onClick={()=>setActiveTab('employees')} className={activeTab==='employees'?'active':''}>گزارش‌های کارکنان واحد</button>
  </div>
  <ReportsCollectionPage reports={reports} title={tabTitle} description={tabDescription} onOpenReport={onOpenReport} onCreateReport={showCreate}/>
 </div>
}
/** Only the reports sitting on *this* viewer's desk.
    `stage` is the source of truth: a department manager sees reports of their own
    unit awaiting the first signature, the CEO sees those already cleared by a
    manager. Passing `stage` explicitly keeps the queue honest for each role. */
export function ReportReviewQueuePage({departmentId,reports,stage,onOpenReport}:{departmentId?:string;reports?:readonly ReportView[];stage?:ReportView['stage'];onOpenReport?(report:ReportView):void}){
 const source=reports??reportViews
 const queue=useMemo(()=>source.filter((report)=>{
  if(stage)return report.stage===stage&&(stage!=='DEPARTMENT'||!departmentId||report.departmentId===departmentId)
  return (report.stage==='DEPARTMENT'||report.stage==='EXECUTIVE')&&(!departmentId||report.departmentId===departmentId)
 }),[departmentId,source,stage])
 const description=stage==='DEPARTMENT'?'گزارش‌های کارمندان واحد که در انتظار تأیید شماست'
  :stage==='EXECUTIVE'?'گزارش‌هایی که مدیر واحد تأیید کرده و در انتظار تأیید نهایی شماست'
  :'گزارش‌هایی که نیازمند بررسی هستند'
 return <ReportsCollectionPage reports={queue} title="گزارش‌های در انتظار بررسی" description={description} onOpenReport={onOpenReport}/>
}
export interface CreateReportPageProps{
 onCancel?():void
 onSubmit?(payload:Readonly<Record<string,unknown>>):void
 submitting?:boolean
 /** Tasks handed to this user, so the report can be tied to the meeting that ordered it. */
 linkableTasks?:readonly {value:string;label:string;description?:string}[]
 /** Preselected task when the user starts the report from a task/resolution. */
 defaultTaskId?:string
}
export function CreateReportPage({onCancel,onSubmit,submitting=false,linkableTasks=[],defaultTaskId}:CreateReportPageProps){

 const [title,setTitle]=useState('')
 const [summary,setSummary]=useState('')
 const [department,setDepartment]=useState<string|undefined>()
 const [period,setPeriod]=useState<string|undefined>()
 const [type,setType]=useState<string|undefined>('عملکردی')
 /* A report is usually written to answer a meeting resolution. Picking the task
    here stamps the report with both the task and the meeting that ordered it. */
 const [taskId,setTaskId]=useState<string|undefined>(defaultTaskId)
 const [files,setFiles]=useState<readonly File[]>([])
 const [touched,setTouched]=useState(false)
 const titleError=touched&&!title.trim()?'عنوان گزارش را وارد کنید.':undefined
 const summaryError=touched&&summary.trim().length<20?'خلاصه گزارش حداقل ۲۰ نویسه باشد.':undefined
 const payload=(extra?:Readonly<Record<string,unknown>>)=>({title,summary,department,period,type,files,taskId,...extra})
 return <form className="module-form" noValidate onSubmit={(event)=>{event.preventDefault();setTouched(true);if(title.trim()&&summary.trim().length>=20)onSubmit?.(payload())}}>

  <FormSection title="اطلاعات گزارش">
   <TextField label="عنوان گزارش" required value={title} onChange={(event)=>setTitle(event.target.value)} error={titleError} maxLength={120} showCounter/>
   <Select label="نوع گزارش" options={reportTypeOptions} value={type} onChange={setType}/>
   <Select label="واحد سازمانی" options={departmentOptions} value={department} onChange={setDepartment} searchable clearable/>
   <Select label="دوره گزارش" options={periodOptions.slice(1)} value={period} onChange={setPeriod}/>
   {linkableTasks.length>0&&<Select
    label="مربوط به وظیفه/مصوبه جلسه"
    options={[{value:'',label:'گزارش مستقل (بدون جلسه)'},...linkableTasks]}
    value={taskId??''}
    onChange={(value)=>setTaskId(value||undefined)}
    searchable
    helperText="با انتخاب وظیفه، گزارش شما به جلسه‌ای که این مصوبه در آن تصویب شده متصل می‌شود."
   />}
  </FormSection>

  <FormSection title="محتوای گزارش" description="خلاصه فعالیت‌ها، نتایج و پیشنهادها را بنویسید.">
   <TextArea label="خلاصه گزارش" required value={summary} onChange={(event)=>setSummary(event.target.value)} error={summaryError} rows={8} maxLength={2000} showCounter autoResize/>
  </FormSection>
  <FormSection title="پیوست‌ها" description="مستندات پشتیبان گزارش را بارگذاری کنید.">
   <FileInput files={files} onChange={setFiles} multiple label="فایل‌های پیوست" helperText="حداکثر حجم هر فایل ۱۰ مگابایت" maxSize={10_485_760}/>
  </FormSection>
  <FormActions className="module-form__actions">
   {onCancel&&<Button type="button" variant="ghost" onClick={onCancel}>انصراف</Button>}
   <Button type="button" variant="secondary" onClick={()=>onSubmit?.(payload({draft:true}))}>ذخیره پیش‌نویس</Button>

   <Button type="submit" loading={submitting}>ارسال گزارش</Button>
  </FormActions>
 </form>
}
/** Horizontal stepper of the approval chain, so everyone can see how far the
    report has travelled and where it stands right now. */
function ReportChain({report}:{report:ReportView}){
 const stage:ReportView['stage']=report.stage
 const reached=(step:ReportView['stage'])=>{
  if(stage==='COMPLETED')return true
  if(step==='DEPARTMENT')return report.reviews.some((entry)=>entry.stage==='DEPARTMENT'&&entry.decision==='APPROVED')||stage==='EXECUTIVE'
  return false
 }
 /* A manager report never passes the department desk, so that step is hidden
    rather than shown as permanently unreached. */
 const steps=report.reviews.some((entry)=>entry.stage==='DEPARTMENT')||report.stage==='DEPARTMENT'
  ?reportChainSteps
  :reportChainSteps.filter((step)=>step.stage!=='DEPARTMENT')
 return <ol className="report-chain">
  {steps.map((step)=>{
   const current=report.stage===step.stage
   const done=reached(step.stage)
   return <li key={step.stage} className={`report-chain__step${current?' report-chain__step--current':''}${done?' report-chain__step--done':''}`}>
    <Icon name={done?'check-square':'clock'} size="sm"/>
    <span className="report-chain__label">{step.label}</span>
   </li>
  })}
 </ol>
}

export function ReportDetailsPage({report,onBack,onOpenRelated,canReview,onReview,canResubmit,onResubmit}:{report:ReportView;onBack?():void;onOpenRelated?(kind:string,id:string):void;canReview?:boolean;onReview?(approved:boolean,comment?:string):void;canResubmit?:boolean;onResubmit?(summary?:string):void}){
 const [correctionOpen,setCorrectionOpen]=useState(false)
 const [comment,setComment]=useState('')
 /* The author's correction round: the report comes back with the reviewer's
    note, is edited here and sent up the chain again. */
 const [resubmitOpen,setResubmitOpen]=useState(false)
 const [revisedSummary,setRevisedSummary]=useState(report.summary)
 const lastReturn=useMemo(()=>[...report.reviews].reverse().find((entry)=>entry.decision==='RETURNED'),[report.reviews])
 const attachments=useMemo(()=>filesForEntity('REPORT',report.id).map((file)=>({id:file.id,name:file.name,mimeType:file.mimeType,sizeBytes:file.sizeBytes,uploaderName:file.uploaderName,uploadedAt:file.uploadedAt})),[report.id])
 const confirmCorrection=()=>{if(!onReview)return;onReview(false,comment);setComment('');setCorrectionOpen(false)}
 return <div className="module-page">
  <Toolbar title={report.title} subtitle={`${report.code} · ${report.departmentName}`} actions={<>
   {onBack&&<Button variant="ghost" startIcon={<Icon name="arrow-back" size="sm" directional/>} onClick={onBack}>بازگشت</Button>}
   <Tag tone={reportStageTone[report.stage]}>{reportStageLabels[report.stage]}</Tag>
   <StatusBadge status={report.status} label={reportStatusLabels[report.status]}/>
  </>}/>
  <WorkPanel title="مسیر تأیید" icon="workflow"><ReportChain report={report}/></WorkPanel>
  {/* Review is offered only to the desk the report is actually waiting on; the
      caller decides that with `canReview`. */}
  {canReview&&(report.stage==='DEPARTMENT'||report.stage==='EXECUTIVE')&&<WorkPanel title="بررسی گزارش" icon="shield">
   <DescriptionList layout="horizontal" compact items={[
    {key:'author',term:'تهیه‌کننده',description:report.authorName},
    {key:'stage',term:'مرحله فعلی',description:reportStageLabels[report.stage]},
    {key:'next',term:'در صورت تأیید',description:report.stage==='DEPARTMENT'?'ارسال به مدیر عامل':'تأیید نهایی گزارش'},
   ]}/>
   <div className="button-row">
    {onReview&&<Button onClick={()=>onReview(true)}>{report.stage==='DEPARTMENT'?'تأیید و ارسال به مدیر عامل':'تأیید نهایی'}</Button>}
    {onReview&&<Button variant="danger" onClick={()=>setCorrectionOpen(true)}>بازگشت برای اصلاح</Button>}
   </div>
  </WorkPanel>}
  {/* The author's side of the loop. */}
  {canResubmit&&report.stage==='AUTHOR'&&<WorkPanel title="اصلاح و ارسال مجدد" icon="alert">
   {lastReturn&&<DescriptionList layout="horizontal" compact items={[
    {key:'by',term:'بازگشت‌دهنده',description:`${lastReturn.reviewerName} (${lastReturn.stage==='DEPARTMENT'?'مدیر واحد':'مدیر عامل'})`},
    {key:'why',term:'دلیل بازگشت',description:lastReturn.comment??'—'},
   ]}/>}
   <div className="button-row"><Button onClick={()=>{setRevisedSummary(report.summary);setResubmitOpen(true)}}>اصلاح و ارسال مجدد</Button></div>
  </WorkPanel>}
  {report.reviews.length>0&&<WorkPanel title="سوابق تأیید" icon="shield" count={report.reviews.length}>
   <Timeline items={report.reviews.map((entry)=>({
    id:entry.id,
    timestamp:entry.decidedAt,
    actor:{name:entry.reviewerName},
    title:`${entry.reviewerName} — ${entry.stage==='DEPARTMENT'?'مدیر واحد':'مدیر عامل'} · ${entry.decision==='APPROVED'?'تأیید کرد':'برای اصلاح بازگرداند'}`,
    description:entry.comment,
    icon:entry.decision==='APPROVED'?'check-square' as const:'alert' as const,
   }))}/>
  </WorkPanel>}
  <Modal open={correctionOpen} onClose={()=>setCorrectionOpen(false)} title="بازگشت گزارش برای اصلاح" description="دلیل بازگشت را بنویسید تا تهیه‌کننده بتواند گزارش را اصلاح کند." icon="alert" size="sm" actions={<><Button variant="ghost" onClick={()=>setCorrectionOpen(false)}>انصراف</Button><Button variant="danger" onClick={confirmCorrection} disabled={!comment.trim()}>ثبت بازگشت</Button></>}><TextArea label="توضیح اصلاح" value={comment} onChange={(event)=>setComment(event.target.value)} rows={3} required autoFocus/></Modal>
  <Modal open={resubmitOpen} onClose={()=>setResubmitOpen(false)} title="ارسال مجدد گزارش" description="متن گزارش را اصلاح کنید؛ گزارش دوباره از ابتدای مسیر تأیید ارسال می‌شود." icon="report" size="md" actions={<><Button variant="ghost" onClick={()=>setResubmitOpen(false)}>انصراف</Button><Button onClick={()=>{onResubmit?.(revisedSummary);setResubmitOpen(false)}} disabled={revisedSummary.trim().length<20}>ارسال مجدد</Button></>}><TextArea label="خلاصه اصلاح‌شده" value={revisedSummary} onChange={(event)=>setRevisedSummary(event.target.value)} rows={8} autoResize required autoFocus/></Modal>
  <div className="module-grid module-grid--split">
   <div className="module-page__section">
    <WorkPanel title="مشخصات گزارش" icon="report">
     <PropertyList items={[
      {key:'author',label:'تهیه‌کننده',value:report.authorName,icon:'user'},
      {key:'department',label:'واحد سازمانی',value:report.departmentName,icon:'building'},
      {key:'type',label:'نوع گزارش',value:report.type},
      {key:'period',label:'دوره',value:report.period,icon:'calendar'},
      {key:'submitted',label:'تاریخ ثبت',value:formatPersianDate(report.submittedAt,{dateStyle:'full'}),icon:'clock'},
      ...(report.meetingTitle?[{key:'meeting',label:'مربوط به جلسه',value:report.meetingTitle,icon:'calendar' as const}]:[]),
      ...(report.taskTitle?[{key:'task',label:'مصوبه/وظیفه',value:report.taskTitle,icon:'check-square' as const}]:[]),
      {key:'summary',label:'خلاصه',value:report.summary,multiline:true,fullWidth:true},
     ]}/>

    </WorkPanel>
    <AttachmentsPanel attachments={attachments}/>
   </div>
   <div className="module-page__section">
    <WorkPanel title="خلاصه وضعیت" icon="chart">
     <DescriptionList layout="horizontal" compact items={[
      {key:'status',term:'وضعیت',description:reportStatusLabels[report.status]},
      {key:'stage',term:'مرحله تأیید',description:reportStageLabels[report.stage]},
      {key:'priority',term:'اولویت',description:report.priority},
      {key:'files',term:'تعداد پیوست',description:`${formatNumber(attachments.length)} فایل`},
     ]}/>
    </WorkPanel>
    <QuickActionsPanel actions={[
     {id:'print',label:'چاپ گزارش',icon:'report',onSelect:()=>onOpenRelated?.('print',report.id)},
     {id:'files',label:'مشاهده پیوست‌ها',icon:'folder',onSelect:()=>onOpenRelated?.('files',report.id)},
     {id:'department',label:'گزارش‌های واحد',icon:'building',onSelect:()=>onOpenRelated?.('department',report.departmentId)},
    ]}/>
    <RelatedLinksPanel links={[{id:`${report.id}-dept`,label:report.departmentName,description:'سایر گزارش‌های این واحد',icon:'building',onNavigate:()=>onOpenRelated?.('department',report.departmentId)}]}/>
   </div>
  </div>
 </div>
}
