import {Icon} from '../../components/ui'
export function EmptyModuleState({path}:{path:string}){
 return <div className="module-page"><div className="empty-state"><span className="empty-state__icon"><Icon name="search" size={30}/></span><h2>صفحه یافت نشد</h2><p>نشانی «{path}» معتبر نیست یا این بخش هنوز پیاده‌سازی نشده است.</p></div></div>
}
