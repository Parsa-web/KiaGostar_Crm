import {useEffect,useState,type ReactNode} from 'react'
import {Icon,type IconName} from '../Icon'
import {Spinner} from '../Feedback'
import {cx} from '../utils'
import {OVERLAY_BASE_Z} from './overlayPrimitives'
import {useToasts,toastStore,type SnackbarMessage,type ToastTone} from './toastStore'
const toneIcon:Readonly<Record<ToastTone,IconName>>={success:'check-square',warning:'alert',error:'error',info:'bell',loading:'clock'}
/** Non-blocking toast viewport; mount once near the application root. */
export function ToastViewport({label='پیام‌های سیستم'}:{label?:string}){
 const toasts=useToasts()
 if(!toasts.length)return null
 return <div className="ui-toast-viewport" style={{zIndex:OVERLAY_BASE_Z+200}} role="region" aria-label={label}>
  {toasts.map((item)=><div
   key={item.id}
   className={cx('ui-toast',`ui-toast--${item.tone}`)}
   role={item.tone==='error'?'alert':'status'}
   aria-live={item.tone==='error'?'assertive':'polite'}
  >
   <span className="ui-toast__icon" aria-hidden="true">{item.tone==='loading'?<Spinner size="sm" inline/>:<Icon name={toneIcon[item.tone]} size="sm"/>}</span>
   <div className="ui-toast__content">
    <p className="ui-toast__title">{item.title}</p>
    {item.description&&<p className="ui-toast__description">{item.description}</p>}
   </div>
   {item.action&&<button type="button" className="ui-toast__action" onClick={()=>{item.action?.onSelect();toastStore.dismiss(item.id)}}>{item.action.label}</button>}
   <button type="button" className="ui-toast__close" onClick={()=>toastStore.dismiss(item.id)} aria-label="بستن پیام"><Icon name="error" size="sm"/></button>
  </div>)}
 </div>
}
/** Application-level provider that renders children plus the shared toast viewport. */
export function ToastProvider({children}:{children?:ReactNode}){
 useEffect(()=>()=>toastStore.clear(),[])
 return <>{children}<ToastViewport/></>
}
export interface SnackbarProps{messages:readonly SnackbarMessage[];onDismiss(id:string):void;autoHideDuration?:number}
/** Stacked snackbars for lightweight confirmations and undo affordances. */
export function Snackbar({messages,onDismiss,autoHideDuration=6000}:SnackbarProps){
 useEffect(()=>{
  if(!messages.length)return undefined
  const timers=messages.map((message)=>setTimeout(()=>onDismiss(message.id),message.duration??autoHideDuration))
  return ()=>{timers.forEach((timer)=>clearTimeout(timer))}
 },[autoHideDuration,messages,onDismiss])
 if(!messages.length)return null
 return <div className="ui-snackbar-stack" style={{zIndex:OVERLAY_BASE_Z+150}} role="region" aria-label="پیام‌های کوتاه">
  {messages.map((message)=><div key={message.id} className={cx('ui-snackbar',`ui-snackbar--${message.tone??'neutral'}`)} role="status" aria-live="polite">
   <span className="ui-snackbar__message">{message.message}</span>
   {message.actionLabel&&<button type="button" className="ui-snackbar__action" onClick={()=>{message.onAction?.();onDismiss(message.id)}}>{message.actionLabel}</button>}
   <button type="button" className="ui-snackbar__close" onClick={()=>onDismiss(message.id)} aria-label="بستن"><Icon name="error" size="sm"/></button>
  </div>)}
 </div>
}
export type BannerTone='success'|'warning'|'error'|'info'
export interface NotificationBannerProps{
 tone?:BannerTone;title:ReactNode;description?:ReactNode;actions?:ReactNode;dismissible?:boolean;onDismiss?():void;icon?:IconName;className?:string
}
/** Page-level banner for persistent contextual messages. */
export function NotificationBanner({tone='info',title,description,actions,dismissible=false,onDismiss,icon,className}:NotificationBannerProps){
 const [visible,setVisible]=useState(true)
 if(!visible)return null
 const bannerIcon=icon??toneIcon[tone]
 return <div className={cx('ui-banner',`ui-banner--${tone}`,className)} role={tone==='error'?'alert':'status'}>
  <span className="ui-banner__icon" aria-hidden="true"><Icon name={bannerIcon} size="sm"/></span>
  <div className="ui-banner__content">
   <p className="ui-banner__title">{title}</p>
   {description&&<p className="ui-banner__description">{description}</p>}
  </div>
  {actions&&<div className="ui-banner__actions">{actions}</div>}
  {dismissible&&<button type="button" className="ui-banner__close" onClick={()=>{setVisible(false);onDismiss?.()}} aria-label="بستن پیام"><Icon name="error" size="sm"/></button>}
 </div>
}
