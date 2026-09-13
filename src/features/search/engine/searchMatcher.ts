import type { SearchResult } from '../types'; import { normalizeSearchText } from './searchParser'
export const searchMatcher=(item:SearchResult,tokens:readonly string[])=>{const source=normalizeSearchText([item.title,item.description,item.status,...(item.keywords??[])].join(' '));return tokens.every((token)=>source.includes(token))}
