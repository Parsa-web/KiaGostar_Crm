import {useId,useState,type ReactNode} from 'react'
import {Button} from '../Button'
import {Icon} from '../Icon'
import {SearchField} from '../forms'
import {formatNumber} from '../../../core/utils'
import {Tag} from './Tag'
import {cx} from '../utils'
export interface ActiveFilter{key:string;label:ReactNode;value:ReactNode;onRemove?():void}
export interface FilterBarProps{
 searchValue?:string;onSearchChange?(value:string):void;searchPlaceholder?:string;searchLabel?:string;
 filters?:ReactNode;advancedFilters?:ReactNode;activeFilters?:readonly ActiveFilter[];onResetAll?():void;
 actions?:ReactNode;collapsible?:boolean;defaultExpanded?:boolean;className?:string
}
export function FilterBar({searchValue,onSearchChange,searchPlaceholder='جست‌وجو…',searchLabel='جست‌وجو',filters,advancedFilters,activeFilters=[],onResetAll,actions,collapsible=true,defaultExpanded=false,className}:FilterBarProps){
 const [expanded,setExpanded]=useState(defaultExpanded)
 const panelId=useId()
 return <section className={cx('ui-filter-bar',className)} role="search" aria-label="نوار فیلتر">
  <div className="ui-filter-bar__primary">
   {onSearchChange&&<div className="ui-filter-bar__search"><SearchField aria-label={searchLabel} placeholder={searchPlaceholder} value={searchValue??''} onChange={(event)=>onSearchChange(event.target.value)} onClear={()=>onSearchChange('')}/></div>}
   {filters&&<div className="ui-filter-bar__slots">{filters}</div>}
   <div className="ui-filter-bar__controls">
    {advancedFilters&&collapsible&&<Button variant="ghost" size="sm" startIcon={<Icon name="settings" size="sm"/>} aria-expanded={expanded} aria-controls={panelId} onClick={()=>setExpanded((current)=>!current)}>فیلترهای پیشرفته</Button>}
    {actions}
   </div>
  </div>
  {advancedFilters&&(!collapsible||expanded)&&<div className="ui-filter-bar__advanced" id={panelId}>{advancedFilters}</div>}
  {activeFilters.length>0&&<div className="ui-filter-bar__active">
   <span className="ui-filter-bar__active-label">فیلترهای فعال ({formatNumber(activeFilters.length)})</span>
   <ul className="ui-filter-bar__active-list">
    {activeFilters.map((filter)=><li key={filter.key}><Tag tone="primary" size="sm" removable={Boolean(filter.onRemove)} onRemove={filter.onRemove} removeLabel={`حذف فیلتر ${String(filter.label)}`}><span className="ui-filter-bar__active-key">{filter.label}:</span> {filter.value}</Tag></li>)}
   </ul>
   {onResetAll&&<Button variant="text" size="sm" onClick={onResetAll}>پاک‌سازی همه</Button>}
  </div>}
 </section>
}
export interface SearchSummaryProps{total:number;keyword?:string;activeFilters?:readonly ActiveFilter[];onClear?():void;label?:ReactNode;className?:string}
export function SearchSummary({total,keyword,activeFilters=[],onClear,label='نتیجه',className}:SearchSummaryProps){
 return <div className={cx('ui-search-summary',className)} role="status" aria-live="polite">
  <p className="ui-search-summary__text">
   <strong>{formatNumber(total)}</strong> {label}
   {keyword&&<> برای «<span className="ui-search-summary__keyword">{keyword}</span>»</>}
   {activeFilters.length>0&&<> با {formatNumber(activeFilters.length)} فیلتر فعال</>}
  </p>
  {(keyword||activeFilters.length>0)&&onClear&&<Button variant="text" size="sm" onClick={onClear}>پاک‌سازی جست‌وجو</Button>}
 </div>
}
