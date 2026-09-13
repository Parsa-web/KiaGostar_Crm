import {useState} from 'react'
import type {RoleCode} from '../../../domain/enums'
import type {IconName} from '../../../components/ui/Icon'
import {Button,Card,Icon,Select,Switch,TextField,FormSection,FormActions} from '../../../components/ui'
import {DashboardPersonalizationPanel,useDashboardPersonalization} from '../../../components/dashboard'
import {dashboardPersonalizationByRole,primaryDashboardRole} from '../../dashboard/dashboardPersonalizationConfig'

type SectionId='dashboard-personalization'|'profile'|'notifications'|'security'|'appearance'|'about'
const sections:readonly{readonly id:SectionId;readonly label:string;readonly icon:IconName}[]=[
 {id:'dashboard-personalization',label:'شخصی‌سازی داشبورد',icon:'dashboard'},
 {id:'profile',label:'پروفایل کاربری',icon:'user'},
 {id:'notifications',label:'تنظیمات اعلان‌ها',icon:'bell'},
 {id:'security',label:'امنیت و رمز عبور',icon:'shield'},
 {id:'appearance',label:'ظاهر برنامه',icon:'settings'},
 {id:'about',label:'درباره سامانه',icon:'chart'},
]

export function SettingsPage({roles}:{roles:readonly RoleCode[]}){
 const role=primaryDashboardRole(roles)
 const personalization=useDashboardPersonalization(dashboardPersonalizationByRole[role])
 const [activeSection,setActiveSection]=useState<SectionId>('dashboard-personalization')
 const [notifEmail,setNotifEmail]=useState(true)
 const [notifPush,setNotifPush]=useState(true)
 const [notifMeeting,setNotifMeeting]=useState(true)
 const [notifTask,setNotifTask]=useState(true)
 const [notifReport,setNotifReport]=useState(false)
 const [theme,setTheme]=useState<string>('light')
 const [fontSize,setFontSize]=useState<string>('normal')
 const [language,setLanguage]=useState<string>('fa')
 const [saved,setSaved]=useState(false)

 const handleSave=()=>{setSaved(true);setTimeout(()=>setSaved(false),2000)}

 return <div className="settings-workspace">
  <nav className="settings-navigation" aria-label="بخش‌های تنظیمات">
   {sections.map((section)=>(
    <a key={section.id} href={`#${section.id}`} className={`settings-navigation__item${activeSection===section.id?' settings-navigation__item--active':''}`} aria-current={activeSection===section.id?'page':undefined} onClick={(e)=>{e.preventDefault();setActiveSection(section.id)}}>
     <span className="settings-navigation__icon" aria-hidden="true"><Icon name={section.icon} size="sm"/></span>
     <span>{section.label}</span>
    </a>
   ))}
  </nav>

  <div className="settings-panels">
   {activeSection==='dashboard-personalization'&&<Card className="settings-panel" id="dashboard-personalization">
    <header className="settings-panel__header">
     <span className="settings-panel__icon" aria-hidden="true"><Icon name="dashboard" size="md"/></span>
     <h2>شخصی‌سازی داشبورد</h2>
    </header>
    <div className="settings-panel__body">
     <DashboardPersonalizationPanel state={personalization}/>
    </div>
   </Card>}

   {activeSection==='profile'&&<Card className="settings-panel" id="profile">
    <header className="settings-panel__header">
     <span className="settings-panel__icon" aria-hidden="true"><Icon name="user" size="md"/></span>
     <h2>پروفایل کاربری</h2>
    </header>
    <div className="settings-panel__body">
     <FormSection title="اطلاعات شخصی">
      <TextField label="نام" defaultValue="" placeholder="نام خود را وارد کنید"/>
      <TextField label="نام خانوادگی" defaultValue="" placeholder="نام خانوادگی خود را وارد کنید"/>
      <TextField label="شماره موبایل" defaultValue="" placeholder="۰۹۱۲XXXXXXX"/>
      <TextField label="ایمیل" defaultValue="" placeholder="email@example.com"/>
     </FormSection>
     <FormSection title="سمت و واحد سازمانی">
      <TextField label="سمت" defaultValue={role==='MAIN_MANAGER'?'مدیرعامل':role==='DEPARTMENT_MANAGER'?'مدیر واحد':role==='SECRETARY'?'دبیر':'کارمند'} disabled/>
      <TextField label="واحد سازمانی" defaultValue="" disabled/>
     </FormSection>
     <FormActions>
      <Button onClick={handleSave}>{saved?'ذخیره شد ✓':'ذخیره تغییرات'}</Button>
     </FormActions>
    </div>
   </Card>}

   {activeSection==='notifications'&&<Card className="settings-panel" id="notifications">
    <header className="settings-panel__header">
     <span className="settings-panel__icon" aria-hidden="true"><Icon name="bell" size="md"/></span>
     <h2>تنظیمات اعلان‌ها</h2>
    </header>
    <div className="settings-panel__body">
     <FormSection title="کانال‌های اعلان">
      <Switch label="اعلان ایمیل" checked={notifEmail} onChange={setNotifEmail}/>
      <Switch label="اعلان داخل برنامه (Push)" checked={notifPush} onChange={setNotifPush}/>
     </FormSection>
     <FormSection title="موضوعات اعلان">
      <Switch label="جلسات جدید و تغییرات زمان‌بندی" checked={notifMeeting} onChange={setNotifMeeting}/>
      <Switch label="وظایف جدید و یادآوری مهلت" checked={notifTask} onChange={setNotifTask}/>
      <Switch label="گزارش‌ها و وضعیت تأیید" checked={notifReport} onChange={setNotifReport}/>
     </FormSection>
     <FormActions>
      <Button onClick={handleSave}>{saved?'ذخیره شد ✓':'ذخیره تغییرات'}</Button>
     </FormActions>
    </div>
   </Card>}

   {activeSection==='security'&&<Card className="settings-panel" id="security">
    <header className="settings-panel__header">
     <span className="settings-panel__icon" aria-hidden="true"><Icon name="shield" size="md"/></span>
     <h2>امنیت و رمز عبور</h2>
    </header>
    <div className="settings-panel__body">
     <FormSection title="تغییر رمز عبور">
      <TextField label="رمز عبور فعلی" type="password" placeholder="رمز عبور فعلی خود را وارد کنید"/>
      <TextField label="رمز عبور جدید" type="password" placeholder="حداقل ۸ نویسه"/>
      <TextField label="تأیید رمز عبور جدید" type="password" placeholder="رمز عبور جدید را دوباره وارد کنید"/>
     </FormSection>
     <FormSection title="جلسات فعال">
      <p className="text-muted" style={{marginBottom:8}}>شما در یک مرورگر فعال هستید. برای خروج از سایر دستگاه‌ها از گزینه خروج از همه دستگاه‌ها استفاده کنید.</p>
      <Button variant="danger" size="sm">خروج از همه دستگاه‌ها</Button>
     </FormSection>
     <FormActions>
      <Button onClick={handleSave}>{saved?'ذخیره شد ✓':'بروزرسانی رمز عبور'}</Button>
     </FormActions>
    </div>
   </Card>}

   {activeSection==='appearance'&&<Card className="settings-panel" id="appearance">
    <header className="settings-panel__header">
     <span className="settings-panel__icon" aria-hidden="true"><Icon name="settings" size="md"/></span>
     <h2>ظاهر برنامه</h2>
    </header>
    <div className="settings-panel__body">
     <FormSection title="قالب بندی">
      <Select label="پوسته" options={[{value:'light',label:'روشن'},{value:'dark',label:'تاریک'},{value:'system',label:'سیستم'}]} value={theme} onChange={(v)=>setTheme(v??'light')}/>
      <Select label="اندازه فونت" options={[{value:'small',label:'کوچک'},{value:'normal',label:'عادی'},{value:'large',label:'بزرگ'}]} value={fontSize} onChange={(v)=>setFontSize(v??'normal')}/>
      <Select label="زبان رابط" options={[{value:'fa',label:'فارسی'},{value:'en',label:'انگلیسی'}]} value={language} onChange={(v)=>setLanguage(v??'fa')}/>
     </FormSection>
     <FormActions>
      <Button onClick={handleSave}>{saved?'ذخیره شد ✓':'ذخیره تغییرات'}</Button>
     </FormActions>
    </div>
   </Card>}

   {activeSection==='about'&&<Card className="settings-panel" id="about">
    <header className="settings-panel__header">
     <span className="settings-panel__icon" aria-hidden="true"><Icon name="dashboard" size="md"/></span>
     <h2>درباره سامانه</h2>
    </header>
    <div className="settings-panel__body">
     <div className="settings-about">
      <div className="brand-mark__symbol" aria-hidden="true" style={{marginBottom:16}}>
       <svg viewBox="0 0 32 32" width="48" height="48"><path d="M7 6h18v6H13v4h9v10H7v-6h9v-4H7z"/></svg>
      </div>
      <h3>سامانه مدیریت جلسات کیا گستر</h3>
      <p className="text-muted">نسخه ۱.۰.۰</p>
      <p className="text-muted" style={{marginTop:8}}>سیستم جامع مدیریت جلسات، وظایف، گزارش‌ها و درخواست‌های سازمانی</p>
      <div style={{marginTop:16}}>
       <h4>قابلیت‌ها</h4>
       <ul style={{listStyle:'disc',paddingInlineStart:20,marginTop:8}}>
        <li>برنامه‌ریزی و مدیریت جلسات</li>
        <li>صورت‌جلسه زنده با پیاده‌سازی گفتار</li>
        <li>ثبت و پیگیری مصوبات</li>
        <li>مدیریت وظایف سازمانی</li>
        <li>تهیه و بررسی گزارش‌ها</li>
        <li>گردش درخواست‌ها</li>
        <li>تقویم یکپارچه</li>
       </ul>
      </div>
     </div>
    </div>
   </Card>}
  </div>
 </div>
}
