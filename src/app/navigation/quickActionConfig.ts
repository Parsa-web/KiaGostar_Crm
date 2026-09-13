import type {IconName} from '../../components/ui'
import type {RoleCode} from '../../domain/enums'
import {can,type AuthorizedPrincipal} from '../../security'
import {Capabilities} from '../../security/permissions'

export interface QuickActionDefinition{
 id:string
 label:string
 description?:string
 href:string
 icon:IconName
 requiredCapabilities:readonly string[]
}

const CEO_ACTIONS:readonly QuickActionDefinition[]=[
 {id:'create-meeting',label:'ایجاد جلسه',description:'ثبت و زمان‌بندی جلسه سازمانی',href:'/meetings/create',icon:'calendar',requiredCapabilities:[Capabilities.MEETING_CREATE]},
 {id:'review-reports',label:'بررسی گزارش‌ها',description:'گزارش‌های قابل بررسی سازمان',href:'/reports',icon:'report',requiredCapabilities:[Capabilities.REPORT_VIEW,Capabilities.REPORT_REVIEW]},
 {id:'review-requests',label:'بررسی درخواست‌ها',description:'درخواست‌های قابل تصمیم‌گیری',href:'/requests',icon:'request',requiredCapabilities:[Capabilities.REQUEST_VIEW,Capabilities.REQUEST_REVIEW]},
]

const UNIT_MANAGER_ACTIONS:readonly QuickActionDefinition[]=[
 {id:'create-task',label:'وظیفه جدید',description:'واگذاری کار در محدوده واحد',href:'/tasks/create',icon:'check-square',requiredCapabilities:[Capabilities.TASK_CREATE]},
 {id:'unit-tasks',label:'پیگیری وظایف واحد',description:'وظایف خودتان و کارکنان واحد',href:'/tasks',icon:'workflow',requiredCapabilities:[Capabilities.TASK_VIEW]},
 {id:'unit-reports',label:'بررسی گزارش‌های واحد',description:'گزارش‌های کارکنان و گزارش‌های خودتان',href:'/reports',icon:'report',requiredCapabilities:[Capabilities.REPORT_VIEW,Capabilities.REPORT_REVIEW]},
 {id:'create-report',label:'گزارش جدید',description:'ثبت گزارش مدیریتی موجود',href:'/reports/create',icon:'report',requiredCapabilities:[Capabilities.REPORT_CREATE]},
 {id:'create-request',label:'درخواست جدید',description:'ثبت درخواست در گردش کار',href:'/requests/create',icon:'request',requiredCapabilities:[Capabilities.REQUEST_CREATE]},
]

const SECRETARY_ACTIONS:readonly QuickActionDefinition[]=[
 {id:'meeting-minutes',label:'جلسات و صورت‌جلسه‌ها',description:'ورود به جلسات و فضای ثبت صورت‌جلسه',href:'/meetings',icon:'calendar',requiredCapabilities:[Capabilities.MEETING_VIEW,Capabilities.MINUTES_EDIT]},
 {id:'create-meeting',label:'ایجاد جلسه',description:'ثبت و زمان‌بندی جلسه سازمانی',href:'/meetings/create',icon:'calendar',requiredCapabilities:[Capabilities.MEETING_CREATE]},
 {id:'resolutions',label:'مصوبات جلسات',description:'پیگیری مصوبات ثبت‌شده',href:'/resolutions',icon:'check-square',requiredCapabilities:[Capabilities.DECISION_VIEW]},
 {id:'create-report',label:'گزارش جدید',description:'ثبت گزارش مرتبط با کار دبیرخانه',href:'/reports/create',icon:'report',requiredCapabilities:[Capabilities.REPORT_CREATE]},
]

const EMPLOYEE_ACTIONS:readonly QuickActionDefinition[]=[
 {id:'create-report',label:'گزارش جدید',description:'ثبت گزارش کار شخصی',href:'/reports/create',icon:'report',requiredCapabilities:[Capabilities.REPORT_CREATE]},
 {id:'create-request',label:'درخواست جدید',description:'ثبت درخواست شخصی',href:'/requests/create',icon:'request',requiredCapabilities:[Capabilities.REQUEST_CREATE]},
 {id:'my-tasks',label:'وظایف من',description:'پیگیری کارهای واگذارشده به شما',href:'/tasks',icon:'check-square',requiredCapabilities:[Capabilities.TASK_VIEW_SELF]},
 {id:'my-meetings',label:'جلسات من',description:'جلساتی که در آن‌ها عضو هستید',href:'/meetings',icon:'calendar',requiredCapabilities:[Capabilities.MEETING_VIEW]},
]

export const quickActionsByRole:Readonly<Record<RoleCode,readonly QuickActionDefinition[]>>={
 MAIN_MANAGER:CEO_ACTIONS,
 DEPARTMENT_MANAGER:UNIT_MANAGER_ACTIONS,
 SECRETARY:SECRETARY_ACTIONS,
 EMPLOYEE:EMPLOYEE_ACTIONS,
}

const primaryRole=(roles:readonly RoleCode[]):RoleCode=>{
 if(roles.includes('MAIN_MANAGER'))return 'MAIN_MANAGER'
 if(roles.includes('DEPARTMENT_MANAGER'))return 'DEPARTMENT_MANAGER'
 if(roles.includes('SECRETARY'))return 'SECRETARY'
 return 'EMPLOYEE'
}

export const getQuickActions=(principal:AuthorizedPrincipal):readonly QuickActionDefinition[]=>
 quickActionsByRole[primaryRole(principal.roles)]
  .filter((action)=>action.requiredCapabilities.every((capability)=>can(principal,capability)))
