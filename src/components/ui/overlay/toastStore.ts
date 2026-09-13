import {useEffect,useState} from 'react'
export type ToastTone='success'|'warning'|'error'|'info'|'loading'
export interface ToastAction{label:string;onSelect():void}
export interface ToastInput{title:string;description?:string;tone?:ToastTone;duration?:number;persistent?:boolean;action?:ToastAction;dedupeKey?:string}
export interface ToastRecord extends ToastInput{id:string;tone:ToastTone;createdAt:number}
export const TOAST_MAX_VISIBLE=4
export const TOAST_DEFAULT_DURATION=5000
let sequence=0
let queue:readonly ToastRecord[]=[]
const listeners=new Set<(items:readonly ToastRecord[])=>void>()
const timers=new Map<string,ReturnType<typeof setTimeout>>()
const emit=()=>{listeners.forEach((listener)=>listener(queue))}
const clearTimer=(id:string)=>{
 const timer=timers.get(id)
 if(timer){clearTimeout(timer);timers.delete(id)}
}
/** Module-level toast queue: prevents duplicates, caps visible toasts and auto-dismisses transient messages. */
export const toastStore={
 all(){return queue},
 subscribe(listener:(items:readonly ToastRecord[])=>void){
  listeners.add(listener)
  return ()=>{listeners.delete(listener)}
 },
 push(input:ToastInput){
  const dedupeKey=input.dedupeKey??`${input.tone??'info'}:${input.title}`
  const existing=queue.find((item)=>(item.dedupeKey??`${item.tone}:${item.title}`)===dedupeKey)
  if(existing)return existing.id
  sequence+=1
  const record:ToastRecord={...input,tone:input.tone??'info',dedupeKey,id:`toast-${sequence}`,createdAt:Date.now()}
  queue=[...queue,record].slice(-TOAST_MAX_VISIBLE*3)
  emit()
  if(!record.persistent&&record.tone!=='loading'){
   const duration=record.duration??TOAST_DEFAULT_DURATION
   timers.set(record.id,setTimeout(()=>toastStore.dismiss(record.id),duration))
  }
  return record.id
 },
 update(id:string,patch:Partial<ToastInput>){
  queue=queue.map((item)=>item.id===id?{...item,...patch,tone:patch.tone??item.tone}:item)
  emit()
 },
 dismiss(id:string){
  clearTimer(id)
  queue=queue.filter((item)=>item.id!==id)
  emit()
 },
 clear(){
  queue.forEach((item)=>clearTimer(item.id))
  queue=[]
  emit()
 },
}
/** Subscribes a component to the toast queue (visible slice only). */
export function useToasts(){
 const [items,setItems]=useState<readonly ToastRecord[]>(toastStore.all())
 useEffect(()=>toastStore.subscribe(setItems),[])
 return items.slice(0,TOAST_MAX_VISIBLE)
}
/** Imperative toast API for feature code; safe to call from event handlers and effects. */
export const toast={
 show:(input:ToastInput)=>toastStore.push(input),
 success:(title:string,description?:string)=>toastStore.push({title,description,tone:'success'}),
 error:(title:string,description?:string)=>toastStore.push({title,description,tone:'error',duration:8000}),
 warning:(title:string,description?:string)=>toastStore.push({title,description,tone:'warning'}),
 info:(title:string,description?:string)=>toastStore.push({title,description,tone:'info'}),
 loading:(title:string,description?:string)=>toastStore.push({title,description,tone:'loading',persistent:true}),
 update:(id:string,patch:Partial<ToastInput>)=>toastStore.update(id,patch),
 dismiss:(id:string)=>toastStore.dismiss(id),
 clear:()=>toastStore.clear(),
}
export type SnackbarTone='neutral'|'success'|'error'
export interface SnackbarMessage{id:string;message:string;tone?:SnackbarTone;actionLabel?:string;onAction?():void;duration?:number}
