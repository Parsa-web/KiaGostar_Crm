import {cx} from '../utils'
export interface SkeletonBlockProps{lines?:number;className?:string}
const range=(length:number)=>Array.from({length},(_,index)=>index)
export function SkeletonLine({className}:{className?:string}){return <span className={cx('ui-skel__line',className)}/>}
export function TableSkeleton({rows=6,columns=5,className}:{rows?:number;columns?:number;className?:string}){
 return <div className={cx('ui-skel ui-skel--table',className)} role="status" aria-live="polite" aria-busy="true">
  <span className="visually-hidden">در حال بارگذاری جدول</span>
  <div className="ui-skel__table-head" aria-hidden="true">{range(columns).map((column)=><SkeletonLine key={column}/>)}</div>
  {range(rows).map((row)=><div className="ui-skel__table-row" key={row} aria-hidden="true">{range(columns).map((column)=><SkeletonLine key={column}/>)}</div>)}
 </div>
}
export function CardSkeleton({count=1,className}:{count?:number;className?:string}){
 return <div className={cx('ui-skel ui-skel--cards',className)} role="status" aria-busy="true"><span className="visually-hidden">در حال بارگذاری کارت‌ها</span>{range(count).map((item)=><div className="ui-skel__card" key={item} aria-hidden="true"><SkeletonLine className="ui-skel__line--title"/><SkeletonLine/><SkeletonLine className="ui-skel__line--short"/></div>)}</div>
}
export function ListSkeleton({rows=4,className}:{rows?:number;className?:string}){
 return <div className={cx('ui-skel ui-skel--list',className)} role="status" aria-busy="true"><span className="visually-hidden">در حال بارگذاری فهرست</span>{range(rows).map((row)=><div className="ui-skel__list-row" key={row} aria-hidden="true"><span className="ui-skel__avatar"/><span className="ui-skel__list-copy"><SkeletonLine/><SkeletonLine className="ui-skel__line--short"/></span></div>)}</div>
}
export function TimelineSkeleton({rows=4,className}:{rows?:number;className?:string}){
 return <div className={cx('ui-skel ui-skel--timeline',className)} role="status" aria-busy="true"><span className="visually-hidden">در حال بارگذاری رویدادها</span>{range(rows).map((row)=><div className="ui-skel__timeline-row" key={row} aria-hidden="true"><span className="ui-skel__dot"/><span className="ui-skel__list-copy"><SkeletonLine/><SkeletonLine className="ui-skel__line--short"/></span></div>)}</div>
}
export function DashboardSkeleton({className}:{className?:string}){
 return <div className={cx('ui-skel ui-skel--dashboard',className)} role="status" aria-busy="true">
  <span className="visually-hidden">در حال بارگذاری داشبورد</span>
  <div className="ui-skel__kpi-row" aria-hidden="true">{range(4).map((item)=><div className="ui-skel__kpi" key={item}><SkeletonLine className="ui-skel__line--short"/><SkeletonLine className="ui-skel__line--title"/></div>)}</div>
  <div className="ui-skel__panels" aria-hidden="true"><div className="ui-skel__panel"/><div className="ui-skel__panel"/></div>
 </div>
}
export function TextSkeleton({lines=3,className}:SkeletonBlockProps){
 return <div className={cx('ui-skel ui-skel--text',className)} role="status" aria-busy="true"><span className="visually-hidden">در حال بارگذاری</span>{range(lines).map((line)=><SkeletonLine key={line} className={line===lines-1?'ui-skel__line--short':undefined}/>)}</div>
}
export type LoadingStateVariant='table'|'card'|'list'|'timeline'|'dashboard'|'text'
export function LoadingState({variant='text',rows,columns,className}:{variant?:LoadingStateVariant;rows?:number;columns?:number;className?:string}){
 if(variant==='table')return <TableSkeleton rows={rows} columns={columns} className={className}/>
 if(variant==='card')return <CardSkeleton count={rows} className={className}/>
 if(variant==='list')return <ListSkeleton rows={rows} className={className}/>
 if(variant==='timeline')return <TimelineSkeleton rows={rows} className={className}/>
 if(variant==='dashboard')return <DashboardSkeleton className={className}/>
 return <TextSkeleton lines={rows} className={className}/>
}
