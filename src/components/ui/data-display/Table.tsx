import {Fragment,useCallback,useId,useMemo,useRef,useState,type KeyboardEvent,type ReactNode} from 'react'
import {Icon} from '../Icon'
import {Checkbox} from '../forms'
import {cx} from '../utils'
import {ErrorState} from './ErrorState'
import {EmptyState} from './EmptyState'
import {TableSkeleton} from './LoadingState'
export type TableAlign='start'|'center'|'end'
export type TableColumnWidth='xs'|'sm'|'md'|'lg'|'xl'|'auto'
export type TableBreakpoint='sm'|'md'|'lg'
export interface TableColumn<T>{key:string;header:ReactNode;headerLabel?:string;cell(row:T,index:number):ReactNode;align?:TableAlign;sortable?:boolean;width?:TableColumnWidth;hideBelow?:TableBreakpoint;wrap?:boolean}
export interface TableSort{key:string;direction:'asc'|'desc'}
export interface TableProps<T>{columns:readonly TableColumn<T>[];rows:readonly T[];rowKey(row:T):string;caption?:string;sort?:TableSort|null;onSortChange?(sort:TableSort):void;selectable?:boolean;selectedKeys?:readonly string[];onSelectionChange?(keys:readonly string[]):void;rowActions?(row:T):ReactNode;rowActionsLabel?:string;onRowActivate?(row:T):void;isRowHighlighted?(row:T):boolean;renderExpanded?(row:T):ReactNode;expandLabel?:string;zebra?:boolean;density?:'comfortable'|'compact';stickyHeader?:boolean;stickyFirstColumn?:boolean;loading?:boolean;loadingRows?:number;error?:ReactNode;onRetry?():void;emptyState?:ReactNode;footer?:ReactNode;pagination?:ReactNode;className?:string}
const nextDirection=(sort:TableSort|null|undefined,key:string)=>sort?.key===key&&sort.direction==='asc'?'desc':'asc'
export function Table<T>({columns,rows,rowKey,caption,sort,onSortChange,selectable=false,selectedKeys=[],onSelectionChange,rowActions,rowActionsLabel='اقدامات',onRowActivate,isRowHighlighted,renderExpanded,expandLabel='جزئیات ردیف',zebra=false,density='comfortable',stickyHeader=true,stickyFirstColumn=false,loading=false,loadingRows=6,error,onRetry,emptyState,footer,pagination,className}:TableProps<T>){
 const captionId=useId()
 const bodyRef=useRef<HTMLTableSectionElement|null>(null)
 const [expanded,setExpanded]=useState<readonly string[]>([])
 const [activeRow,setActiveRow]=useState(0)
 const selection=useMemo(()=>new Set(selectedKeys),[selectedKeys])
 const keys=useMemo(()=>rows.map(rowKey),[rowKey,rows])
 const allSelected=keys.length>0&&keys.every((key)=>selection.has(key))
 const partiallySelected=!allSelected&&keys.some((key)=>selection.has(key))
 const toggleAll=useCallback(()=>{onSelectionChange?.(allSelected?[]:keys)},[allSelected,keys,onSelectionChange])
 const toggleRow=useCallback((key:string)=>{const next=new Set(selection);if(next.has(key))next.delete(key);else next.add(key);onSelectionChange?.([...next])},[onSelectionChange,selection])
 const toggleExpanded=useCallback((key:string)=>{setExpanded((current)=>current.includes(key)?current.filter((item)=>item!==key):[...current,key])},[])
 const focusRow=useCallback((index:number)=>{const target=bodyRef.current?.querySelectorAll<HTMLTableRowElement>('tr[data-row-index]')[index];if(!target)return;setActiveRow(index);target.focus()},[])
 const onRowKeyDown=useCallback((event:KeyboardEvent<HTMLTableRowElement>,row:T,index:number)=>{
  if(event.key==='ArrowDown'){event.preventDefault();focusRow(Math.min(index+1,rows.length-1));return}
  if(event.key==='ArrowUp'){event.preventDefault();focusRow(Math.max(index-1,0));return}
  if(event.key==='Home'){event.preventDefault();focusRow(0);return}
  if(event.key==='End'){event.preventDefault();focusRow(rows.length-1);return}
  if(event.key==='Enter'||event.key===' '){if(event.target!==event.currentTarget)return;event.preventDefault();if(onRowActivate)onRowActivate(row);else if(renderExpanded)toggleExpanded(rowKey(row))}
 },[focusRow,onRowActivate,renderExpanded,rowKey,rows.length,toggleExpanded])
 const columnCount=columns.length+(selectable?1:0)+(renderExpanded?1:0)+(rowActions?1:0)
 if(loading)return <div className={cx('ui-table-host',className)}><TableSkeleton rows={loadingRows} columns={Math.max(3,columns.length)}/></div>
 if(error)return <div className={cx('ui-table-host',className)}><ErrorState description={error} onRetry={onRetry}/></div>
 if(!rows.length)return <div className={cx('ui-table-host',className)}>{emptyState??<EmptyState icon="folder" title="موردی برای نمایش وجود ندارد" description="با تغییر جست‌وجو یا فیلترها دوباره تلاش کنید."/>}</div>
 return <div className={cx('ui-table-host',className)}>
  <div className={cx('ui-table-scroll',stickyFirstColumn&&'ui-table-scroll--sticky-column')} tabIndex={0} role="group" aria-labelledby={caption?captionId:undefined}>
   <table className={cx('ui-table',`ui-table--${density}`,zebra&&'ui-table--zebra',stickyHeader&&'ui-table--sticky-header')}>
    {caption&&<caption id={captionId} className="visually-hidden">{caption}</caption>}
    <thead>
     <tr>
      {selectable&&<th scope="col" className="ui-table__control"><Checkbox checked={allSelected} indeterminate={partiallySelected} onChange={toggleAll} label={<span className="visually-hidden">انتخاب همه ردیف‌ها</span>}/></th>}
      {renderExpanded&&<th scope="col" className="ui-table__control"><span className="visually-hidden">{expandLabel}</span></th>}
      {columns.map((column)=>{
       const active=sort?.key===column.key
       return <th key={column.key} scope="col" data-width={column.width??'auto'} data-hide-below={column.hideBelow} className={cx('ui-table__cell',`ui-table__cell--${column.align??'start'}`)} aria-sort={column.sortable?active?sort?.direction==='asc'?'ascending':'descending':'none':undefined}>
        {column.sortable&&onSortChange?<button type="button" className={cx('ui-table__sort',active&&'is-active')} onClick={()=>onSortChange({key:column.key,direction:nextDirection(sort,column.key)})}><span>{column.header}</span><Icon name="chevron" size="xs" className={cx('ui-table__sort-icon',active&&sort?.direction==='desc'&&'is-descending')}/><span className="visually-hidden">{active?sort?.direction==='asc'?'مرتب‌سازی صعودی':'مرتب‌سازی نزولی':'مرتب‌سازی'}</span></button>:column.header}
       </th>
      })}
      {rowActions&&<th scope="col" className="ui-table__actions-head"><span className="visually-hidden">{rowActionsLabel}</span></th>}
     </tr>
    </thead>
    <tbody ref={bodyRef}>
     {rows.map((row,index)=>{
      const key=rowKey(row)
      const isSelected=selection.has(key)
      const isExpanded=expanded.includes(key)
      return <Fragment key={key}>
       <tr data-row-index={index} tabIndex={index===activeRow?0:-1} aria-selected={selectable?isSelected:undefined} onKeyDown={(event)=>onRowKeyDown(event,row,index)} onFocus={()=>setActiveRow(index)} onClick={onRowActivate?()=>onRowActivate(row):undefined} className={cx(onRowActivate&&'ui-table__row--interactive',isSelected&&'is-selected',isRowHighlighted?.(row)&&'is-highlighted')}>
        {selectable&&<td className="ui-table__control"><Checkbox checked={isSelected} onChange={()=>toggleRow(key)} onClick={(event)=>event.stopPropagation()} label={<span className="visually-hidden">انتخاب ردیف</span>}/></td>}
        {renderExpanded&&<td className="ui-table__control"><button type="button" className={cx('ui-table__expander',isExpanded&&'is-open')} aria-expanded={isExpanded} aria-controls={`${captionId}-${index}`} onClick={(event)=>{event.stopPropagation();toggleExpanded(key)}}><Icon name="chevron" size="sm"/><span className="visually-hidden">{expandLabel}</span></button></td>}
        {columns.map((column)=><td key={column.key} data-width={column.width??'auto'} data-hide-below={column.hideBelow} className={cx('ui-table__cell',`ui-table__cell--${column.align??'start'}`,column.wrap&&'ui-table__cell--wrap')} data-label={column.headerLabel??(typeof column.header==='string'?column.header:undefined)}>{column.cell(row,index)}</td>)}
        {rowActions&&<td className="ui-table__actions" onClick={(event)=>event.stopPropagation()}>{rowActions(row)}</td>}
       </tr>
       {renderExpanded&&isExpanded&&<tr className="ui-table__expansion" id={`${captionId}-${index}`}><td colSpan={columnCount}>{renderExpanded(row)}</td></tr>}
      </Fragment>
     })}
    </tbody>
    {footer&&<tfoot><tr><td colSpan={columnCount}>{footer}</td></tr></tfoot>}
   </table>
  </div>
  {pagination&&<div className="ui-table-host__pagination">{pagination}</div>}
 </div>
}
