import {useMemo,useState} from 'react'
import {Avatar,Button,DataCard,DescriptionList,EmptyState,ErrorState,FileInput,FilterBar,FormActions,FormSection,Icon,KPIGrid,KPIWidget,Modal,Pagination,PropertyList,SearchSummary,Select,StatusBadge,StepProgress,Table,Tag,TextArea,TextField,Toolbar,type TableColumn,type TableSort} from '../../../components/ui'
import {AttachmentsPanel,QuickActionsPanel,RelatedLinksPanel,WorkPanel} from '../../../components/work'
import {departmentOptions,filesForEntity,requestViews,userOptions,type RequestView} from '../../../demo'
import {formatNumber,formatPersianDate,formatRelativeTime} from '../../../core/utils'
import {paginate,sortRows,useCollectionView} from '../../../hooks/useCollectionView'
import {requestStatusLabels,requestStatusOptions,requestStepIndex,requestTypeOptions,requestWorkflowSteps} from './requestPresentation'
type RequestFilters={status:string;type:string;department:string;requester:string;priority:string}
const emptyFilters:RequestFilters={status:'',type:'',department:'',requester:'',priority:''}
const sortAccessors:Readonly<Record<string,(request:RequestView)=>string|number>>={
 code:(request)=>request.code,title:(request)=>request.title,requester:(request)=>request.requesterName,
 status:(request)=>request.status,type:(request)=>request.typeLabel,submittedAt:(request)=>new Date(request.submittedAt).getTime(),
}
const matches=(request:RequestView,keyword:string,filters:RequestFilters)=>{
 const term=keyword.trim()
 if(term&&!`${request.title} ${request.code} ${request.requesterName} ${request.departmentName}`.includes(term))return false
 if(filters.status&&request.status!==filters.status)return false
 if(filters.type&&request.type!==filters.type)return false
 if(filters.department&&request.departmentId!==filters.department)return false
 if(filters.requester&&request.requesterId!==filters.requester)return false
 if(filters.priority&&request.priority!==filters.priority)return false
 return true
}
export interface RequestsCollectionPageProps{requests?:readonly RequestView[];title?:string;description?:string;loading?:boolean;error?:boolean;onOpenRequest?(request:RequestView):void;onCreateRequest?():void;onRetry?():void}
export function RequestsCollectionPage({requests=requestViews,title='درخواست‌ها',description,loading=false,error=false,onOpenRequest,onCreateRequest,onRetry}:RequestsCollectionPageProps){
 const view=useCollectionView<RequestFilters>({initialFilters:emptyFilters,initialSort:{key:'submittedAt',direction:'desc'},initialPageSize:10})
 const filtered=useMemo(()=>requests.filter((request)=>matches(request,view.keyword,view.filters)),[requests,view.filters,view.keyword])
 const sorted=useMemo(()=>sortRows(filtered,view.sort,sortAccessors),[filtered,view.sort])
 const paged=useMemo(()=>paginate(sorted,view.page,view.pageSize),[sorted,view.page,view.pageSize])
 const stats=useMemo(()=>({
  total:requests.length,
  pending:requests.filter((request)=>request.status==='PENDING').length,
  approved:requests.filter((request)=>request.status==='APPROVED').length,
  rejected:requests.filter((request)=>request.status==='REJECTED').length,
 }),[requests])
 const columns=useMemo<readonly TableColumn<RequestView>[]>(()=>[
  {key:'code',header:'کد',sortable:true,width:'xs',cell:(request)=><span className="module-cell__secondary">{request.code}</span>},
  {key:'title',header:'عنوان درخواست',sortable:true,wrap:true,width:'lg',cell:(request)=><span className="module-cell"><span className="module-cell__primary">{request.title}</span><span className="module-cell__secondary">{request.typeLabel}</span></span>},
  {key:'requester',header:'درخواست‌کننده',sortable:true,width:'md',cell:(request)=><span className="module-person"><Avatar name={request.requesterName} alt={request.requesterName} size="xs"/><span className="module-cell"><span className="module-cell__primary">{request.requesterName}</span><span className="module-cell__secondary">{request.departmentName}</span></span></span>},
  {key:'type',header:'نوع',sortable:true,width:'sm',hideBelow:'md',cell:(request)=><Tag size="sm">{request.typeLabel}</Tag>},
  {key:'status',header:'وضعیت',sortable:true,width:'sm',cell:(request)=><StatusBadge status={request.status} label={requestStatusLabels[request.status]} size="sm"/>},
  {key:'submittedAt',header:'تاریخ ثبت',sortable:true,width:'md',cell:(request)=><span className="module-cell"><time dateTime={request.submittedAt}>{formatPersianDate(request.submittedAt,{dateStyle:'medium'})}</time><span className="module-cell__secondary">{formatRelativeTime(request.submittedAt)}</span></span>},
 ],[])
 const activeFilters=[
  view.filters.status?{key:'status',label:'وضعیت',value:requestStatusLabels[view.filters.status as RequestView['status']],onRemove:()=>view.clearFilter('status')}:null,
  view.filters.type?{key:'type',label:'نوع',value:requestTypeOptions.find((item)=>item.value===view.filters.type)?.label??'',onRemove:()=>view.clearFilter('type')}:null,
  view.filters.department?{key:'department',label:'واحد',value:departmentOptions.find((item)=>item.value===view.filters.department)?.label??'',onRemove:()=>view.clearFilter('department')}:null,
  view.filters.requester?{key:'requester',label:'درخواست‌کننده',value:userOptions.find((item)=>item.value===view.filters.requester)?.label??'',onRemove:()=>view.clearFilter('requester')}:null,
  view.filters.priority?{key:'priority',label:'اولویت',value:({LOW:'پایین',NORMAL:'عادی',HIGH:'بالا',CRITICAL:'بحرانی'} as Record<string,string>)[view.filters.priority]??view.filters.priority,onRemove:()=>view.clearFilter('priority')}:null,
 ].filter(Boolean) as {key:string;label:string;value:string;onRemove():void}[]
 if(error)return <ErrorState title="نمایش درخواست‌ها ممکن نیست" onRetry={onRetry}/>
 return <div className="module-page">
  <Toolbar title={title} subtitle={description} actions={onCreateRequest&&<Button startIcon={<Icon name="plus" size="sm"/>} onClick={onCreateRequest}>درخواست جدید</Button>}/>
  <KPIGrid columns={4}>
   <KPIWidget title="کل درخواست‌ها" value={stats.total} icon="workflow" loading={loading}/>
   <KPIWidget title="در انتظار اقدام" value={stats.pending} icon="clock" tone="warning" loading={loading} onActivate={()=>view.setFilter('status','PENDING')} actionLabel="نمایش درخواست‌های در انتظار"/>
   <KPIWidget title="تأییدشده" value={stats.approved} icon="check-square" tone="success" loading={loading} onActivate={()=>view.setFilter('status','APPROVED')} actionLabel="نمایش درخواست‌های تأییدشده"/>
   <KPIWidget title="ردشده" value={stats.rejected} icon="alert" tone="danger" loading={loading} onActivate={()=>view.setFilter('status','REJECTED')} actionLabel="نمایش درخواست‌های ردشده"/>
  </KPIGrid>
  <FilterBar
   searchValue={view.keyword}
   onSearchChange={view.setKeyword}
   searchPlaceholder="جست‌وجو در عنوان، کد یا درخواست‌کننده…"
   advancedFilters={<>
    <Select label="وضعیت" options={requestStatusOptions} value={view.filters.status} onChange={(value)=>view.setFilter('status',value??'')}/>
    <Select label="نوع درخواست" options={requestTypeOptions} value={view.filters.type} onChange={(value)=>view.setFilter('type',value??'')}/>
    <Select label="واحد سازمانی" options={[{value:'',label:'همه واحدها'},...departmentOptions]} value={view.filters.department} onChange={(value)=>view.setFilter('department',value??'')} searchable/>
    <Select label="درخواست‌کننده" options={[{value:'',label:'همه کاربران'},...userOptions]} value={view.filters.requester} onChange={(value)=>view.setFilter('requester',value??'')} searchable/>
    <Select label="اولویت" options={[{value:'',label:'همه اولویت‌ها'},{value:'LOW',label:'پایین'},{value:'NORMAL',label:'عادی'},{value:'HIGH',label:'بالا'},{value:'CRITICAL',label:'بحرانی'}]} value={view.filters.priority} onChange={(value)=>view.setFilter('priority',value??'')}/>
   </>}
   activeFilters={activeFilters}
   onResetAll={view.resetAll}
  />
  <SearchSummary total={sorted.length} keyword={view.keyword||undefined} activeFilters={activeFilters} onClear={view.resetAll} label="درخواست"/>
  <Table
   columns={columns}
   rows={paged}
   rowKey={(request)=>request.id}
   caption="فهرست درخواست‌ها"
   sort={view.sort as TableSort|null}
   onSortChange={(sort)=>view.setSort(sort)}
   selectable
   selectedKeys={view.selection}
   onSelectionChange={view.setSelection}
   onRowActivate={onOpenRequest}
   zebra
   loading={loading}
   emptyState={<EmptyState icon="workflow" title="درخواستی یافت نشد" description="با تغییر فیلترها دوباره تلاش کنید." primaryAction={onCreateRequest&&<Button onClick={onCreateRequest}>ثبت درخواست</Button>}/>}
   rowActions={(request)=><Button size="sm" variant="ghost" onClick={()=>onOpenRequest?.(request)}>مشاهده</Button>}
   renderExpanded={(request)=><p>{request.description}</p>}
   pagination={<Pagination page={view.page} pageSize={view.pageSize} total={sorted.length} onPageChange={view.setPage} onPageSizeChange={view.setPageSize}/>}
  />
 </div>
}
export function MyRequestsPage({userId,onOpenRequest,onCreateRequest}:{userId:string;onOpenRequest?(request:RequestView):void;onCreateRequest?():void}){
 const mine=useMemo(()=>requestViews.filter((request)=>request.requesterId===userId),[userId])
 return <RequestsCollectionPage requests={mine} title="درخواست‌های من" description="درخواست‌های ثبت‌شده توسط شما" onOpenRequest={onOpenRequest} onCreateRequest={onCreateRequest}/>
}
export function RequestApprovalQueuePage({departmentId,onOpenRequest}:{departmentId?:string;onOpenRequest?(request:RequestView):void}){
 const queue=useMemo(()=>requestViews.filter((request)=>request.status==='PENDING'&&(!departmentId||request.departmentId===departmentId)),[departmentId])
 return <div className="module-page">
  <RequestsCollectionPage requests={queue} title="کارتابل درخواست‌ها" description="درخواست‌های در انتظار اقدام شما" onOpenRequest={onOpenRequest}/>
  <WorkPanel title="خلاصه کارتابل" icon="chart">
   <div className="module-grid module-grid--cards">
    {requestTypeOptions.slice(1).map((type)=><DataCard key={type.value} title={type.label} icon="workflow" value={formatNumber(queue.filter((request)=>request.type===type.value).length)} subtitle="در انتظار بررسی"/>)}
   </div>
  </WorkPanel>
 </div>
}
export function CreateRequestPage({onCancel,onSubmit,submitting=false}:{onCancel?():void;onSubmit?(payload:Readonly<Record<string,unknown>>):void;submitting?:boolean}){
 const [title,setTitle]=useState('')
 const [description,setDescription]=useState('')
 const [type,setType]=useState<string|undefined>('LEAVE')
 const [department,setDepartment]=useState<string|undefined>()
 const [approver,setApprover]=useState<string|undefined>()
 const [files,setFiles]=useState<readonly File[]>([])
 const [touched,setTouched]=useState(false)
 const titleError=touched&&!title.trim()?'عنوان درخواست را وارد کنید.':undefined
 const descriptionError=touched&&description.trim().length<10?'توضیح درخواست حداقل ۱۰ نویسه باشد.':undefined
 return <form className="module-form" noValidate onSubmit={(event)=>{event.preventDefault();setTouched(true);if(title.trim()&&description.trim().length>=10)onSubmit?.({title,description,type,department,approver,files})}}>
  <FormSection title="اطلاعات درخواست">
   <TextField label="عنوان درخواست" required value={title} onChange={(event)=>setTitle(event.target.value)} error={titleError} maxLength={120} showCounter/>
   <Select label="نوع درخواست" options={requestTypeOptions.slice(1)} value={type} onChange={setType} required/>
   <Select label="واحد سازمانی" options={departmentOptions} value={department} onChange={setDepartment} searchable clearable/>
   <Select label="تأییدکننده" options={userOptions} value={approver} onChange={setApprover} searchable clearable helperText="در صورت خالی بودن، مسیر پیش‌فرض سازمان اعمال می‌شود."/>
  </FormSection>
  <FormSection title="شرح درخواست">
   <TextArea label="توضیحات" required value={description} onChange={(event)=>setDescription(event.target.value)} error={descriptionError} rows={6} maxLength={1500} showCounter autoResize/>
  </FormSection>
  <FormSection title="مستندات">
   <FileInput files={files} onChange={setFiles} multiple label="پیوست‌ها" helperText="در صورت نیاز مدارک پشتیبان را اضافه کنید." maxSize={10_485_760}/>
  </FormSection>
  <FormActions className="module-form__actions">
   {onCancel&&<Button type="button" variant="ghost" onClick={onCancel}>انصراف</Button>}
   <Button type="submit" loading={submitting}>ثبت درخواست</Button>
  </FormActions>
 </form>
}
export function RequestDetailsPage({request,onBack,onOpenRelated,canReview,onApprove,onReject}:{request:RequestView;onBack?():void;onOpenRelated?(kind:string,id:string):void;canReview?:boolean;onApprove?():void;onReject?(reason:string):void}){
 const [rejectOpen,setRejectOpen]=useState(false)
 const [rejectReason,setRejectReason]=useState('')
 const attachments=useMemo(()=>filesForEntity('REQUEST',request.id).map((file)=>({id:file.id,name:file.name,mimeType:file.mimeType,sizeBytes:file.sizeBytes,uploaderName:file.uploaderName,uploadedAt:file.uploadedAt})),[request.id])
 const confirmReject=()=>{if(!onReject)return;onReject(rejectReason);setRejectReason('');setRejectOpen(false)}
 return <div className="module-page">
  <Toolbar title={request.title} subtitle={`${request.code} · ${request.typeLabel}`} actions={<>
   {onBack&&<Button variant="ghost" startIcon={<Icon name="arrow-back" size="sm" directional/>} onClick={onBack}>بازگشت</Button>}
   <StatusBadge status={request.status} label={requestStatusLabels[request.status]}/>
  </>}/>
  {canReview&&request.status==='PENDING'&&<WorkPanel title="بررسی درخواست" icon="shield"><DescriptionList layout="horizontal" compact items={[{key:'review',term:'اقدام تأیید',description:request.title},{key:'reviewer',term:'تصمیم‌گیرنده',description:'شما'}]}/><div className="button-row">{onApprove&&<Button onClick={onApprove}>تأیید درخواست</Button>}{onReject&&<Button variant="danger" onClick={()=>setRejectOpen(true)}>رد درخواست</Button>}</div></WorkPanel>}
  <Modal open={rejectOpen} onClose={()=>setRejectOpen(false)} title="رد درخواست" description="دلیل رد را وارد کنید؛ این دلیل برای درخواست‌کننده قابل مشاهده خواهد بود." icon="alert" size="sm" actions={<><Button variant="ghost" onClick={()=>setRejectOpen(false)}>انصراف</Button><Button variant="danger" onClick={confirmReject} disabled={!rejectReason.trim()}>ثبت رد درخواست</Button></>}><TextArea label="دلیل رد" value={rejectReason} onChange={(event)=>setRejectReason(event.target.value)} rows={3} required autoFocus/></Modal>
  <WorkPanel title="مسیر گردش کار" icon="workflow"><StepProgress steps={requestWorkflowSteps} activeIndex={requestStepIndex(request.status)}/></WorkPanel>
  <div className="module-grid module-grid--split">
   <div className="module-page__section">
    <WorkPanel title="مشخصات درخواست" icon="workflow">
     <PropertyList items={[
      {key:'requester',label:'درخواست‌کننده',value:request.requesterName,icon:'user'},
      {key:'department',label:'واحد سازمانی',value:request.departmentName,icon:'building'},
      {key:'type',label:'نوع درخواست',value:request.typeLabel},
      {key:'priority',label:'اولویت',value:request.priority,icon:'alert'},
      {key:'submitted',label:'تاریخ ثبت',value:formatPersianDate(request.submittedAt,{dateStyle:'full'}),icon:'clock'},
      {key:'description',label:'توضیحات',value:request.description,multiline:true,fullWidth:true},
     ]}/>
    </WorkPanel>
    <AttachmentsPanel attachments={attachments}/>
   </div>
   <div className="module-page__section">
    <WorkPanel title="خلاصه" icon="chart">
     <DescriptionList layout="horizontal" compact items={[
      {key:'status',term:'وضعیت',description:requestStatusLabels[request.status]},
      {key:'type',term:'نوع',description:request.typeLabel},
      {key:'files',term:'تعداد پیوست',description:`${formatNumber(attachments.length)} فایل`},
     ]}/>
    </WorkPanel>
    <QuickActionsPanel actions={[
     {id:'print',label:'چاپ درخواست',icon:'report',onSelect:()=>onOpenRelated?.('print',request.id)},
     {id:'files',label:'مشاهده پیوست‌ها',icon:'folder',onSelect:()=>onOpenRelated?.('files',request.id)},
     {id:'requester',label:'پروفایل درخواست‌کننده',icon:'user',onSelect:()=>onOpenRelated?.('user',request.requesterId)},
    ]}/>
    <RelatedLinksPanel links={[{id:`${request.id}-dept`,label:request.departmentName,description:'سایر درخواست‌های این واحد',icon:'building',onNavigate:()=>onOpenRelated?.('department',request.departmentId)}]}/>
   </div>
  </div>
 </div>
}
