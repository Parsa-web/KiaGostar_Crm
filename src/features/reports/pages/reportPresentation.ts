import type {ReportStage,ReportView} from '../../../demo'
/** Presentation-only lookup tables for the reports module (no business rules). */
export const reportStatusLabels:Readonly<Record<ReportView['status'],string>>={DRAFT:'پیش‌نویس',SUBMITTED:'ارسال‌شده',UNDER_REVIEW:'در حال بررسی',APPROVED:'تأییدشده',REJECTED:'بازگشت‌داده‌شده'}
export const reportStatusOptions=[{value:'',label:'همه وضعیت‌ها'},...Object.entries(reportStatusLabels).map(([value,label])=>({value,label}))]
export const reportTypeOptions=['عملکردی','مالی','عملیاتی','تحلیلی','آموزشی'].map((item)=>({value:item,label:item}))

/** The desk a report is waiting on. This is what a reviewer actually needs to
    know — «ارسال‌شده» alone never said *to whom*. */
export const reportStageLabels:Readonly<Record<ReportStage,string>>={
 DRAFT:'پیش‌نویس',
 DEPARTMENT:'در انتظار تأیید مدیر واحد',
 EXECUTIVE:'در انتظار تأیید مدیر عامل',
 AUTHOR:'بازگشت برای اصلاح',
 COMPLETED:'تأیید نهایی',
}
export const reportStageOptions=[{value:'',label:'همه مراحل'},...Object.entries(reportStageLabels).map(([value,label])=>({value,label}))]
/** Tone used by badges/tags so the stage reads at a glance. */
export const reportStageTone:Readonly<Record<ReportStage,'neutral'|'primary'|'warning'|'danger'|'success'>>={
 DRAFT:'neutral',DEPARTMENT:'primary',EXECUTIVE:'warning',AUTHOR:'danger',COMPLETED:'success',
}
/** Ordered chain shown as a stepper on the details page. */
export const reportChainSteps:readonly {stage:ReportStage;label:string}[]=[
 {stage:'DEPARTMENT',label:'مدیر واحد'},
 {stage:'EXECUTIVE',label:'مدیر عامل'},
 {stage:'COMPLETED',label:'تأیید نهایی'},
]
