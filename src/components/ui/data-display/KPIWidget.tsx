import type {ReactNode} from 'react'
import type {IconName} from '../Icon'
import {Icon} from '../Icon'
import {Statistic,TrendIndicator,type StatisticFormat} from './Statistic'
import {percentageChange} from '../../../core/utils'
import {cx} from '../utils'
export interface KPIWidgetProps{
 title:ReactNode;value:number|string;previousValue?:number;format?:StatisticFormat;currency?:string;icon?:IconName;
 tone?:'default'|'primary'|'success'|'warning'|'danger'|'info';comparisonLabel?:ReactNode;invertedTrend?:boolean;
 footer?:ReactNode;tooltip?:string;loading?:boolean;onActivate?():void;actionLabel?:string;className?:string
}
export function KPIWidget({title,value,previousValue,format='number',currency,icon,tone='default',comparisonLabel='نسبت به دوره قبل',invertedTrend=false,footer,tooltip,loading=false,onActivate,actionLabel,className}:KPIWidgetProps){
 if(loading)return <div className={cx('ui-kpi ui-kpi--loading',className)} role="status" aria-busy="true"><span className="visually-hidden">در حال بارگذاری شاخص</span><span className="ui-kpi__skeleton-line"/><span className="ui-kpi__skeleton-line ui-kpi__skeleton-line--wide"/></div>
 const change=typeof value==='number'&&previousValue!==undefined?percentageChange(value,previousValue):undefined
 /* A card is a summary, not a link: navigation belongs to the menu and to
    explicit buttons, so the tile is always a static article. */
 void onActivate
 const Element='article'
 return <Element
  className={cx('ui-kpi',`ui-kpi--${tone}`,className)}
  title={tooltip}
  aria-label={actionLabel}>
  <span className="ui-kpi__head">
   {icon&&<span className="ui-kpi__icon" aria-hidden="true"><Icon name={icon} size="md"/></span>}
   <span className="ui-kpi__title">{title}</span>
  </span>
  <span className="ui-kpi__value"><Statistic value={value} format={format} currency={currency} size="lg"/></span>
  {change!==undefined&&<span className="ui-kpi__trend"><TrendIndicator change={change} inverted={invertedTrend} label={comparisonLabel}/></span>}
  {footer&&<span className="ui-kpi__footer">{footer}</span>}
 </Element>
}
export function KPIGrid({children,columns=4,className}:{children:ReactNode;columns?:2|3|4|6;className?:string}){
 return <div className={cx('ui-kpi-grid',`ui-kpi-grid--${columns}`,className)}>{children}</div>
}
