import {useCallback,useMemo,useState} from 'react'
import {appStore,useAppAppearance,type AppearancePreferences} from '../../stores'

export interface PersonalizationEntry{id:string;title:string;visible:boolean;collapsed:boolean}
export interface PersonalizationState{
 entries:readonly PersonalizationEntry[]
 appearance:AppearancePreferences
 toggleVisibility(id:string):void
 toggleCollapsed(id:string):void
 move(id:string,offset:number):void
 isVisible(id:string):boolean
 isCollapsed(id:string):boolean
 updateAppearance(patch:Partial<AppearancePreferences>):void
 reset():void
}

const STORAGE_PREFIX='kiagostar.dashboard-layout.v1.'
const mergeEntries=(initial:readonly {id:string;title:string}[],stored:unknown):readonly PersonalizationEntry[]=>{
 const saved=Array.isArray(stored)?stored.filter((entry):entry is Partial<PersonalizationEntry>&{id:string}=>Boolean(entry&&typeof entry==='object'&&typeof entry.id==='string')):[]
 const known=new Map(initial.map((entry)=>[entry.id,entry]))
 const ordered=saved.filter((entry)=>known.has(entry.id)).map((entry)=>({id:entry.id,title:known.get(entry.id)?.title??'',visible:entry.visible!==false,collapsed:entry.collapsed===true}))
 const seen=new Set(ordered.map((entry)=>entry.id))
 return [...ordered,...initial.filter((entry)=>!seen.has(entry.id)).map((entry)=>({...entry,visible:true,collapsed:false}))]
}

/** Per-user persisted dashboard layout plus the global live appearance preferences. */
export function useDashboardPersonalization(initial:readonly {id:string;title:string}[],scope='dashboard'):PersonalizationState{
 const app=useAppAppearance()
 const key=`${STORAGE_PREFIX}${app.appearanceUserId}.${scope}`
 const load=useCallback(()=>{if(typeof window==='undefined')return mergeEntries(initial,null);try{return mergeEntries(initial,JSON.parse(window.localStorage.getItem(key)??'null'))}catch{return mergeEntries(initial,null)}},[initial,key])
 const [layouts,setLayouts]=useState<Readonly<Record<string,readonly PersonalizationEntry[]>>>({})
 const entries=layouts[key]??load()
 const updateEntries=useCallback((updater:(current:readonly PersonalizationEntry[])=>readonly PersonalizationEntry[])=>setLayouts((current)=>{
  const previous=current[key]??load();const next=updater(previous)
  if(typeof window!=='undefined')window.localStorage.setItem(key,JSON.stringify(next));return {...current,[key]:next}
 }),[key,load])
 const toggleVisibility=useCallback((id:string)=>updateEntries((current)=>current.map((entry)=>entry.id===id?{...entry,visible:!entry.visible}:entry)),[updateEntries])
 const toggleCollapsed=useCallback((id:string)=>updateEntries((current)=>current.map((entry)=>entry.id===id?{...entry,collapsed:!entry.collapsed}:entry)),[updateEntries])
 const move=useCallback((id:string,offset:number)=>updateEntries((current)=>{
  const index=current.findIndex((entry)=>entry.id===id);const target=index+offset
  if(index<0||target<0||target>=current.length)return current
  const next=current.slice();const [item]=next.splice(index,1);next.splice(target,0,item);return next
 }),[updateEntries])
 const reset=useCallback(()=>{updateEntries(()=>mergeEntries(initial,null));appStore.resetAppearance()},[initial,updateEntries])
 const isVisible=useCallback((id:string)=>entries.find((entry)=>entry.id===id)?.visible!==false,[entries])
 const isCollapsed=useCallback((id:string)=>entries.find((entry)=>entry.id===id)?.collapsed===true,[entries])
 const updateAppearance=useCallback((patch:Partial<AppearancePreferences>)=>appStore.updateAppearance(patch),[])
 return useMemo(()=>({entries,appearance:app.appearance,toggleVisibility,toggleCollapsed,move,isVisible,isCollapsed,updateAppearance,reset}),[app.appearance,entries,isCollapsed,isVisible,move,reset,toggleCollapsed,toggleVisibility,updateAppearance])
}
