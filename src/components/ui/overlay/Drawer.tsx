import {useRef,type ReactNode} from 'react'
import {Icon} from '../Icon'
import {cx} from '../utils'
import {useFocusTrap,useOverlayLayer,usePrefersReducedMotion,useScrollLock} from './overlayPrimitives'
export type DrawerSide='start'|'end'|'bottom'|'fullscreen'
export interface DrawerProps{
 open:boolean;onClose():void;side?:DrawerSide;title?:ReactNode;description?:ReactNode;footer?:ReactNode;children?:ReactNode;
 persistent?:boolean;closeOnBackdrop?:boolean;showClose?:boolean;closeLabel?:string;size?:'sm'|'md'|'lg';className?:string
}
/** Side/bottom drawer used for contextual panels; temporary by default, persistent when docked in a layout. */
export function Drawer({open,onClose,side='end',title,description,footer,children,persistent=false,closeOnBackdrop=true,showClose=true,closeLabel='بستن',size='md',className}:DrawerProps){
 const surfaceRef=useRef<HTMLDivElement|null>(null)
 const layer=useOverlayLayer(open&&!persistent)
 const reducedMotion=usePrefersReducedMotion()
 useScrollLock(open&&!persistent)
 useFocusTrap(surfaceRef,open&&!persistent,{onClose})
 if(!open)return null
 const titleId=`${layer.id}-title`
 const panel=<aside
  className={cx('ui-drawer',`ui-drawer--${side}`,`ui-drawer--${size}`,persistent&&'ui-drawer--persistent',className)}
  role={persistent?'complementary':'dialog'}
  aria-modal={persistent?undefined:true}
  aria-labelledby={title?titleId:undefined}
  tabIndex={-1}
  ref={surfaceRef}
 >
  <header className="ui-drawer__header">
   <div>
    {title&&<h2 className="ui-drawer__title" id={titleId}>{title}</h2>}
    {description&&<p className="ui-drawer__description">{description}</p>}
   </div>
   {showClose&&<button type="button" className="ui-modal__close" onClick={onClose} aria-label={closeLabel}><Icon name="error" size="sm"/></button>}
  </header>
  <div className="ui-drawer__body">{children}</div>
  {footer&&<footer className="ui-drawer__footer">{footer}</footer>}
 </aside>
 if(persistent)return panel
 return <div className={cx('ui-overlay',`ui-overlay--${side}`,reducedMotion&&'ui-overlay--static')} style={{zIndex:layer.zIndex}}>
  <div className="ui-overlay__backdrop" role="presentation" onMouseDown={closeOnBackdrop?onClose:undefined}/>
  {panel}
 </div>
}
export interface BottomSheetProps{
 open:boolean;onClose():void;title?:ReactNode;description?:ReactNode;children?:ReactNode;actions?:ReactNode;
 height?:'auto'|'half'|'full';dismissible?:boolean;className?:string;desktopAs?:'drawer'|'sheet'
}
/** Mobile-first bottom sheet; on large screens it renders as an end-side drawer through CSS breakpoints. */
export function BottomSheet({open,onClose,title,description,children,actions,height='auto',dismissible=true,className,desktopAs='drawer'}:BottomSheetProps){
 const surfaceRef=useRef<HTMLDivElement|null>(null)
 const layer=useOverlayLayer(open)
 const reducedMotion=usePrefersReducedMotion()
 useScrollLock(open)
 useFocusTrap(surfaceRef,open,{onClose})
 if(!open)return null
 const titleId=`${layer.id}-title`
 return <div className={cx('ui-overlay ui-overlay--bottom',reducedMotion&&'ui-overlay--static')} style={{zIndex:layer.zIndex}}>
  <div className="ui-overlay__backdrop" role="presentation" onMouseDown={dismissible?onClose:undefined}/>
  <div
   className={cx('ui-sheet',`ui-sheet--${height}`,`ui-sheet--desktop-${desktopAs}`,className)}
   role="dialog"
   aria-modal="true"
   aria-labelledby={title?titleId:undefined}
   tabIndex={-1}
   ref={surfaceRef}
  >
   {dismissible&&<button type="button" className="ui-sheet__grabber" onClick={onClose} aria-label="بستن"><span aria-hidden="true"/></button>}
   {(title||description)&&<header className="ui-sheet__header">
    {title&&<h2 className="ui-drawer__title" id={titleId}>{title}</h2>}
    {description&&<p className="ui-drawer__description">{description}</p>}
   </header>}
   <div className="ui-sheet__body">{children}</div>
   {actions&&<footer className="ui-sheet__footer">{actions}</footer>}
  </div>
 </div>
}
