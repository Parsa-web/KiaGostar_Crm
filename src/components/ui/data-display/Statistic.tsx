import type {ReactNode} from 'react'
import {Icon} from '../Icon'
import {formatCompactNumber,formatCurrency,formatNumber,formatPercent,formatSignedPercent,type DigitStyle} from '../../../core/utils'
import {cx} from '../utils'
export type StatisticFormat='number'|'compact'|'currency'|'percent'|'raw'
export type TrendDirection='up'|'down'|'flat'
export interface StatisticProps{value:number|string;format?:StatisticFormat;digits?:DigitStyle;currency?:string;fractionDigits?:number;prefix?:ReactNode;suffix?:ReactNode;size?:'sm'|'md'|'lg';className?:string}
/* eslint-disable react-refresh/only-export-components */
export const formatStatistic=(value:number|string,{format='number',digits='persian',currency='ریال',fractionDigits}:Omit<StatisticProps,'value'>={})=>{
 if(typeof value==='string'||format==='raw')return String(value)
 if(format==='compact')return formatCompactNumber(value,{digits})
 if(format==='currency')return formatCurrency(value,{digits,currency})
 if(format==='percent')return formatPercent(value,{digits,maximumFractionDigits:fractionDigits??1})
 return formatNumber(value,{digits,maximumFractionDigits:fractionDigits})
}
export function Statistic({value,format='number',digits='persian',currency='ریال',fractionDigits,prefix,suffix,size='md',className}:StatisticProps){
 return <span className={cx('ui-statistic',`ui-statistic--${size}`,className)}>
  {prefix&&<span className="ui-statistic__prefix">{prefix}</span>}
  <span className="ui-statistic__value">{formatStatistic(value,{format,digits,currency,fractionDigits})}</span>
  {suffix&&<span className="ui-statistic__suffix">{suffix}</span>}
 </span>
}
export const trendDirection=(change:number,threshold=0.5):TrendDirection=>change>threshold?'up':change<-threshold?'down':'flat'
/* eslint-enable react-refresh/only-export-components */
export interface TrendIndicatorProps{change:number;direction?:TrendDirection;inverted?:boolean;label?:ReactNode;digits?:DigitStyle;className?:string}
export function TrendIndicator({change,direction,inverted=false,label,digits='persian',className}:TrendIndicatorProps){
 const resolved=direction??trendDirection(change)
 const tone=resolved==='flat'?'flat':(resolved==='up')!==inverted?'positive':'negative'
 return <span className={cx('ui-trend',`ui-trend--${tone}`,className)}>
  <Icon name="chart" size="xs"/>
  <span className="ui-trend__value">{formatSignedPercent(change,{digits})}</span>
  {label&&<span className="ui-trend__label">{label}</span>}
  <span className="visually-hidden">{tone==='positive'?'روند مثبت':tone==='negative'?'روند منفی':'بدون تغییر'}</span>
 </span>
}
export interface SparklineProps{points:readonly number[];label:string;tone?:'primary'|'success'|'warning'|'danger';className?:string}
export function Sparkline({points,label,tone='primary',className}:SparklineProps){
 if(points.length<2)return null
 const max=Math.max(...points)
 const min=Math.min(...points)
 const span=max-min||1
 const path=points.map((point,index)=>`${(index/(points.length-1))*100},${100-((point-min)/span)*100}`).join(' ')
 return <svg className={cx('ui-sparkline',`ui-sparkline--${tone}`,className)} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={label} focusable="false"><polyline points={path} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></svg>
}
