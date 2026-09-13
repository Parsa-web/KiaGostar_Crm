import { DashboardGrid, DashboardSection } from '../components'

const capabilities = [
  { icon: '🔔', title: 'اعلان‌ها و فایل‌ها', text: 'اعلان‌های اختصاصی، پیوست امن و کنترل دسترسی مبتنی بر موجودیت' },
  { icon: '🧾', title: 'ردیابی و امنیت', text: 'تاریخچه تغییرات تغییرناپذیر، لاگ فنی امن و خطاهای یکپارچه' },
  { icon: '📊', title: 'داشبورد و تحلیل', text: 'نمای سازمانی، واحدی و شخصی با فیلتر و شاخص‌های قابل فهم' },
  { icon: '🔁', title: 'گردش‌کار', text: 'تغییر وضعیت کنترل‌شده، تأیید، یادآوری و ارجاع بدون دور زدن سلسله‌مراتب' },
  { icon: '🎯', title: 'ارزیابی عملکرد', text: 'چرخه ارزیابی، بازخورد مدیر و تحلیل عملکرد با حفظ حریم خصوصی' },
  { icon: '♿', title: 'کیفیت تجربه', text: 'رابط راست‌به‌چپ، واکنش‌گرا، قابل استفاده با صفحه‌کلید و آماده داده‌های حجیم' },
]

export default function SystemOverviewPage() {
  return <DashboardSection title="زیرساخت‌های فعال"><DashboardGrid>{capabilities.map((item) => <article className="card capability-card" key={item.title}><span className="capability-icon" aria-hidden="true">{item.icon}</span><h3>{item.title}</h3><p>{item.text}</p><span className="ready-state">● آماده بهره‌برداری</span></article>)}</DashboardGrid></DashboardSection>
}
