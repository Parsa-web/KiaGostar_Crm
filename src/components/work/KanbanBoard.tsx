import {memo,useCallback,useState,type DragEvent,type KeyboardEvent,type ReactNode} from 'react'
import {EmptyState,LoadingState} from '../ui'
import {formatNumber} from '../../core/utils'
import {cx} from '../ui/utils'
export interface KanbanColumnConfig{id:string;title:ReactNode;tone?:'neutral'|'primary'|'success'|'warning'|'danger'|'info';description?:ReactNode}
export interface KanbanBoardProps<T>{
 columns:readonly KanbanColumnConfig[];items:readonly T[];itemKey(item:T):string;columnOf(item:T):string;
 renderCard(item:T):ReactNode;onCardActivate?(item:T):void;onCardMove?(itemKey:string,columnId:string):void;
 loading?:boolean;emptyState?:ReactNode;compact?:boolean;className?:string
}
interface CardProps<T>{item:T;itemKey(item:T):string;renderCard(item:T):ReactNode;onCardActivate?(item:T):void;draggable:boolean;onDragStart(key:string):void}
function KanbanCardBase<T>({item,itemKey,renderCard,onCardActivate,draggable,onDragStart}:CardProps<T>){
 const key=itemKey(item)
 const onKeyDown=(event:KeyboardEvent<HTMLElement>)=>{if((event.key==='Enter'||event.key===' ')&&onCardActivate){event.preventDefault();onCardActivate(item)}}
 return <li className="kanban__card-wrapper">
  <article
   className={cx('kanban__card',onCardActivate&&'is-interactive')}
   role={onCardActivate?'button':undefined}
   tabIndex={onCardActivate?0:undefined}
   draggable={draggable}
   onDragStart={draggable?(event:DragEvent<HTMLElement>)=>{event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',key);onDragStart(key)}:undefined}
   onClick={onCardActivate?()=>onCardActivate(item):undefined}
   onKeyDown={onCardActivate?onKeyDown:undefined}
  >{renderCard(item)}</article>
 </li>
}
const KanbanCard=memo(KanbanCardBase)as typeof KanbanCardBase
export function KanbanBoard<T>({columns,items,itemKey,columnOf,renderCard,onCardActivate,onCardMove,loading=false,emptyState,compact=false,className}:KanbanBoardProps<T>){
 const [dragging,setDragging]=useState<string|null>(null)
 const [overColumn,setOverColumn]=useState<string|null>(null)
 const onDragStart=useCallback((key:string)=>setDragging(key),[])
 const onDrop=useCallback((columnId:string)=>{if(dragging&&onCardMove)onCardMove(dragging,columnId);setDragging(null);setOverColumn(null)},[dragging,onCardMove])
 if(loading)return <LoadingState variant="card" className={className}/>
 if(!items.length)return <div className={className}>{emptyState??<EmptyState icon="folder" title="موردی برای نمایش وجود ندارد"/>}</div>
 return <div className={cx('kanban',compact&&'kanban--compact',className)} role="list" aria-label="تخته وضعیت">
  {columns.map((column)=>{
   const columnItems=items.filter((item)=>columnOf(item)===column.id)
   return <section
    key={column.id}
    role="listitem"
    aria-label={typeof column.title==='string'?column.title:column.id}
    className={cx('kanban__column',`kanban__column--${column.tone??'neutral'}`,overColumn===column.id&&'is-drop-target')}
    onDragOver={onCardMove?(event)=>{event.preventDefault();setOverColumn(column.id)}:undefined}
    onDragLeave={onCardMove?()=>setOverColumn((current)=>current===column.id?null:current):undefined}
    onDrop={onCardMove?(event)=>{event.preventDefault();onDrop(column.id)}:undefined}
   >
    <header className="kanban__column-head">
     <h3 className="kanban__column-title">{column.title}</h3>
     <span className="kanban__count" aria-label={`${formatNumber(columnItems.length)} مورد`}>{formatNumber(columnItems.length)}</span>
    </header>
    {column.description&&<p className="kanban__column-description">{column.description}</p>}
    <ul className="kanban__list">
     {columnItems.map((item)=><KanbanCard key={itemKey(item)} item={item} itemKey={itemKey} renderCard={renderCard} onCardActivate={onCardActivate} draggable={Boolean(onCardMove)} onDragStart={onDragStart}/>)}
     {!columnItems.length&&<li className="kanban__empty">موردی در این ستون نیست</li>}
    </ul>
   </section>
  })}
 </div>
}
