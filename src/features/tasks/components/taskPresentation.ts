import type {ActiveFilter} from '../../../components/ui'
import type {TaskView} from '../../../demo'
/** Presentation-only lookup tables and derivations for the task module (no business rules). */
export const taskStatusLabels:Readonly<Record<TaskView['status'],string>>={PENDING:'در انتظار شروع',IN_PROGRESS:'در حال انجام',COMPLETED:'تکمیل‌شده',OVERDUE:'دارای تأخیر'}
export const taskPriorityLabels:Readonly<Record<TaskView['priority'],string>>={LOW:'کم',NORMAL:'عادی',HIGH:'زیاد',CRITICAL:'بحرانی'}
export const taskPriorityTone:Readonly<Record<TaskView['priority'],'neutral'|'info'|'warning'|'danger'>>={LOW:'neutral',NORMAL:'info',HIGH:'warning',CRITICAL:'danger'}
export const taskStatusOptions=[{value:'',label:'همه وضعیت‌ها'},...Object.entries(taskStatusLabels).map(([value,label])=>({value,label}))]
export const taskPriorityOptions=[{value:'',label:'همه اولویت‌ها'},...Object.entries(taskPriorityLabels).map(([value,label])=>({value,label}))]
export interface TaskStats{total:number;active:number;completed:number;overdue:number;critical:number}
export const summarizeTasks=(tasks:readonly TaskView[]):TaskStats=>{
 const total=tasks.length
 return {
  total,
  active:tasks.filter((task)=>task.status==='IN_PROGRESS'||task.status==='PENDING').length,
  completed:tasks.filter((task)=>task.status==='COMPLETED').length,
  overdue:tasks.filter((task)=>task.status==='OVERDUE').length,
  critical:tasks.filter((task)=>task.priority==='CRITICAL').length,
 }
}
export interface FilterChipDescriptor{key:string;label:string;value:string;display?:string;onRemove():void}
export const buildActiveFilters=(entries:readonly FilterChipDescriptor[]):readonly ActiveFilter[]=>
 entries.filter((entry)=>entry.value!=='').map((entry)=>({key:entry.key,label:entry.label,value:entry.display??entry.value,onRemove:entry.onRemove}))
