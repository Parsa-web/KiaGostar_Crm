import {cloneElement,useCallback,useId,useRef,useState,type ReactElement,type ReactNode} from 'react'
import {cx} from '../utils'
import {useDismissOnOutside,useOverlayLayer,usePrefersReducedMotion,type OverlayPlacement} from './overlayPrimitives'
export interface PopoverProps{
 content:ReactNode;children:ReactElement<{onClick?(event:unknown):void;onKeyDown?(event:unknown):void;'aria-expanded'?:boolean;'aria-haspopup'?:string}>;
 placement?:OverlayPlacement;trigger?:'click'|'hover';open?:boolean;onOpenChange?(open:boolean):void;label?:string;className?:string
}
/** Interactive popover surface anchored to a trigger; supports click, hover and keyboard activation. */
export function Popover({content,children,placement='bottom',trigger='click',open,onOpenChange,label,className}:PopoverProps){
 const [uncontrolled,setUncontrolled]=useState(false)
 const isOpen=open??uncontrolled
 const anchorRef=useRef<HTMLSpanElement|null>(null)
 const surfaceRef=useRef<HTMLDivElement|null>(null)
 const layer=useOverlayLayer(isOpen)
 const reducedMotion=usePrefersReducedMotion()
 const setOpen=useCallback((next:boolean)=>{setUncontrolled(next);onOpenChange?.(next)},[onOpenChange])
 const close=useCallback(()=>setOpen(false),[setOpen])
 useDismissOnOutside(surfaceRef,isOpen&&trigger==='click',close,anchorRef)
 const id=useId()
 const triggerProps={
  'aria-expanded':isOpen,
  'aria-haspopup':'dialog',
  onClick:trigger==='click'?()=>setOpen(!isOpen):undefined,
 }
 return <span
  className="ui-popover-anchor"
  ref={anchorRef}
  onMouseEnter={trigger==='hover'?()=>setOpen(true):undefined}
  onMouseLeave={trigger==='hover'?close:undefined}
  onFocus={trigger==='hover'?()=>setOpen(true):undefined}
  onBlur={trigger==='hover'?close:undefined}
 >
  {cloneElement(children,triggerProps)}
  {isOpen&&<div
   id={id}
   className={cx('ui-popover',`ui-popover--${placement}`,reducedMotion&&'ui-popover--static',className)}
   style={{zIndex:layer.zIndex}}
   role="dialog"
   aria-label={label}
   ref={surfaceRef}
  >{content}</div>}
 </span>
}
export interface TooltipProps{content:ReactNode;children:ReactNode;placement?:OverlayPlacement;delay?:number;disabled?:boolean;className?:string}
/** Descriptive tooltip that opens on hover and keyboard focus; never used for critical-only content. */
export function Tooltip({content,children,placement='top',delay=200,disabled=false,className}:TooltipProps){
 const [visible,setVisible]=useState(false)
 const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null)
 const id=useId()
 const reducedMotion=usePrefersReducedMotion()
 const show=useCallback(()=>{
  if(disabled)return
  if(timerRef.current)clearTimeout(timerRef.current)
  timerRef.current=setTimeout(()=>setVisible(true),reducedMotion?0:delay)
 },[delay,disabled,reducedMotion])
 const hide=useCallback(()=>{
  if(timerRef.current)clearTimeout(timerRef.current)
  setVisible(false)
 },[])
 return <span
  className="ui-tooltip-anchor"
  onMouseEnter={show}
  onMouseLeave={hide}
  onFocus={show}
  onBlur={hide}
  onKeyDown={(event)=>{if(event.key==='Escape')hide()}}
  aria-describedby={content&&!disabled?id:undefined}
 >
  {children}
  {visible&&<span role="tooltip" id={id} className={cx('ui-tooltip',`ui-tooltip--${placement}`,className)}>{content}</span>}
 </span>
}
