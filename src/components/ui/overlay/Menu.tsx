import {useCallback,useEffect,useId,useRef,useState,type ReactNode} from 'react'
import {Icon,type IconName} from '../Icon'
import {Spinner} from '../Feedback'
import {cx} from '../utils'
import {useDismissOnOutside,useOverlayLayer,useRovingIndex} from './overlayPrimitives'
export interface MenuItemConfig{
 id:string;label:string;icon?:IconName;description?:string;disabled?:boolean;danger?:boolean;separatorBefore?:boolean;
 items?:readonly MenuItemConfig[];onSelect?():void
}
interface MenuListProps{items:readonly MenuItemConfig[];activeIndex:number;onHover(index:number):void;onSelect(item:MenuItemConfig):void;labelledBy?:string;searchTerm?:string}
function MenuList({items,activeIndex,onHover,onSelect,labelledBy}:MenuListProps){
 const [openSub,setOpenSub]=useState<string|null>(null)
 return <ul className="ui-menu__list" role="menu" aria-labelledby={labelledBy}>
  {items.map((item,index)=>{
   const hasChildren=Boolean(item.items?.length)
   return <li key={item.id} className={cx('ui-menu__item-wrap',item.separatorBefore&&'ui-menu__item-wrap--separated')} role="none">
    <button
     type="button"
     role={hasChildren?'menuitem':'menuitem'}
     className={cx('ui-menu__item',item.danger&&'ui-menu__item--danger',index===activeIndex&&'ui-menu__item--active')}
     disabled={item.disabled}
     aria-haspopup={hasChildren||undefined}
     aria-expanded={hasChildren?openSub===item.id:undefined}
     tabIndex={index===activeIndex?0:-1}
     onMouseEnter={()=>{onHover(index);if(hasChildren)setOpenSub(item.id)}}
     onFocus={()=>onHover(index)}
     onClick={()=>{if(hasChildren){setOpenSub(openSub===item.id?null:item.id);return}onSelect(item)}}
    >
     {item.icon&&<Icon name={item.icon} size="sm"/>}
     <span className="ui-menu__label">{item.label}{item.description&&<span className="ui-menu__description">{item.description}</span>}</span>
     {hasChildren&&<Icon name="chevron" size="sm" directional/>}
    </button>
    {hasChildren&&openSub===item.id&&<div className="ui-menu__submenu">
     <MenuList items={item.items??[]} activeIndex={-1} onHover={()=>undefined} onSelect={onSelect}/>
    </div>}
   </li>
  })}
 </ul>
}
export interface DropdownProps{
 label:ReactNode;items:readonly MenuItemConfig[];icon?:IconName;disabled?:boolean;loading?:boolean;searchable?:boolean;
 searchPlaceholder?:string;align?:'start'|'end';className?:string;emptyLabel?:string;triggerVariant?:'button'|'ghost'
}
/** Enterprise dropdown menu with nested items, keyboard navigation, optional search and RTL-aware placement. */
export function Dropdown({label,items,icon,disabled=false,loading=false,searchable=false,searchPlaceholder='جست‌وجو…',align='start',className,emptyLabel='موردی یافت نشد',triggerVariant='button'}:DropdownProps){
 const [open,setOpen]=useState(false)
 const [term,setTerm]=useState('')
 const anchorRef=useRef<HTMLDivElement|null>(null)
 const surfaceRef=useRef<HTMLDivElement|null>(null)
 const triggerId=useId()
 const layer=useOverlayLayer(open)
 const visible=term.trim()?items.filter((item)=>item.label.includes(term.trim())):items
 const roving=useRovingIndex(visible.length,open)
 const close=useCallback(()=>{setOpen(false);setTerm('')},[])
 useDismissOnOutside(surfaceRef,open,close,anchorRef)
 const select=useCallback((item:MenuItemConfig)=>{item.onSelect?.();close()},[close])
 const handleKeyDown=(event:React.KeyboardEvent)=>{
  if(!open&&(event.key==='ArrowDown'||event.key==='Enter'||event.key===' ')){event.preventDefault();setOpen(true);return}
  if(!open)return
  if(event.key==='ArrowDown'){event.preventDefault();roving.move(1)}
  else if(event.key==='ArrowUp'){event.preventDefault();roving.move(-1)}
  else if(event.key==='Home'){event.preventDefault();roving.setIndex(0)}
  else if(event.key==='End'){event.preventDefault();roving.setIndex(visible.length-1)}
  else if(event.key==='Enter'||event.key===' '){
   const item=visible[roving.index]
   if(item&&!item.disabled){event.preventDefault();select(item)}
  }
 }
 return <div className={cx('ui-menu-anchor',className)} ref={anchorRef} onKeyDown={handleKeyDown}>
  <button
   type="button"
   id={triggerId}
   className={cx('ui-menu__trigger',triggerVariant==='ghost'&&'ui-menu__trigger--ghost')}
   aria-haspopup="menu"
   aria-expanded={open}
   disabled={disabled}
   onClick={()=>setOpen(!open)}
  >
   {icon&&<Icon name={icon} size="sm"/>}
   <span>{label}</span>
   <Icon name="chevron" size="sm"/>
  </button>
  {open&&<div className={cx('ui-menu',`ui-menu--${align}`)} style={{zIndex:layer.zIndex}} ref={surfaceRef}>
   {searchable&&<div className="ui-menu__search"><input type="search" value={term} onChange={(event)=>setTerm(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder}/></div>}
   {loading?<div className="ui-menu__status"><Spinner size="sm" inline/></div>
    :visible.length?<MenuList items={visible} activeIndex={roving.index} onHover={roving.setIndex} onSelect={select} labelledBy={triggerId}/>
    :<p className="ui-menu__status">{emptyLabel}</p>}
  </div>}
 </div>
}
export interface ContextMenuProps{items:readonly MenuItemConfig[];children:ReactNode;label?:string;className?:string}
/** Right-click / keyboard invoked context menu with dynamic positioning inside its anchor. */
export function ContextMenu({items,children,label='منوی زمینه',className}:ContextMenuProps){
 const [state,setState]=useState<{open:boolean;x:number;y:number}>({open:false,x:0,y:0})
 const anchorRef=useRef<HTMLDivElement|null>(null)
 const surfaceRef=useRef<HTMLDivElement|null>(null)
 const layer=useOverlayLayer(state.open)
 const roving=useRovingIndex(items.length,state.open)
 const close=useCallback(()=>setState((current)=>({...current,open:false})),[])
 useDismissOnOutside(surfaceRef,state.open,close,anchorRef)
 useEffect(()=>{
  if(!state.open)return undefined
  const first=surfaceRef.current?.querySelector<HTMLElement>('button:not([disabled])')
  first?.focus({preventScroll:true})
  return undefined
 },[state.open])
 const openAt=(clientX:number,clientY:number)=>{
  const rect=anchorRef.current?.getBoundingClientRect()
  setState({open:true,x:rect?clientX-rect.left:0,y:rect?clientY-rect.top:0})
 }
 return <div
  className={cx('ui-context-anchor',className)}
  ref={anchorRef}
  onContextMenu={(event)=>{event.preventDefault();openAt(event.clientX,event.clientY)}}
  onKeyDown={(event)=>{
   if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')){event.preventDefault();openAt(0,0);return}
   if(!state.open)return
   if(event.key==='ArrowDown'){event.preventDefault();roving.move(1)}
   else if(event.key==='ArrowUp'){event.preventDefault();roving.move(-1)}
  }}
 >
  {children}
  {state.open&&<div
   className="ui-menu ui-menu--context"
   style={{zIndex:layer.zIndex,insetInlineStart:`${state.x}px`,insetBlockStart:`${state.y}px`}}
   ref={surfaceRef}
   aria-label={label}
  >
   <MenuList items={items} activeIndex={roving.index} onHover={roving.setIndex} onSelect={(item)=>{item.onSelect?.();close()}}/>
  </div>}
 </div>
}
