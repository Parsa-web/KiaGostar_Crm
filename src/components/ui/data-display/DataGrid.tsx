import {memo,useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react'
import {Button} from '../Button'
import {Icon} from '../Icon'
import {Checkbox} from '../forms'
import {formatNumber} from '../../../core/utils'
import {EmptyState} from './EmptyState'
import {ErrorState} from './ErrorState'
import {TableSkeleton} from './LoadingState'
import {cx} from '../utils'
export interface DataGridColumn<T>{key:string;header:string;cell(row:T,index:number):ReactNode;sortValue?(row:T):string|number;align?:'start'|'center'|'end';flex?:1|2|3;hideable?:boolean;defaultHidden?:boolean;groupable?:boolean}
export interface DataGridSort{key:string;direction:'asc'|'desc'}
export interface DataGridProps<T>{
 columns:readonly DataGridColumn<T>[];rows:readonly T[];rowKey(row:T):string;caption?:string;
 sort?:DataGridSort|null;onSortChange?(sort:DataGridSort):void;
 selectable?:boolean;selectedKeys?:readonly string[];onSelectionChange?(keys:readonly string[]):void;
 rowHeight?:number;viewportHeight?:number;virtualizationThreshold?:number;overscan?:number;
 groupBy?:string|null;renderGroupHeader?(value:string,count:number):ReactNode;
 onRowActivate?(row:T):void;toolbar?:ReactNode;loading?:boolean;error?:ReactNode;onRetry?():void;emptyState?:ReactNode;
 showColumnVisibility?:boolean;className?:string
}
interface GridRow<T>{type:'row';row:T;key:string}
interface GridGroup{type:'group';key:string;label:string;count:number}
type GridEntry<T>=GridRow<T>|GridGroup
function GridCellRow<T>({row,columns,rowKey,selectable,selected,onToggle,onActivate,index}:{row:T;columns:readonly DataGridColumn<T>[];rowKey(row:T):string;selectable:boolean;selected:boolean;onToggle(key:string):void;onActivate?(row:T):void;index:number}){
 const key=rowKey(row)
 return <div role="row" aria-rowindex={index+2} aria-selected={selectable?selected:undefined} className={cx('ui-grid__row',selected&&'is-selected',onActivate&&'is-interactive')} onClick={onActivate?()=>onActivate(row):undefined}>
  {selectable&&<span role="gridcell" className="ui-grid__cell ui-grid__cell--control"><Checkbox checked={selected} onChange={()=>onToggle(key)} onClick={(event)=>event.stopPropagation()} label={<span className="visually-hidden">انتخاب سطر</span>}/></span>}
  {columns.map((column)=><span key={column.key} role="gridcell" data-flex={column.flex??1} className={cx('ui-grid__cell',`ui-grid__cell--${column.align??'start'}`)}>{column.cell(row,index)}</span>)}
 </div>
}
const MemoGridRow=memo(GridCellRow)as typeof GridCellRow
export function DataGrid<T>({columns,rows,rowKey,caption='جدول داده',sort,onSortChange,selectable=false,selectedKeys=[],onSelectionChange,rowHeight=56,viewportHeight=560,virtualizationThreshold=120,overscan=8,groupBy=null,renderGroupHeader,onRowActivate,toolbar,loading=false,error,onRetry,emptyState,showColumnVisibility=true,className}:DataGridProps<T>){
 const [hidden,setHidden]=useState<readonly string[]>(()=>columns.filter((column)=>column.defaultHidden).map((column)=>column.key))
 const [menuOpen,setMenuOpen]=useState(false)
 const [scrollTop,setScrollTop]=useState(0)
 const viewportRef=useRef<HTMLDivElement|null>(null)
 const visibleColumns=useMemo(()=>columns.filter((column)=>!hidden.includes(column.key)),[columns,hidden])
 const selection=useMemo(()=>new Set(selectedKeys),[selectedKeys])
 const groupColumn=useMemo(()=>columns.find((column)=>column.key===groupBy&&column.groupable),[columns,groupBy])
 const entries=useMemo<GridEntry<T>[]>(()=>{
  if(!groupColumn)return rows.map((row)=>({type:'row',row,key:rowKey(row)}))
  const buckets=new Map<string,T[]>()
  for(const row of rows){const value=String(groupColumn.sortValue?.(row)??'');const bucket=buckets.get(value);if(bucket)bucket.push(row);else buckets.set(value,[row])}
  return [...buckets.entries()].flatMap(([label,items])=>[{type:'group' as const,key:`group-${label}`,label,count:items.length},...items.map((row)=>({type:'row' as const,row,key:rowKey(row)}))])
 },[groupColumn,rowKey,rows])
 const virtualized=entries.length>virtualizationThreshold
 const total=entries.length*rowHeight
 const startIndex=virtualized?Math.max(0,Math.floor(scrollTop/rowHeight)-overscan):0
 const endIndex=virtualized?Math.min(entries.length,Math.ceil((scrollTop+viewportHeight)/rowHeight)+overscan):entries.length
 const slice=useMemo(()=>entries.slice(startIndex,endIndex),[endIndex,entries,startIndex])
 const onScroll=useCallback(()=>{const element=viewportRef.current;if(element)setScrollTop(element.scrollTop)},[])
 useEffect(()=>{if(viewportRef.current){viewportRef.current.scrollTop=0;setScrollTop(0)}},[rows])
 const toggleRow=useCallback((key:string)=>{const next=new Set(selection);if(next.has(key))next.delete(key);else next.add(key);onSelectionChange?.([...next])},[onSelectionChange,selection])
 const toggleColumn=useCallback((key:string)=>{setHidden((current)=>current.includes(key)?current.filter((item)=>item!==key):[...current,key])},[])
 const allKeys=useMemo(()=>rows.map(rowKey),[rowKey,rows])
 const allSelected=allKeys.length>0&&allKeys.every((key)=>selection.has(key))
 if(loading)return <div className={cx('ui-grid-host',className)}><TableSkeleton rows={8} columns={Math.max(3,visibleColumns.length)}/></div>
 if(error)return <div className={cx('ui-grid-host',className)}><ErrorState description={error} onRetry={onRetry}/></div>
 if(!rows.length)return <div className={cx('ui-grid-host',className)}>{emptyState??<EmptyState title="داده‌ای برای نمایش موجود نیست"/>}</div>
 return <div className={cx('ui-grid-host',className)}>
  <div className="ui-grid-host__toolbar">
   {toolbar}
   {showColumnVisibility&&<div className="ui-grid-host__columns">
    <Button variant="ghost" size="sm" startIcon={<Icon name="settings" size="sm"/>} aria-expanded={menuOpen} onClick={()=>setMenuOpen((current)=>!current)}>ستون‌ها</Button>
    {menuOpen&&<ul className="ui-grid-host__column-menu">
     {columns.filter((column)=>column.hideable!==false).map((column)=><li key={column.key}><Checkbox checked={!hidden.includes(column.key)} onChange={()=>toggleColumn(column.key)} label={column.header}/></li>)}
    </ul>}
   </div>}
  </div>
  <div ref={viewportRef} className="ui-grid__viewport" data-virtualized={virtualized||undefined} onScroll={virtualized?onScroll:undefined}>
   <div role="grid" aria-label={caption} aria-rowcount={entries.length+1} aria-colcount={visibleColumns.length+(selectable?1:0)} className="ui-grid">
    <div role="row" aria-rowindex={1} className="ui-grid__row ui-grid__row--head">
     {selectable&&<span role="columnheader" className="ui-grid__cell ui-grid__cell--control"><Checkbox checked={allSelected} indeterminate={!allSelected&&allKeys.some((key)=>selection.has(key))} onChange={()=>onSelectionChange?.(allSelected?[]:allKeys)} label={<span className="visually-hidden">انتخاب همه</span>}/></span>}
     {visibleColumns.map((column)=>{
      const active=sort?.key===column.key
      return <span key={column.key} role="columnheader" data-flex={column.flex??1} aria-sort={column.sortValue?active?sort?.direction==='asc'?'ascending':'descending':'none':undefined} className={cx('ui-grid__cell','ui-grid__cell--head',`ui-grid__cell--${column.align??'start'}`)}>
       {column.sortValue&&onSortChange?<button type="button" className={cx('ui-grid__sort',active&&'is-active')} onClick={()=>onSortChange({key:column.key,direction:active&&sort?.direction==='asc'?'desc':'asc'})}><span>{column.header}</span><Icon name="chevron" size="xs" className={cx('ui-grid__sort-icon',active&&sort?.direction==='desc'&&'is-descending')}/></button>:column.header}
      </span>
     })}
    </div>
    <div className="ui-grid__body" data-total-height={virtualized?total:undefined}>
     {virtualized&&startIndex>0&&<div className="ui-grid__spacer" aria-hidden="true" data-rows={startIndex}/>}
     {slice.map((entry,index)=>entry.type==='group'
      ?<div key={entry.key} role="row" className="ui-grid__group"><span role="gridcell">{renderGroupHeader?.(entry.label,entry.count)??<><strong>{entry.label}</strong> <span>({formatNumber(entry.count)})</span></>}</span></div>
      :<MemoGridRow key={entry.key} row={entry.row} columns={visibleColumns} rowKey={rowKey} selectable={selectable} selected={selection.has(entry.key)} onToggle={toggleRow} onActivate={onRowActivate} index={startIndex+index}/>)}
     {virtualized&&endIndex<entries.length&&<div className="ui-grid__spacer" aria-hidden="true" data-rows={entries.length-endIndex}/>}
    </div>
   </div>
  </div>
  <p className="ui-grid-host__footer" aria-live="polite">{formatNumber(rows.length)} ردیف{selectable&&selection.size>0&&<> — {formatNumber(selection.size)} مورد انتخاب‌شده</>}</p>
 </div>
}
