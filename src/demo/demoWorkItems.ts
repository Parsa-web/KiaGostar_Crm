import type {DemoActivity,DemoAuditRecord,DemoFile,DemoNotification,DemoReport,DemoRequest,DemoTask} from './demoTypes'
import {demoDate,demoDepartments,demoEmployees,demoManagers,demoUsers} from './demoOrganization'
import {demoMeetings} from './demoMeetings'
const taskTitles=['تکمیل مستندات فنی پروژه','بررسی گزارش عملکرد ماهانه','پیگیری قراردادهای جاری','آماده‌سازی ارائه برای مشتری','بروزرسانی سامانه نرم‌افزاری','تهیه پیش‌نویس بودجه سه‌ماهه','هماهنگی با تیم فروش','بررسی شکایات مشتریان','تدوین استراتژی بازاریابی','تحلیل رقبا و بازار','ثبت و پیگیری درخواست‌های کاربران']
const reportTitles=['گزارش عملکرد فروش فصلی','گزارش بازدید مشتریان','گزارش مالی ماهانه','گزارش تحلیل بازار','گزارش پروژه‌های در دست اقدام','گزارش رضایت مشتری','گزارش عملکرد کارکنان','گزارش دوره آموزشی']
export const demoTasks:readonly DemoTask[]=Array.from({length:45},(_,index)=>{
 const creator=index%3===0?demoManagers[index%demoManagers.length]:demoEmployees[index%demoEmployees.length]
 const assignee=demoEmployees[(index+7)%demoEmployees.length]
 const department=demoDepartments.find((item)=>item.id===assignee.departmentId)??demoDepartments[1]
 const status=index<5?'IN_PROGRESS':index%7===0?'COMPLETED':index%5===0?'OVERDUE':'PENDING'
 return {
  id:`tsk-${index+1}`,title:taskTitles[index%taskTitles.length],
  description:'پیگیری و اجرای اقدامات مورد نیاز طبق برنامه زمان‌بندی و تأیید نهایی توسط مدیر مربوطه.',
  assigneeId:assignee.id,creatorId:creator.id,departmentId:department.id,
  meetingId:index%4===0?demoMeetings[index%demoMeetings.length].id:undefined,
  status,priority:index%7===0?'CRITICAL':index%3===0?'HIGH':index%2===0?'NORMAL':'LOW',
  deadline:demoDate(index%2===0?index-5:index+4),createdAt:demoDate(-index-3),
 }
})
export const demoReports:readonly DemoReport[]=Array.from({length:32},(_,index)=>{
 /* Every fourth report is filed by a department manager so the shorter chain
    (مدیر واحد → مدیر عامل) is represented in the seed as well. */
 const author=index%4===3?demoManagers[index%demoManagers.length]:demoEmployees[index%demoEmployees.length]
 const department=demoDepartments.find((item)=>item.id===author.departmentId)??demoDepartments[1]
 const status=index<4?'SUBMITTED':index%6===0?'APPROVED':index%5===0?'UNDER_REVIEW':index%8===0?'REJECTED':'DRAFT'
 return {
  id:`rep-${index+1}`,title:reportTitles[index%reportTitles.length],authorId:author.id,departmentId:department.id,
  period:index%4===0?'۱۴۰۴/۰۲':'۱۴۰۴/۰۳',status,submittedAt:demoDate(-index-2),
  summary:'این گزارش شامل خلاصه فعالیت‌های انجام‌شده در دوره مورد نظر، تحلیل نتایج عملیاتی و پیشنهادات بهبود است.',
 }
})
const requestTypes:readonly('LEAVE'|'EQUIPMENT'|'BUDGET'|'ACCESS'|'OTHER')[]=['LEAVE','EQUIPMENT','BUDGET','ACCESS','OTHER']
export const demoRequests:readonly DemoRequest[]=Array.from({length:28},(_,index)=>{
 const requester=demoEmployees[index%demoEmployees.length]
 const department=demoDepartments.find((item)=>item.id===requester.departmentId)??demoDepartments[1]
 const type=requestTypes[index%requestTypes.length]
 const status=index<3?'PENDING':index%6===0?'APPROVED':'REJECTED'
 const stage=status==='PENDING'?'DEPARTMENT':status==='APPROVED'?'COMPLETED':'DEPARTMENT'
 return {
  id:`req-${index+1}`,
  title:type==='LEAVE'?'درخواست مرخصی':type==='EQUIPMENT'?'درخواست تجهیزات':type==='BUDGET'?'درخواست بودجه':type==='ACCESS'?'درخواست دسترسی':'درخواست سایر موارد',
  requesterId:requester.id,departmentId:department.id,type,status,stage,createdAt:demoDate(-index-1),
  description:'درخواست به منظور تأمین نیازهای اجرایی و انجام بهتر وظایف سازمانی.',
 }
})
export const demoNotifications:readonly DemoNotification[]=Array.from({length:60},(_,index)=>{
 const user=demoUsers[index%demoUsers.length]
 const category=index%5===0?'MEETING':index%5===1?'TASK':index%5===2?'REPORT':index%5===3?'REQUEST':'SYSTEM'
 const priority=index%9===0?'HIGH':'NORMAL'
 return {
  id:`notif-${index+1}`,userId:user.id,
  title:category==='MEETING'?'جلسه جدید':category==='TASK'?'وظیفه جدید':category==='REPORT'?'گزارش جدید':category==='REQUEST'?'درخواست جدید':'اطلاعیه سیستم',
  body:category==='MEETING'?'یک جلسه جدید برای شما ثبت شده است.':category==='TASK'?'یک وظیفه جدید به شما محول شده است.':category==='REPORT'?'یک گزارش جدید منتظر بررسی شماست.':category==='REQUEST'?'یک درخواست جدید ثبت شده است.':'سامانه به‌روزرسانی شد.',
  category,priority,read:index%3!==0,createdAt:demoDate(-index),link:`/${category.toLowerCase()}/${index+1}`,
 }
})
const mimes=['application/pdf','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','text/plain']
const extensions=['.pdf','.jpg','.docx','.xlsx','.txt']
export const demoFiles:readonly DemoFile[]=Array.from({length:40},(_,index)=>{
 const uploader=demoUsers[(index+5)%demoUsers.length]
 const entityType=index%4===0?'MEETING':index%4===1?'REPORT':index%4===2?'TASK':'REQUEST'
 const entityId=entityType==='MEETING'?demoMeetings[index%demoMeetings.length].id:entityType==='REPORT'?`rep-${(index%20)+1}`:entityType==='TASK'?`tsk-${(index%30)+1}`:`req-${(index%20)+1}`
 const mimeIndex=index%mimes.length
 return {
  id:`file-${index+1}`,name:`مستند-${index+1}${extensions[mimeIndex]}`,mimeType:mimes[mimeIndex],
  sizeBytes:50_000+(index*13_579)%950_000,uploaderId:uploader.id,uploadedAt:demoDate(-index-1),entityType,entityId,
 }
})
const actions=['ایجاد کرد','ویرایش کرد','حذف کرد','تأیید کرد','رد کرد','بازبینی کرد','بسته‌شده','تکمیل شد']
const targetTypes=['جلسه','گزارش','وظیفه','درخواست','مستند']
export const demoActivities:readonly DemoActivity[]=Array.from({length:80},(_,index)=>{
 const actor=demoUsers[index%demoUsers.length]
 const targetType=targetTypes[index%targetTypes.length]
 return {
  id:`act-${index+1}`,actorId:actor.id,action:actions[index%actions.length],targetType,targetId:`target-${index+1}`,targetLabel:`${targetType} شماره ${index+1}`,
  createdAt:demoDate(-index),departmentId:actor.departmentId,
 }
})
const events=['USER_LOGIN','USER_LOGOUT','MEETING_CREATE','MEETING_UPDATE','REPORT_SUBMIT','TASK_ASSIGN','REQUEST_CREATE','FILE_UPLOAD','SETTING_CHANGE']
export const demoAuditRecords:readonly DemoAuditRecord[]=Array.from({length:100},(_,index)=>{
 const actor=demoUsers[index%demoUsers.length]
 return {
  id:`audit-${index+1}`,actorId:actor.id,event:events[index%events.length],entityType:index%2===0?'Meeting':'Report',entityId:`entity-${index+1}`,
  createdAt:demoDate(-index),ip:`192.168.${(index%250)+1}.${(index%254)+1}`,result:index%13===0?'FAILURE':'SUCCESS',
 }
})
