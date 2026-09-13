import { parseSearchQuery } from '../engine/searchParser'
export class SmartSearchService { expand(query:string){return parseSearchQuery(query)} similar(left:string,right:string){const a=new Set(parseSearchQuery(left));return parseSearchQuery(right).some((token)=>a.has(token))} }
