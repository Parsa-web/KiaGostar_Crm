import type {ReactNode} from 'react'
import {cx} from '../utils'
export interface ToolbarProps{title?:ReactNode;subtitle?:ReactNode;search?:ReactNode;filters?:ReactNode;exportSlot?:ReactNode;actions?:ReactNode;selectionSummary?:ReactNode;bulkActions?:ReactNode;sticky?:boolean;className?:string}
export function Toolbar({title,subtitle,search,filters,exportSlot,actions,selectionSummary,bulkActions,sticky=false,className}:ToolbarProps){
 return <div className={cx('ui-toolbar',sticky&&'ui-toolbar--sticky',className)} role="toolbar" aria-label={typeof title==='string'?title:'نوار ابزار'}>
  <div className="ui-toolbar__main">
   {(title||subtitle)&&<div className="ui-toolbar__titles">{title&&<h2 className="ui-toolbar__title">{title}</h2>}{subtitle&&<p className="ui-toolbar__subtitle">{subtitle}</p>}</div>}
   <div className="ui-toolbar__slots">
    {search&&<div className="ui-toolbar__search">{search}</div>}
    {filters&&<div className="ui-toolbar__filters">{filters}</div>}
    {exportSlot&&<div className="ui-toolbar__export">{exportSlot}</div>}
    {actions&&<div className="ui-toolbar__actions">{actions}</div>}
   </div>
  </div>
  {(selectionSummary||bulkActions)&&<div className="ui-toolbar__selection" aria-live="polite">
   {selectionSummary&&<span className="ui-toolbar__selection-summary">{selectionSummary}</span>}
   {bulkActions&&<div className="ui-toolbar__bulk">{bulkActions}</div>}
  </div>}
 </div>
}
export function ViewSwitcher<T extends string>({views,value,onChange,label='نمای نمایش',className}:{views:readonly {id:T;label:ReactNode;icon?:ReactNode}[];value:T;onChange(view:T):void;label?:string;className?:string}){
 return <div className={cx('ui-view-switcher',className)} role="radiogroup" aria-label={label}>
  {views.map((view)=><button key={view.id} type="button" role="radio" aria-checked={value===view.id} className={cx('ui-view-switcher__option',value===view.id&&'is-active')} onClick={()=>onChange(view.id)}>{view.icon}<span>{view.label}</span></button>)}
 </div>
}
