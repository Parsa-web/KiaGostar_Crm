import {useCallback,useEffect,useRef,useState} from 'react'
import type {User} from '../../domain/entities';import type {RoleCode} from '../../domain/enums';import {Icon} from '../../components/ui';import {useDemoState,demoUnreadNotificationCount} from '../../demo';import {AppLink} from '../navigation/AppLink';import {ProfileMenu} from './ProfileMenu'
import {formatPersianTime} from '../../core/utils'
import {PersianCalendar} from '../../components/dashboard/PersianCalendar'
function useClock(){const[time,setTime]=useState(()=>new Date());useEffect(()=>{const id=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(id)},[]);return time}

function HeaderCalendarButton(){
 const[open,setOpen]=useState(false)
 const[selectedDate,setSelectedDate]=useState<Date|null>(null)
 const wrapperRef=useRef<HTMLDivElement>(null)
 const toggle=useCallback(()=>setOpen(prev=>!prev),[])
 const close=useCallback(()=>setOpen(false),[])
 const handleChange=useCallback((date:Date)=>{setSelectedDate(date)},[])

 useEffect(()=>{
  if(!open)return
  const handleClickOutside=(e:MouseEvent)=>{
   if(wrapperRef.current&&!wrapperRef.current.contains(e.target as Node))setOpen(false)
  }
  const handleEscape=(e:KeyboardEvent)=>{
   if(e.key==='Escape')setOpen(false)
  }
  document.addEventListener('mousedown',handleClickOutside)
  document.addEventListener('keydown',handleEscape)
  return()=>{document.removeEventListener('mousedown',handleClickOutside);document.removeEventListener('keydown',handleEscape)}
 },[open])

 return(
  <div className="header-calendar" ref={wrapperRef}>
   <button
    type="button"
    className="header-calendar-trigger"
    aria-label="تقویم"
    aria-expanded={open}
    aria-haspopup="dialog"
    onClick={toggle}
   >
    <Icon name="calendar"/>
   </button>
   {open&&(
    <div className="header-calendar-popover" role="dialog" aria-label="تقویم">
     <PersianCalendar value={selectedDate} onChange={handleChange} onClose={close}/>
    </div>
   )}
  </div>
 )
}

export function AppHeader({title,user,roles,departmentIds,onMenu,onLogout,onSearch}:{title:string;user:User;roles:readonly RoleCode[];departmentIds:readonly string[];onMenu():void;onLogout():Promise<void>;onSearch():void}){const store=useDemoState();const unread=demoUnreadNotificationCount(user.id,store.notifications);const clockTime=useClock();return <header className="app-header"><div className="header-context"><button className="icon-button mobile-only" aria-label="باز کردن منو" onClick={onMenu}><Icon name="menu"/></button><div><span className="header-eyebrow">فضای کاری</span><strong className="header-title truncate">{title}</strong></div></div><div className="header-actions"><span className="header-clock" aria-label="ساعت فعلی">{formatPersianTime(clockTime)}</span><button className="header-search" onClick={onSearch}><Icon name="search"/><span>جستجو در سامانه</span><kbd className="header-search__keys">کنترل + کا</kbd></button><AppLink className="icon-button notification-button" href="/notifications" aria-label={unread?`${unread.toLocaleString('fa-IR')} اعلان خوانده‌نشده`:'اعلان‌ها'}><Icon name="bell"/>{unread>0&&<span className="notification-count">{unread>99?'۹۹+':unread.toLocaleString('fa-IR')}</span>}</AppLink><HeaderCalendarButton/><ProfileMenu user={user} roles={roles} departmentIds={departmentIds} onLogout={onLogout}/></div></header>}
