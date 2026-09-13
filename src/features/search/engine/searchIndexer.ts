import type { SearchResult } from '../types'; import { normalizeSearchText } from './searchParser'
export interface SearchIndexEntry { result:SearchResult;searchable:string }
export const searchIndexer=(items:readonly SearchResult[]):readonly SearchIndexEntry[]=>items.filter((item)=>item.permissionAllowed).map((result)=>({result,searchable:normalizeSearchText([result.title,result.description,result.status,...(result.keywords??[])].join(' '))}))
