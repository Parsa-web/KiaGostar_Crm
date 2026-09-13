import {useId,useLayoutEffect,useMemo,useRef,useState,type ReactNode} from 'react'
import {formatCompactNumber,formatNumber,type DigitStyle} from '../../../core/utils'
import {EmptyState} from './EmptyState'
import {cx} from '../utils'
export interface ChartPoint{label:string;value:number;color?:string}
export interface ChartBaseProps{
 data:readonly ChartPoint[];title:string;description?:string;height?:number;digits?:DigitStyle;valueSuffix?:string;className?:string;emptyLabel?:string
}
const seriesColor=(index:number,point?:ChartPoint)=>point?.color??`var(--color-chart-${(index%6)+1},var(--color-primary))`
/** Screen-reader table mirroring the visual series so charts never rely on vision alone. */
function ChartData({data,digits='persian',valueSuffix,captionId}:{data:readonly ChartPoint[];digits?:DigitStyle;valueSuffix?:string;captionId:string}){
 return <table className="visually-hidden" aria-describedby={captionId}>
  <caption>داده‌های نمودار</caption>
  <thead><tr><th scope="col">عنوان</th><th scope="col">مقدار</th></tr></thead>
  <tbody>{data.map((point)=><tr key={point.label}><th scope="row">{point.label}</th><td>{formatNumber(point.value,{digits})}{valueSuffix}</td></tr>)}</tbody>
 </table>
}
function ChartFrame({title,description,children,data,digits,valueSuffix,className,emptyLabel='داده‌ای برای نمایش وجود ندارد'}:ChartBaseProps&{children:ReactNode}){
 const captionId=useId()
 if(!data.length)return <figure className={cx('ui-chart',className)}>
  <figcaption className="ui-chart__title">{title}</figcaption>
  <EmptyState variant="inline" compact icon="chart" title={emptyLabel}/>
 </figure>
 return <figure className={cx('ui-chart',className)} role="group" aria-labelledby={captionId}>
  <figcaption className="ui-chart__title" id={captionId}>{title}{description&&<span className="ui-chart__description">{description}</span>}</figcaption>
  {children}
  <ChartData data={data} digits={digits} valueSuffix={valueSuffix} captionId={captionId}/>
 </figure>
}
/** Horizontal bar chart; bars grow from the inline start so it reads naturally in RTL. */
export function BarChart({data,height=220,digits='persian',valueSuffix,...rest}:ChartBaseProps){
 const max=useMemo(()=>Math.max(1,...data.map((point)=>point.value)),[data])
 return <ChartFrame data={data} digits={digits} valueSuffix={valueSuffix} {...rest}>
  <ul className="ui-chart__bars" style={{['--ui-chart-height' as string]:`${height}px`}} aria-hidden="true">
   {data.map((point,index)=><li key={point.label} className="ui-chart__bar-row">
    <span className="ui-chart__bar-label">{point.label}</span>
    <span className="ui-chart__bar-track"><span className="ui-chart__bar-fill" style={{inlineSize:`${Math.round((point.value/max)*100)}%`,background:seriesColor(index,point)}}/></span>
    <span className="ui-chart__bar-value">{formatNumber(point.value,{digits})}{valueSuffix}</span>
   </li>)}
  </ul>
 </ChartFrame>
}
export interface LineChartProps extends ChartBaseProps{area?:boolean}
/** Line / area chart rendered as inline SVG with an accessible data table fallback. */
export function LineChart({data,height=220,area=false,digits='persian',valueSuffix,...rest}:LineChartProps){
 const {points,fill}=useMemo(()=>{
  const max=Math.max(1,...data.map((point)=>point.value))
  const step=data.length>1?100/(data.length-1):0
  const coords=data.map((point,index)=>`${index*step},${100-(point.value/max)*100}`)
  return {points:coords.join(' '),fill:`0,100 ${coords.join(' ')} 100,100`}
 },[data])
 return <ChartFrame data={data} digits={digits} valueSuffix={valueSuffix} {...rest}>
  <div className="ui-chart__canvas" style={{['--ui-chart-height' as string]:`${height}px`}} aria-hidden="true">
   <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="ui-chart__svg">
    {area&&<polygon points={fill} fill="var(--color-primary-soft,var(--color-background-muted))"/>}
    <polyline points={points} fill="none" stroke="var(--color-primary)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
   </svg>
   <ul className="ui-chart__axis">{data.map((point)=><li key={point.label}>{point.label}</li>)}</ul>
  </div>
 </ChartFrame>
}
/** Donut / pie chart driven by conic-gradient so it stays crisp at any size. */
export function DonutChart({data,height=200,digits='persian',valueSuffix,...rest}:ChartBaseProps){
 const {gradient,total}=useMemo(()=>{
  const sum=data.reduce((accumulator,point)=>accumulator+point.value,0)||1
  const stops=data.map((point,index)=>{
   const consumed=data.slice(0,index).reduce((accumulator,entry)=>accumulator+entry.value,0)
   const start=(consumed/sum)*100
   const end=((consumed+point.value)/sum)*100
   return `${seriesColor(index,point)} ${start}% ${end}%`
  })
  return {gradient:`conic-gradient(${stops.join(',')})`,total:sum}
 },[data])
 return <ChartFrame data={data} digits={digits} valueSuffix={valueSuffix} {...rest}>
  <div className="ui-chart__donut-wrap" style={{['--ui-chart-height' as string]:`${height}px`}}>
   <div className="ui-chart__donut" style={{background:gradient}} aria-hidden="true"><span>{formatCompactNumber(total,{digits})}</span></div>
   <ul className="ui-chart__legend">
    {data.map((point,index)=><li key={point.label}>
     <span className="ui-chart__swatch" style={{background:seriesColor(index,point)}} aria-hidden="true"/>
     <span className="ui-chart__legend-label">{point.label}</span>
     <span className="ui-chart__legend-value">{formatNumber(point.value,{digits})}{valueSuffix} · {formatNumber(Math.round(point.value/total*100),{digits})}٪</span>
    </li>)}
   </ul>
  </div>
 </ChartFrame>
}

export interface TrendSeries{id:string;label:string;color:string;dashed?:boolean;data:readonly ChartPoint[]}
export interface MultiSeriesLineChartProps{title:string;description?:string;series:readonly TrendSeries[];unit?:string;height?:number;digits?:DigitStyle}

const smoothPath=(points:readonly [number,number][])=>points.reduce((path,point,index)=>{
 if(index===0)return `M ${point[0]} ${point[1]}`
 const previous=points[index-1];const before=points[index-2]??previous;const after=points[index+1]??point
 const cp1x=previous[0]+(point[0]-before[0])/6;const cp1y=previous[1]+(point[1]-before[1])/6
 const cp2x=point[0]-(after[0]-previous[0])/6;const cp2y=point[1]-(after[1]-previous[1])/6
 return `${path} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point[0]} ${point[1]}`
},'')

/** Detailed, responsive SVG time-series with keyboard/touch reachable values. */
export function MultiSeriesLineChart({title,description,series,unit,height=280,digits='persian'}:MultiSeriesLineChartProps){
 const [active,setActive]=useState<number|null>(null)
 const [tooltipPosition,setTooltipPosition]=useState({left:0,top:0})
 const plotRef=useRef<HTMLDivElement>(null)
 const tooltipRef=useRef<HTMLDivElement>(null)
 const labels=series[0]?.data.map((point)=>point.label)??[]
 const maxValue=Math.max(1,...series.flatMap((item)=>item.data.map((point)=>point.value)))
 const ceiling=Math.max(4,Math.ceil(maxValue/4)*4)
 const left=48,right=18,top=18,bottom=38,width=720,plotWidth=width-left-right,plotHeight=height-top-bottom
 const coordinates=(data:readonly ChartPoint[])=>data.map((point,index)=>[left+(labels.length>1?index*plotWidth/(labels.length-1):plotWidth/2),top+plotHeight-(point.value/ceiling)*plotHeight] as [number,number])
 const firstCoords=coordinates(series[0]?.data??[]);const area=firstCoords.length?`${smoothPath(firstCoords)} L ${firstCoords.at(-1)?.[0]} ${top+plotHeight} L ${firstCoords[0][0]} ${top+plotHeight} Z`:''
 const activeAnchor=useMemo(()=>{
  if(active===null)return null
  const values=series.map((item)=>item.data[active]?.value).filter((value):value is number=>typeof value==='number')
  const value=values.length?values.reduce((sum,item)=>sum+item,0)/values.length:0
  const x=left+(labels.length>1?active*plotWidth/(labels.length-1):plotWidth/2)
  const y=top+plotHeight-(value/ceiling)*plotHeight
  return {x:x/width,y:y/height}
 },[active,ceiling,height,labels.length,plotHeight,plotWidth,series])
 useLayoutEffect(()=>{
  if(!activeAnchor)return
  const plot=plotRef.current;const tooltip=tooltipRef.current
  if(!plot||!tooltip)return
  const place=()=>{
   const svg=plot.querySelector('svg');if(!svg)return
   const plotRect=plot.getBoundingClientRect();const svgRect=svg.getBoundingClientRect()
   const margin=8,gap=8
   const tooltipWidth=Math.min(tooltip.offsetWidth,Math.max(0,plotRect.width-margin*2))
   const tooltipHeight=tooltip.offsetHeight
   const anchorX=svgRect.left-plotRect.left+activeAnchor.x*svgRect.width
   const anchorY=svgRect.top-plotRect.top+activeAnchor.y*svgRect.height
   const minLeft=margin+tooltipWidth/2;const maxLeft=Math.max(minLeft,plotRect.width-margin-tooltipWidth/2)
   const nextLeft=Math.min(Math.max(anchorX,minLeft),maxLeft)
   const below=anchorY+gap;const above=anchorY-gap-tooltipHeight
   const maxTop=Math.max(margin,plotRect.height-margin-tooltipHeight)
   const nextTop=below+tooltipHeight<=plotRect.height-margin?below:above>=margin?above:Math.min(Math.max(below,margin),maxTop)
   setTooltipPosition((current)=>current.left===nextLeft&&current.top===nextTop?current:{left:nextLeft,top:nextTop})
  }
  place()
  if(typeof ResizeObserver==='undefined')return
  const observer=new ResizeObserver(place);observer.observe(plot);return()=>observer.disconnect()
 },[activeAnchor])
 if(!series.length||!labels.length)return <EmptyState variant="inline" icon="chart" title="داده‌ای برای نمایش روند وجود ندارد"/>
 return <figure className="trend-chart" aria-label={title}>
  <figcaption className="trend-chart__caption"><span><strong>{title}</strong>{description&&<small>{description}</small>}</span>{unit&&<span className="trend-chart__unit">{unit}</span>}</figcaption>
  <div className="trend-chart__legend" aria-label="راهنمای نمودار">{series.map((item)=><span key={item.id}><i style={{background:item.color}} aria-hidden="true"/>{item.label}</span>)}</div>
  <div ref={plotRef} className="trend-chart__plot">
   <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} در ${labels.length} بازه زمانی`}>
    <defs><linearGradient id="trend-area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={series[0].color} stopOpacity=".18"/><stop offset="1" stopColor={series[0].color} stopOpacity="0"/></linearGradient></defs>
    {[0,1,2,3,4].map((tick)=>{const y=top+plotHeight-(tick/4)*plotHeight;return <g key={tick}><line className="trend-chart__grid" x1={left} x2={width-right} y1={y} y2={y}/><text className="trend-chart__axis-label" x={left-10} y={y+4} textAnchor="end">{formatNumber(Math.round(ceiling*tick/4),{digits})}</text></g>})}
    {area&&<path d={area} fill="url(#trend-area-fill)"/>}
    {series.map((item)=>{const coords=coordinates(item.data);return <g key={item.id}><path d={smoothPath(coords)} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={item.dashed?'7 6':undefined}/>{coords.map(([x,y],index)=><circle key={item.data[index].label} className={active===index?'is-active':''} cx={x} cy={y} r={active===index?5:3} fill="var(--color-surface)" stroke={item.color} strokeWidth="2"/>)}</g>})}
    {labels.map((label,index)=>{const x=left+(labels.length>1?index*plotWidth/(labels.length-1):plotWidth/2);return <text key={label} className="trend-chart__axis-label" x={x} y={height-10} textAnchor="middle">{label}</text>})}
   </svg>
   <div className="trend-chart__targets" style={{insetInlineStart:`${left/width*100}%`,insetInlineEnd:`${right/width*100}%`}}>{labels.map((label,index)=><button key={label} type="button" aria-label={`نمایش جزئیات ${label}`} onFocus={()=>setActive(index)} onBlur={()=>setActive(null)} onPointerEnter={()=>setActive(index)} onPointerLeave={()=>setActive(null)}/>)}</div>
   {active!==null&&<div ref={tooltipRef} className="trend-chart__tooltip" style={{left:tooltipPosition.left,top:tooltipPosition.top}}><strong>{labels[active]}</strong>{series.map((item)=><span key={item.id}><i style={{background:item.color}}/>{item.label}: {formatNumber(item.data[active]?.value??0,{digits})}</span>)}</div>}
  </div>
  <table className="visually-hidden"><caption>{title}</caption><thead><tr><th>بازه</th>{series.map((item)=><th key={item.id}>{item.label}</th>)}</tr></thead><tbody>{labels.map((label,index)=><tr key={label}><th>{label}</th>{series.map((item)=><td key={item.id}>{formatNumber(item.data[index]?.value??0,{digits})}</td>)}</tr>)}</tbody></table>
 </figure>
}
