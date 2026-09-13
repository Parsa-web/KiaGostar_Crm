import {useCallback,useMemo,useState} from 'react'
export type SortDirection='asc'|'desc'
export interface CollectionSort{key:string;direction:SortDirection}
export interface CollectionViewOptions<TFilters extends Record<string,string>>{initialFilters:TFilters;initialSort?:CollectionSort|null;initialPageSize?:number}
export interface CollectionViewState<TFilters extends Record<string,string>>{
 keyword:string;setKeyword(value:string):void
 filters:TFilters;setFilter(key:keyof TFilters,value:string):void;clearFilter(key:keyof TFilters):void;resetAll():void
 sort:CollectionSort|null;setSort(sort:CollectionSort):void
 page:number;setPage(page:number):void;pageSize:number;setPageSize(size:number):void
 selection:readonly string[];setSelection(keys:readonly string[]):void;clearSelection():void
 hasActiveCriteria:boolean
}
/** Presentation-only collection state (search, filters, sort, paging, selection). Contains no business/domain rules. */
export function useCollectionView<TFilters extends Record<string,string>>({initialFilters,initialSort=null,initialPageSize=10}:CollectionViewOptions<TFilters>):CollectionViewState<TFilters>{
 const [keyword,setKeywordState]=useState('')
 const [filters,setFilters]=useState<TFilters>(initialFilters)
 const [sort,setSort]=useState<CollectionSort|null>(initialSort)
 const [page,setPage]=useState(1)
 const [pageSize,setPageSizeState]=useState(initialPageSize)
 const [selection,setSelection]=useState<readonly string[]>([])
 const setKeyword=useCallback((value:string)=>{setKeywordState(value);setPage(1)},[])
 const setFilter=useCallback((key:keyof TFilters,value:string)=>{setFilters((current)=>({...current,[key]:value}));setPage(1)},[])
 const clearFilter=useCallback((key:keyof TFilters)=>{setFilters((current)=>({...current,[key]:initialFilters[key]}));setPage(1)},[initialFilters])
 const resetAll=useCallback(()=>{setKeywordState('');setFilters(initialFilters);setPage(1)},[initialFilters])
 const setPageSize=useCallback((size:number)=>{setPageSizeState(size);setPage(1)},[])
 const clearSelection=useCallback(()=>setSelection([]),[])
 const hasActiveCriteria=useMemo(()=>keyword.trim().length>0||Object.keys(initialFilters).some((key)=>filters[key]!==initialFilters[key]),[filters,initialFilters,keyword])
 return {keyword,setKeyword,filters,setFilter,clearFilter,resetAll,sort,setSort,page,setPage,pageSize,setPageSize,selection,setSelection,clearSelection,hasActiveCriteria}
}
export const paginate=<T,>(rows:readonly T[],page:number,pageSize:number):readonly T[]=>rows.slice((page-1)*pageSize,(page-1)*pageSize+pageSize)
export function sortRows<T>(rows:readonly T[],sort:CollectionSort|null,accessors:Readonly<Record<string,(row:T)=>string|number>>):readonly T[]{
 if(!sort)return rows
 const accessor=accessors[sort.key]
 if(!accessor)return rows
 const factor=sort.direction==='asc'?1:-1
 return [...rows].sort((a,b)=>{
  const left=accessor(a)
  const right=accessor(b)
  if(typeof left==='number'&&typeof right==='number')return (left-right)*factor
  return String(left).localeCompare(String(right),'fa')*factor
 })
}
