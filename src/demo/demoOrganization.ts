import type {DemoDepartment,DemoPosition,DemoUser} from './demoTypes'
import {toLocalIso} from '../core/utils/dateUtils'
/** The seed is anchored on *today* (local midnight), never on a frozen calendar
    day. A fixed anchor pushed every demo meeting, deadline and notification into
    the past, which left the calendar surfaces permanently empty. */
const anchor=new Date();anchor.setHours(0,0,0,0)
export const DEMO_BASE_DATE=anchor
const DAY=86_400_000
const HOUR=3_600_000
/** Local-time ISO stamp (`toISOString()` would shift Tehran evenings a day forward). */
export const demoDate=(days:number,hours=0):string=>toLocalIso(new Date(DEMO_BASE_DATE.getTime()+days*DAY+hours*HOUR))

export function createSeededRandom(seed:number):()=>number{let state=seed;return()=>{state=(state*1_664_525+1_013_904_223)%4_294_967_296;return state/4_294_967_296}}
const firstNames=['علی','محمد','زهرا','فاطمه','رضا','مریم','حسین','سارا','امیر','نگین','مهدی','الهام','سعید','نرگس','بهرام','شیرین','کاوه','لیلا','آرش','پریسا','یاسر','سمانه','بابک','هدیه']
const lastNames=['محمدی','حسینی','کریمی','رضایی','موسوی','احمدی','نیک‌نام','شریفی','قاسمی','صادقی','جعفری','امینی','طاهری','مرادی','نوری','رستمی','سلیمانی','یزدانی','فرهنگ','کاشانی']
export const demoDepartments:readonly DemoDepartment[]=[
 {id:'dep-exec',name:'دفتر مدیرعامل',code:'EXEC',managerId:'usr-ceo',memberCount:4,status:'ACTIVE'},
 {id:'dep-sales',name:'واحد فروش و بازاریابی',code:'SALES',managerId:'usr-mgr-sales',parentId:'dep-exec',memberCount:9,status:'ACTIVE'},
 {id:'dep-tech',name:'واحد فنی و مهندسی',code:'TECH',managerId:'usr-mgr-tech',parentId:'dep-exec',memberCount:11,status:'ACTIVE'},
 {id:'dep-finance',name:'واحد مالی و اداری',code:'FIN',managerId:'usr-mgr-finance',parentId:'dep-exec',memberCount:7,status:'ACTIVE'},
 {id:'dep-hr',name:'واحد سرمایه انسانی',code:'HR',managerId:'usr-mgr-hr',parentId:'dep-exec',memberCount:5,status:'ACTIVE'},
 {id:'dep-support',name:'واحد پشتیبانی مشتریان',code:'SUP',managerId:'usr-mgr-support',parentId:'dep-exec',memberCount:6,status:'ACTIVE'},
]
export const demoPositions:readonly DemoPosition[]=[
 {id:'pos-ceo',title:'مدیرعامل',departmentId:'dep-exec',level:1},
 {id:'pos-manager',title:'مدیر واحد',departmentId:'dep-exec',level:2},
 {id:'pos-secretary',title:'مسئول دفتر',departmentId:'dep-exec',level:3},
 {id:'pos-expert',title:'کارشناس ارشد',departmentId:'dep-tech',level:4},
 {id:'pos-specialist',title:'کارشناس',departmentId:'dep-sales',level:5},
 {id:'pos-associate',title:'کارشناس اجرایی',departmentId:'dep-finance',level:6},
]
const managerSeed=[
 {id:'usr-mgr-sales',departmentId:'dep-sales',firstName:'محمدرضا',lastName:'کیانی'},
 {id:'usr-mgr-tech',departmentId:'dep-tech',firstName:'شیرین',lastName:'دادگر'},
 {id:'usr-mgr-finance',departmentId:'dep-finance',firstName:'حمید',lastName:'اصفهانی'},
 {id:'usr-mgr-hr',departmentId:'dep-hr',firstName:'سمیرا',lastName:'روشندل'},
 {id:'usr-mgr-support',departmentId:'dep-support',firstName:'پویا',lastName:'برومند'},
] as const
const secretarySeed=[
 {id:'usr-sec-exec',departmentId:'dep-exec',firstName:'نگار',lastName:'شکوهی'},
 {id:'usr-sec-tech',departmentId:'dep-tech',firstName:'الناز',lastName:'پارسا'},
 {id:'usr-sec-sales',departmentId:'dep-sales',firstName:'مهسا',lastName:'رحیمی'},
] as const
function buildUsers():readonly DemoUser[]{
 const list:DemoUser[]=[{id:'usr-ceo',firstName:'کیوان',lastName:'گستر',fullName:'کیوان گستر',role:'CEO',departmentId:'dep-exec',positionId:'pos-ceo',email:'ceo@kiagostar.ir',phone:'۰۲۱-۸۸۰۰۱۱۲۲',status:'ACTIVE',joinedAt:demoDate(-1800)}]
 for(const manager of managerSeed)list.push({id:manager.id,firstName:manager.firstName,lastName:manager.lastName,fullName:`${manager.firstName} ${manager.lastName}`,role:'DEPARTMENT_MANAGER',departmentId:manager.departmentId,positionId:'pos-manager',email:`${manager.id}@kiagostar.ir`,phone:'۰۲۱-۸۸۰۰۲۲۳۳',status:'ACTIVE',managerId:'usr-ceo',joinedAt:demoDate(-1200)})
 for(const secretary of secretarySeed)list.push({id:secretary.id,firstName:secretary.firstName,lastName:secretary.lastName,fullName:`${secretary.firstName} ${secretary.lastName}`,role:'SECRETARY',departmentId:secretary.departmentId,positionId:'pos-secretary',email:`${secretary.id}@kiagostar.ir`,phone:'۰۲۱-۸۸۰۰۳۳۴۴',status:'ACTIVE',managerId:demoDepartments.find((item)=>item.id===secretary.departmentId)?.managerId,joinedAt:demoDate(-900)})
 const operational=demoDepartments.filter((item)=>item.id!=='dep-exec')
 for(let index=0;index<24;index+=1){
  const department=operational[index%operational.length]
  const firstName=firstNames[(index*7)%firstNames.length]
  const lastName=lastNames[(index*5)%lastNames.length]
  list.push({id:`usr-emp-${index+1}`,firstName,lastName,fullName:`${firstName} ${lastName}`,role:'EMPLOYEE',departmentId:department.id,positionId:index%3===0?'pos-expert':index%3===1?'pos-specialist':'pos-associate',email:`employee${index+1}@kiagostar.ir`,phone:`۰۹۱۲۳۳۳${(1000+index).toString()}`,status:index%13===0?'INACTIVE':'ACTIVE',managerId:department.managerId,joinedAt:demoDate(-600+index*7)})
 }
 return list
}
export const demoUsers:readonly DemoUser[]=buildUsers()
export const demoEmployeesOf=(departmentId:string):readonly DemoUser[]=>demoUsers.filter((user)=>user.departmentId===departmentId&&user.role==='EMPLOYEE')
export const demoManagers:readonly DemoUser[]=demoUsers.filter((user)=>user.role==='DEPARTMENT_MANAGER')
export const demoSecretaries:readonly DemoUser[]=demoUsers.filter((user)=>user.role==='SECRETARY')
export const demoEmployees:readonly DemoUser[]=demoUsers.filter((user)=>user.role==='EMPLOYEE')
