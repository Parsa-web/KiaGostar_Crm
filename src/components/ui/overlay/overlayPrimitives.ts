import {useCallback,useEffect,useId,useRef,useState,useSyncExternalStore} from 'react'
/** Centralised overlay stack: keeps z-index ordering, scroll locking and focus restoration consistent. */
export const OVERLAY_BASE_Z=1000
export const OVERLAY_STEP=10
const stack:string[]=[]
const listeners=new Set<()=>void>()
const notify=()=>{listeners.forEach((listener)=>listener())}
export const overlayStack={
 push(id:string){if(!stack.includes(id)){stack.push(id);notify()}},
 remove(id:string){const index=stack.indexOf(id);if(index>=0){stack.splice(index,1);notify()}},
 indexOf(id:string){return stack.indexOf(id)},
 size(){return stack.length},
 isTop(id:string){return stack.length>0&&stack[stack.length-1]===id},
 subscribe(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener)}},
}
const FOCUSABLE='a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'
export const focusableElements=(root:HTMLElement|null):readonly HTMLElement[]=>
 root?Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element)=>element.offsetParent!==null||element===document.activeElement):[]
/** Registers an overlay in the shared stack and returns its layer metadata. */
export function useOverlayLayer(open:boolean){
 const id=useId()
 const [version,setVersion]=useState(0)
 useEffect(()=>overlayStack.subscribe(()=>setVersion((value)=>value+1)),[])
 useEffect(()=>{
  if(!open)return undefined
  overlayStack.push(id)
  return ()=>overlayStack.remove(id)
 },[id,open])
 const depth=open?Math.max(overlayStack.indexOf(id),0):0
 return {id,depth,zIndex:OVERLAY_BASE_Z+depth*OVERLAY_STEP,isTop:open?overlayStack.isTop(id):false,version}
}
let lockCount=0
let previousOverflow=''
/** Locks body scrolling while blocking overlays are open (reference counted for stacked overlays). */
export function useScrollLock(active:boolean){
 useEffect(()=>{
  if(!active||typeof document==='undefined')return undefined
  if(lockCount===0){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden'}
  lockCount+=1
  return ()=>{
   lockCount=Math.max(0,lockCount-1)
   if(lockCount===0)document.body.style.overflow=previousOverflow
  }
 },[active])
}
export interface FocusTrapOptions{onClose?():void;closeOnEscape?:boolean;autoFocus?:boolean;restoreFocus?:boolean}
/** Moves focus into the overlay, cycles Tab within it and restores focus to the trigger on close. */
export function useFocusTrap(ref:{current:HTMLElement|null},open:boolean,{onClose,closeOnEscape=true,autoFocus=true,restoreFocus=true}:FocusTrapOptions={}){
 const triggerRef=useRef<HTMLElement|null>(null)
 useEffect(()=>{
  if(!open||typeof document==='undefined')return undefined
  triggerRef.current=document.activeElement as HTMLElement|null
  const container=ref.current
  if(autoFocus&&container){
   const target=focusableElements(container)[0]??container
   window.requestAnimationFrame(()=>target.focus({preventScroll:true}))
  }
  const handleKeyDown=(event:KeyboardEvent)=>{
   const node=ref.current
   if(!node)return
   if(event.key==='Escape'&&closeOnEscape){event.stopPropagation();onClose?.();return}
   if(event.key!=='Tab')return
   const items=focusableElements(node)
   if(!items.length){event.preventDefault();node.focus({preventScroll:true});return}
   const first=items[0]
   const last=items[items.length-1]
   const active=document.activeElement
   if(event.shiftKey&&(active===first||active===node)){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&active===last){event.preventDefault();first.focus()}
  }
  document.addEventListener('keydown',handleKeyDown,true)
  return ()=>{
   document.removeEventListener('keydown',handleKeyDown,true)
   if(restoreFocus)triggerRef.current?.focus?.({preventScroll:true})
  }
 },[autoFocus,closeOnEscape,onClose,open,ref,restoreFocus])
}
/** Closes a non-modal surface when the pointer leaves it or Escape is pressed. */
export function useDismissOnOutside(ref:{current:HTMLElement|null},open:boolean,onClose:()=>void,extraRef?:{current:HTMLElement|null}){
 useEffect(()=>{
  if(!open||typeof document==='undefined')return undefined
  const handlePointer=(event:MouseEvent)=>{
   const target=event.target as Node
   if(ref.current?.contains(target)||extraRef?.current?.contains(target))return
   onClose()
  }
  const handleKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()}
  document.addEventListener('mousedown',handlePointer)
  document.addEventListener('keydown',handleKey)
  return ()=>{
   document.removeEventListener('mousedown',handlePointer)
   document.removeEventListener('keydown',handleKey)
  }
 },[extraRef,onClose,open,ref])
}
/** Reads the user's reduced-motion preference so overlays can disable animation. */
export function usePrefersReducedMotion(){
 const subscribe=useCallback((notify:()=>void)=>{
  if(typeof window==='undefined'||!window.matchMedia)return ()=>undefined
  const query=window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change',notify)
  return ()=>query.removeEventListener('change',notify)
 },[])
 const getSnapshot=useCallback(()=>typeof window!=='undefined'&&Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),[])
 return useSyncExternalStore(subscribe,getSnapshot,()=>false)
}
/** Roving keyboard navigation helper shared by menus, dropdowns and context menus. */
export function useRovingIndex(length:number,open:boolean){
 const [index,setIndex]=useState(-1)
 const [lastOpen,setLastOpen]=useState(open)
 if(lastOpen!==open){
  setLastOpen(open)
  if(!open)setIndex(-1)
 }
 const move=useCallback((delta:number)=>{
  setIndex((current)=>{
   if(!length)return -1
   const next=current+delta
   if(next<0)return length-1
   if(next>=length)return 0
   return next
  })
 },[length])
 return {index,setIndex,move}
}
export type OverlayPlacement='top'|'bottom'|'start'|'end'
export type OverlaySize='sm'|'md'|'lg'|'fullscreen'
