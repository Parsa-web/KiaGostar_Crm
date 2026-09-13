import {useCallback,useEffect,useId,useRef,useState,type KeyboardEvent} from 'react'
import {Icon} from '../../components/ui'
import {useDismissOnOutside,useOverlayLayer,usePrefersReducedMotion} from '../../components/ui/overlay/overlayPrimitives'
import {AppLink} from '../navigation/AppLink'
import type {QuickActionDefinition} from '../navigation/quickActionConfig'

export function PersistentQuickAction({actions}:{actions:readonly QuickActionDefinition[]}){
 const [open,setOpen]=useState(false)
 const rootRef=useRef<HTMLDivElement|null>(null)
 const panelRef=useRef<HTMLDivElement|null>(null)
 const triggerRef=useRef<HTMLButtonElement|null>(null)
 const titleId=useId()
 const panelId=useId()
 const layer=useOverlayLayer(open)
 const reducedMotion=usePrefersReducedMotion()
 const close=useCallback(()=>setOpen(false),[])
 useDismissOnOutside(panelRef,open,close,rootRef)
 useEffect(()=>{
  if(!open)return
  window.requestAnimationFrame(()=>panelRef.current?.querySelector<HTMLElement>('a[href]')?.focus({preventScroll:true}))
 },[open])
 const handlePanelKeyDown=(event:KeyboardEvent<HTMLDivElement>)=>{
  if(event.key==='Escape'){
   event.preventDefault()
   close()
   triggerRef.current?.focus({preventScroll:true})
   return
  }
  if(event.key!=='ArrowDown'&&event.key!=='ArrowUp'&&event.key!=='Home'&&event.key!=='End')return
  const items=Array.from(panelRef.current?.querySelectorAll<HTMLElement>('a[href]')??[])
  if(!items.length)return
  event.preventDefault()
  const current=items.indexOf(document.activeElement as HTMLElement)
  const next=event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(current+1+items.length)%items.length:(current-1+items.length)%items.length
  items[next]?.focus()
 }
 if(!actions.length)return null
 return <div className="quick-action-center" ref={rootRef}>
  {open&&<div
   id={panelId}
   ref={panelRef}
   className={`quick-action-panel${reducedMotion?' quick-action-panel--static':''}`}
   role="dialog"
   aria-labelledby={titleId}
   style={{zIndex:layer.zIndex}}
   onKeyDown={handlePanelKeyDown}>
   <header className="quick-action-panel__header">
    <span className="quick-action-panel__mark" aria-hidden="true"><Icon name="bolt" size="sm"/></span>
    <h2 id={titleId}>اقدام سریع</h2>
   </header>
   <nav aria-label="عملیات سریع مجاز">
    <ul className="quick-action-list">
     {actions.map((action,index)=><li key={action.id}>
      <AppLink href={action.href} className={`quick-action-item${index===0?' is-primary':''}`} onClick={close}>
       <span className="quick-action-item__icon" aria-hidden="true"><Icon name={action.icon} size="sm"/></span>
       <span className="quick-action-item__copy">
        <strong>{action.label}</strong>
        {action.description&&<small>{action.description}</small>}
       </span>
       <Icon name="chevron" size="xs" className="quick-action-item__chevron" aria-hidden="true"/>
      </AppLink>
     </li>)}
    </ul>
   </nav>
  </div>}
  <button
   ref={triggerRef}
   type="button"
   className="persistent-quick-action"
   aria-label={open?'بستن منوی اقدام سریع':'باز کردن منوی اقدام سریع'}
   title={open?'بستن منوی اقدام سریع':'باز کردن منوی اقدام سریع'}
   aria-haspopup="dialog"
   aria-expanded={open}
   aria-controls={open?panelId:undefined}
   onClick={()=>setOpen((current)=>!current)}>
   <Icon name={open?'plus':'bolt'} size="md" aria-hidden="true"/>
  </button>
 </div>
}
