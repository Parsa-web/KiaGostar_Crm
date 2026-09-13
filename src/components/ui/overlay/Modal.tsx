import {useCallback,useRef,useState,type ReactNode} from 'react'
import {Button} from '../Button'
import {Icon,type IconName} from '../Icon'
import {Spinner} from '../Feedback'
import {cx} from '../utils'
import {useFocusTrap,useOverlayLayer,usePrefersReducedMotion,useScrollLock,type OverlaySize} from './overlayPrimitives'
export interface ModalProps{
 open:boolean;onClose():void;title?:ReactNode;description?:ReactNode;size?:OverlaySize;width?:string;height?:string;
 header?:ReactNode;footer?:ReactNode;actions?:ReactNode;children?:ReactNode;loading?:boolean;loadingLabel?:string;
 closeOnBackdrop?:boolean;closeOnEscape?:boolean;showClose?:boolean;closeLabel?:string;scrollable?:boolean;className?:string;icon?:IconName;
 role?:'dialog'|'alertdialog'
}
/** Accessible modal dialog with focus trapping, stacked z-index management and scroll locking. */
export function Modal({open,onClose,title,description,size='md',width,height,header,footer,actions,children,loading=false,loadingLabel='در حال پردازش',closeOnBackdrop=true,closeOnEscape=true,showClose=true,closeLabel='بستن',scrollable=true,className,icon,role='dialog'}:ModalProps){
 const surfaceRef=useRef<HTMLDivElement|null>(null)
 const layer=useOverlayLayer(open)
 const reducedMotion=usePrefersReducedMotion()
 useScrollLock(open)
 useFocusTrap(surfaceRef,open,{onClose,closeOnEscape})
 if(!open)return null
 const titleId=`${layer.id}-title`
 const descriptionId=`${layer.id}-description`
 return <div className={cx('ui-overlay',reducedMotion&&'ui-overlay--static')} style={{zIndex:layer.zIndex}}>
  <div className="ui-overlay__backdrop" role="presentation" onMouseDown={closeOnBackdrop?onClose:undefined}/>
  <div
   className={cx('ui-modal',`ui-modal--${size}`,className)}
   style={{...(width?{['--ui-modal-width' as string]:width}:{}),...(height?{['--ui-modal-height' as string]:height}:{})}}
   role={role}
   aria-modal="true"
   aria-labelledby={title?titleId:undefined}
   aria-describedby={description?descriptionId:undefined}
   aria-busy={loading||undefined}
   tabIndex={-1}
   ref={surfaceRef}
  >
   <header className="ui-modal__header">
    <div className="ui-modal__heading">
     {icon&&<span className="ui-modal__icon"><Icon name={icon} size="md"/></span>}
     <div>
      {title&&<h2 className="ui-modal__title" id={titleId}>{title}</h2>}
      {description&&<p className="ui-modal__description" id={descriptionId}>{description}</p>}
     </div>
    </div>
    {header}
    {showClose&&<button type="button" className="ui-modal__close" onClick={onClose} aria-label={closeLabel}><Icon name="error" size="sm"/></button>}
   </header>
   <div className={cx('ui-modal__body',scrollable&&'ui-modal__body--scroll')}>{children}</div>
   {(footer||actions)&&<footer className="ui-modal__footer">{footer}<div className="ui-modal__actions">{actions}</div></footer>}
   {loading&&<div className="ui-modal__loading" role="status"><Spinner size="lg"/><span>{loadingLabel}</span></div>}
  </div>
 </div>
}
export type DialogTone='info'|'success'|'warning'|'error'
const dialogIcon:Readonly<Record<DialogTone,IconName>>={info:'alert',success:'check-square',warning:'alert',error:'error'}
export interface DialogProps extends Omit<ModalProps,'icon'>{tone?:DialogTone;confirmLabel?:string;onConfirm?():void;cancelLabel?:string}
/** Composable message dialog for information, success, warning and error states. */
export function Dialog({tone='info',confirmLabel='متوجه شدم',cancelLabel,onConfirm,actions,children,...modalProps}:DialogProps){
 const resolvedActions=actions??<>
  {cancelLabel&&<Button variant="ghost" onClick={modalProps.onClose}>{cancelLabel}</Button>}
  <Button variant={tone==='error'?'danger':'primary'} onClick={onConfirm??modalProps.onClose}>{confirmLabel}</Button>
 </>
 return <Modal {...modalProps} size={modalProps.size??'sm'} icon={dialogIcon[tone]} className={cx(`ui-dialog ui-dialog--${tone}`,modalProps.className)} actions={resolvedActions}>{children}</Modal>
}
export interface ConfirmDialogProps{
 open:boolean;onCancel():void;onConfirm():void|Promise<void>;title?:ReactNode;description?:ReactNode;
 confirmLabel?:string;cancelLabel?:string;destructive?:boolean;children?:ReactNode;busyLabel?:string
}
/** Confirmation dialog for important or destructive actions; guards against duplicate submissions. */
export function ConfirmDialog({open,onCancel,onConfirm,title='تأیید عملیات',description,confirmLabel='تأیید',cancelLabel='انصراف',destructive=false,children,busyLabel='در حال انجام'}:ConfirmDialogProps){
 const [pending,setPending]=useState(false)
 const confirm=useCallback(async()=>{
  if(pending)return
  setPending(true)
  try{await onConfirm()}finally{setPending(false)}
 },[onConfirm,pending])
 return <Modal
  open={open}
  onClose={pending?()=>undefined:onCancel}
  title={title}
  description={description}
  size="sm"
  role="alertdialog"
  icon={destructive?'error':'alert'}
  className={cx('ui-dialog',destructive&&'ui-dialog--error')}
  closeOnBackdrop={!pending}
  closeOnEscape={!pending}
  showClose={!pending}
  loading={pending}
  loadingLabel={busyLabel}
  actions={<>
   <Button variant="ghost" onClick={onCancel} disabled={pending}>{cancelLabel}</Button>
   <Button variant={destructive?'danger':'primary'} onClick={confirm} loading={pending}>{confirmLabel}</Button>
  </>}
 >{children}</Modal>
}
