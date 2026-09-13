import type {RequestView} from '../../../demo'
/** Presentation-only lookup tables for the requests module (no business rules). */
export const requestStatusLabels:Readonly<Record<RequestView['status'],string>>={PENDING:'در انتظار بررسی',APPROVED:'تأییدشده',REJECTED:'ردشده'}
export const requestStatusOptions=[{value:'',label:'همه وضعیت‌ها'},...Object.entries(requestStatusLabels).map(([value,label])=>({value,label}))]
export const requestTypeOptions=[{value:'',label:'همه انواع'},{value:'LEAVE',label:'مرخصی'},{value:'EQUIPMENT',label:'تجهیزات'},{value:'BUDGET',label:'بودجه'},{value:'ACCESS',label:'دسترسی'},{value:'OTHER',label:'سایر'}]
export const requestWorkflowSteps=[{id:'submit',label:'ثبت درخواست'},{id:'review',label:'بررسی مدیر'},{id:'decision',label:'تصمیم نهایی'},{id:'archive',label:'بایگانی'}]
export const requestStepIndex=(status:RequestView['status'])=>status==='PENDING'?1:3
