import type {DemoAgendaItem,DemoDecision,DemoMeeting,DemoMeetingMode,DemoMeetingRequest,DemoMeetingStatus,DemoMeetingType,DemoMinutes,DemoNote,DemoParticipant} from './demoTypes'
import {createSeededRandom,demoDate,demoDepartments,demoEmployeesOf,demoManagers,demoSecretaries,demoUsers} from './demoOrganization'
const random=createSeededRandom(918_273)
const pickFrom=<T,>(items:readonly T[]):T=>items[Math.floor(random()*items.length)]
const titles=['بازنگری اهداف فصلی','هماهنگی پروژه سامانه یکپارچه','بررسی عملکرد ماهانه فروش','جلسه هیئت‌مدیره','برنامه‌ریزی استقرار نسخه جدید','بررسی شکایات مشتریان کلیدی','تدوین بودجه سال آینده','ارزیابی عملکرد کارکنان','هم‌اندیشی بهبود فرایندها','جلسه هفتگی واحد فنی','بازبینی قرارداد تأمین‌کنندگان','برنامه آموزش سازمانی','بررسی شاخص‌های کیفیت خدمات','هماهنگی نمایشگاه سالانه']
const rooms=['اتاق جلسات مرکزی','سالن کنفرانس طبقه پنجم','اتاق جلسات واحد فنی','دفتر مدیرعامل','اتاق هم‌اندیشی طبقه سوم']
const statuses:readonly DemoMeetingStatus[]=['DRAFT','PENDING_APPROVAL','APPROVED','SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','REJECTED']
const types:readonly DemoMeetingType[]=['INTERNAL','DEPARTMENT','EXECUTIVE','PROJECT','WEEKLY']
const modes:readonly DemoMeetingMode[]=['IN_PERSON','ONLINE','HYBRID']
const agendaTitles=['مرور مصوبات جلسه پیشین','گزارش پیشرفت پروژه','بررسی موانع اجرایی','تصمیم‌گیری درباره اولویت‌ها','جمع‌بندی و تعیین مسئولان']
const decisionTitles=['تهیه گزارش تحلیلی تا پایان هفته','تخصیص بودجه تکمیلی پروژه','بازنگری فرایند پاسخ‌گویی به مشتریان','برگزاری دوره آموزشی تخصصی','به‌روزرسانی مستندات فنی']
function buildMeetings(){
 const meetings:DemoMeeting[]=[]
 const agenda:DemoAgendaItem[]=[]
 const participants:DemoParticipant[]=[]
 const decisions:DemoDecision[]=[]
 const operational=demoDepartments.filter((item)=>item.id!=='dep-exec')
 for(let index=0;index<28;index+=1){
  const department=index%5===0?demoDepartments[0]:operational[index%operational.length]
  const organizer=department.id==='dep-exec'?demoUsers[0]:demoManagers.find((manager)=>manager.departmentId===department.id)??demoUsers[0]
  const status=index<3?'SCHEDULED':statuses[index%statuses.length]
  const type=department.id==='dep-exec'?'EXECUTIVE':types[index%types.length]
  const mode=modes[index%modes.length]
  const offsetDays=index<6?index-1:index%2===0?index-14:index+3
  const startHour=8+(index%8)
  const members=demoEmployeesOf(department.id)
  const attendees=members.slice(0,3+(index%4))
  const secretary=demoSecretaries[index%demoSecretaries.length]
  const id=`mtg-${index+1}`
  const participantIds=[organizer.id,secretary.id,...attendees.map((member)=>member.id)]
  meetings.push({
   id,code:`KG-M-${(1400+index).toString()}`,title:titles[index%titles.length],type,mode,status,
   purpose:'هماهنگی و تصمیم‌گیری درباره موضوعات جاری واحد',
   description:'این جلسه با هدف بررسی وضعیت جاری، شناسایی موانع و تعیین اقدامات اصلاحی برگزار می‌شود. نتایج جلسه در قالب صورت‌جلسه و مصوبات ثبت خواهد شد.',
   organizerId:organizer.id,departmentId:department.id,
   location:mode==='ONLINE'?'جلسه برخط':pickFrom(rooms),
   onlineUrl:mode==='IN_PERSON'?undefined:'https://meet.kiagostar.ir/room/'+id,
   startTime:demoDate(offsetDays,startHour),endTime:demoDate(offsetDays,startHour+1+(index%2)),
   createdAt:demoDate(offsetDays-9),updatedAt:demoDate(offsetDays-1),
   requiresApproval:index%3!==0,participantIds,
  })
  for(let order=0;order<3+(index%3);order+=1)agenda.push({id:`${id}-ag-${order+1}`,meetingId:id,order:order+1,title:agendaTitles[order%agendaTitles.length],description:'بررسی جزئیات، ارائه گزارش و جمع‌بندی نتایج توسط مسئول مربوطه.',durationMinutes:10+order*5,completed:status==='COMPLETED'||order===0,ownerId:attendees[order%Math.max(1,attendees.length)]?.id??organizer.id})
  participants.push({id:`${id}-p-org`,meetingId:id,userId:organizer.id,attendance:status==='COMPLETED'?'PRESENT':'CONFIRMED',role:'ORGANIZER'})
  participants.push({id:`${id}-p-sec`,meetingId:id,userId:secretary.id,attendance:status==='COMPLETED'?'PRESENT':'CONFIRMED',role:'SECRETARY'})
  attendees.forEach((member,position)=>participants.push({id:`${id}-p-${position}`,meetingId:id,userId:member.id,attendance:status==='COMPLETED'?position%5===0?'ABSENT':position%4===0?'EXCUSED':'PRESENT':position%3===0?'INVITED':'CONFIRMED',role:position===0?'PRESENTER':'ATTENDEE'}))
  if(status==='COMPLETED'||status==='IN_PROGRESS')for(let d=0;d<2;d+=1)decisions.push({id:`${id}-dec-${d+1}`,meetingId:id,title:decisionTitles[(index+d)%decisionTitles.length],ownerId:attendees[d%Math.max(1,attendees.length)]?.id??organizer.id,priority:d===0?'HIGH':'NORMAL',dueDate:demoDate(offsetDays+7+d*3),status:d===0?'IN_PROGRESS':'PENDING',taskId:`tsk-${index+1}`})
 }
 return {meetings,agenda,participants,decisions}
}
const built=buildMeetings()
export const demoMeetings:readonly DemoMeeting[]=built.meetings
export const demoAgendaItems:readonly DemoAgendaItem[]=built.agenda
export const demoParticipants:readonly DemoParticipant[]=built.participants
export const demoDecisions:readonly DemoDecision[]=built.decisions
export const demoMeetingRequests:readonly DemoMeetingRequest[]=Array.from({length:12},(_,index)=>{
 const requester=demoUsers.filter((user)=>user.role==='EMPLOYEE')[index%20]
 const department=demoDepartments.find((item)=>item.id===requester.departmentId)??demoDepartments[1]
 return {
  id:`mreq-${index+1}`,title:`درخواست جلسه: ${titles[(index+3)%titles.length]}`,requesterId:requester.id,targetManagerId:department.managerId,departmentId:department.id,
  requestedDate:demoDate(index%2===0?index+2:index+5,9+(index%6)),priority:index%7===0?'CRITICAL':index%3===0?'HIGH':index%2===0?'NORMAL':'LOW',
  status:index%5===0?'APPROVED':index%7===0?'REJECTED':'PENDING',submittedAt:demoDate(-index-1),
  description:'درخواست برگزاری جلسه جهت بررسی موضوعات مطرح‌شده و هماهنگی میان واحدهای مرتبط.',
 }
})
export const demoMinutes:readonly DemoMinutes[]=demoMeetings.filter((meeting)=>meeting.status==='COMPLETED'||meeting.status==='IN_PROGRESS').map((meeting,index)=>({
 id:`min-${index+1}`,meetingId:meeting.id,authorId:demoSecretaries[index%demoSecretaries.length].id,
 status:index%3===0?'FINALIZED':index%3===1?'PENDING_APPROVAL':'DRAFT',updatedAt:demoDate(-index),
 content:'مصوبات جلسه شامل بررسی گزارش‌های ارائه‌شده، تعیین مسئولان پیگیری و تصویب زمان‌بندی اقدامات اصلاحی است.',
}))
export const demoNotes:readonly DemoNote[]=demoMeetings.slice(0,10).map((meeting,index)=>({
 id:`note-${index+1}`,meetingId:meeting.id,authorId:meeting.organizerId,createdAt:demoDate(-index,3),
 content:'یادداشت جلسه: تأکید بر تکمیل مستندات پیش از جلسه بعدی و ارسال گزارش وضعیت به دفتر مدیرعامل.',
}))
