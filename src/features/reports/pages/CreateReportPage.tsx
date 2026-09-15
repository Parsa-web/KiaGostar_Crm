import {useState} from 'react'
import {Button,FileInput,FormActions,FormSection,Select,TextField} from '../../../components/ui'
import {departmentOptions,reportViews} from '../../../demo'
import {DictationField} from '../components/DictationField'
import {reportTypeOptions} from './reportPresentation'

const periodOptions=[...new Set(reportViews.map((report)=>report.period))].map((period)=>({value:period,label:period}))

export interface CreateReportPageProps{
 onCancel?():void
 onSubmit?(payload:Readonly<Record<string,unknown>>):void
 submitting?:boolean
 /** Tasks handed to this user, so the report can be tied to the meeting that ordered it. */
 linkableTasks?:readonly {value:string;label:string;description?:string}[]
 /** Preselected task when the user starts the report from a task/resolution. */
 defaultTaskId?:string
}

/** Report authoring form. The content field is dictation-enabled, so a manager
    can speak the report instead of typing it; everything else is unchanged. */
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
   <Select label="دوره گزارش" options={periodOptions} value={period} onChange={setPeriod}/>
   {linkableTasks.length>0&&<Select
    label="مربوط به وظیفه/مصوبه جلسه"
    options={[{value:'',label:'گزارش مستقل (بدون جلسه)'},...linkableTasks]}
    value={taskId??''}
    onChange={(value)=>setTaskId(value||undefined)}
    searchable
    helperText="با انتخاب وظیفه، گزارش شما به جلسه‌ای که این مصوبه در آن تصویب شده متصل می‌شود."
   />}
  </FormSection>
  <FormSection title="محتوای گزارش" description="خلاصه فعالیت‌ها، نتایج و پیشنهادها را بنویسید یا با دکمهٔ گویش فارسی املا کنید.">
   <DictationField label="خلاصه گزارش" required value={summary} onChange={setSummary} error={summaryError} rows={8} maxLength={2000}/>
  </FormSection>
  <FormSection title="پیوست‌ها" description="مستندات پشتیبان گزارش را بارگذاری کنید.">
   <FileInput files={files} onChange={setFiles} multiple label="فایل‌های پیوست" helperText="حداکر حجم هر فایل ۱۰ مگابایت" maxSize={10_485_760}/>
  </FormSection>
  <FormActions className="module-form__actions">
   {onCancel&&<Button type="button" variant="ghost" onClick={onCancel}>انصراف</Button>}
   <Button type="button" variant="secondary" onClick={()=>onSubmit?.(payload({draft:true}))}>ذخیره پیش‌نویس</Button>
   <Button type="submit" loading={submitting}>ارسال گزارش</Button>
  </FormActions>
 </form>
}
