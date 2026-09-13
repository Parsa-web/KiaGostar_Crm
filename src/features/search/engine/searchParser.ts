const variants:Record<string,string[]>= { جلسه:['meeting','جلسات','صورتجلسه','صورت‌جلسه'],meeting:['جلسه','جلسات'],task:['وظیفه','تسک'],وظیفه:['task','تسک'],report:['گزارش'],گزارش:['report'] }
export const normalizeSearchText=(value:string)=>value.normalize('NFKC').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[‌\s]+/g,' ').trim().toLocaleLowerCase('fa')
export const parseSearchQuery=(query:string)=>{const tokens=normalizeSearchText(query).split(' ').filter(Boolean);return [...new Set(tokens.flatMap((token)=>[token,...(variants[token]??[])]).map(normalizeSearchText))]}
