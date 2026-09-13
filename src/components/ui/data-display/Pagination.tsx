import {useMemo} from 'react'
import {Icon} from '../Icon'
import {formatNumber} from '../../../core/utils'
import {cx} from '../utils'
export interface PaginationProps{page:number;pageSize:number;total:number;onPageChange(page:number):void;onPageSizeChange?(size:number):void;pageSizeOptions?:readonly number[];showTotal?:boolean;showFirstLast?:boolean;siblingCount?:number;compact?:boolean;label?:string;className?:string}
type PageToken=number|'start-gap'|'end-gap'
const buildPages=(current:number,totalPages:number,siblings:number):PageToken[]=>{
 if(totalPages<=siblings*2+5)return Array.from({length:totalPages},(_,index)=>index+1)
 const left=Math.max(current-siblings,2)
 const right=Math.min(current+siblings,totalPages-1)
 const tokens:PageToken[]=[1]
 if(left>2)tokens.push('start-gap')
 for(let page=left;page<=right;page+=1)tokens.push(page)
 if(right<totalPages-1)tokens.push('end-gap')
 tokens.push(totalPages)
 return tokens
}
export function Pagination({page,pageSize,total,onPageChange,onPageSizeChange,pageSizeOptions=[10,20,50,100],showTotal=true,showFirstLast=true,siblingCount=1,compact=false,label='صفحه‌بندی',className}:PaginationProps){
 const totalPages=Math.max(1,Math.ceil(total/Math.max(1,pageSize)))
 const current=Math.min(Math.max(1,page),totalPages)
 const tokens=useMemo(()=>buildPages(current,totalPages,siblingCount),[current,siblingCount,totalPages])
 const from=total===0?0:(current-1)*pageSize+1
 const to=Math.min(total,current*pageSize)
 return <nav className={cx('ui-pagination',compact&&'ui-pagination--compact',className)} aria-label={label}>
  {showTotal&&<p className="ui-pagination__summary">نمایش {formatNumber(from)} تا {formatNumber(to)} از {formatNumber(total)} مورد</p>}
  <ul className="ui-pagination__pages">
   {showFirstLast&&<li><button type="button" className="ui-pagination__control" disabled={current<=1} onClick={()=>onPageChange(1)} aria-label="نخستین صفحه"><Icon name="collapse" size="sm" directional/></button></li>}
   <li><button type="button" className="ui-pagination__control" disabled={current<=1} onClick={()=>onPageChange(current-1)} aria-label="صفحه قبلی"><Icon name="chevron" size="sm" directional/></button></li>
   {!compact&&tokens.map((token)=>typeof token==='number'
    ?<li key={token}><button type="button" className={cx('ui-pagination__page',token===current&&'is-current')} aria-current={token===current?'page':undefined} aria-label={`صفحه ${formatNumber(token)}`} onClick={()=>onPageChange(token)}>{formatNumber(token)}</button></li>
    :<li key={token} className="ui-pagination__gap" aria-hidden="true">…</li>)}
   {compact&&<li className="ui-pagination__position">صفحه {formatNumber(current)} از {formatNumber(totalPages)}</li>}
   <li><button type="button" className="ui-pagination__control ui-pagination__control--next" disabled={current>=totalPages} onClick={()=>onPageChange(current+1)} aria-label="صفحه بعدی"><Icon name="chevron" size="sm" directional/></button></li>
   {showFirstLast&&<li><button type="button" className="ui-pagination__control ui-pagination__control--next" disabled={current>=totalPages} onClick={()=>onPageChange(totalPages)} aria-label="آخرین صفحه"><Icon name="collapse" size="sm" directional/></button></li>}
  </ul>
  {onPageSizeChange&&<label className="ui-pagination__size">
   <span>تعداد در صفحه</span>
   <select value={pageSize} onChange={(event)=>onPageSizeChange(Number(event.target.value))}>{pageSizeOptions.map((size)=><option key={size} value={size}>{formatNumber(size)}</option>)}</select>
  </label>}
 </nav>
}
