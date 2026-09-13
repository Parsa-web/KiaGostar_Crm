import type {ReactNode} from 'react'
import {clampPercent,formatNumber,formatPercent} from '../../../core/utils'
import {cx} from '../utils'
export type ProgressTone='primary'|'success'|'warning'|'danger'|'neutral'
export interface LinearProgressProps{value?:number;label?:ReactNode;description?:ReactNode;tone?:ProgressTone;size?:'sm'|'md'|'lg';showValue?:boolean;indeterminate?:boolean;className?:string}
export function LinearProgress({value=0,label,description,tone='primary',size='md',showValue=true,indeterminate=false,className}:LinearProgressProps){
 const percent=clampPercent(value)
 return <div className={cx('ui-progress',`ui-progress--${size}`,className)}>
  {(label||showValue)&&<div className="ui-progress__head">{label&&<span className="ui-progress__label">{label}</span>}{showValue&&!indeterminate&&<span className="ui-progress__value">{formatPercent(percent,{maximumFractionDigits:0})}</span>}</div>}
  <div className={cx('ui-progress__track',`ui-progress__track--${tone}`,indeterminate&&'is-indeterminate')} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={indeterminate?undefined:Math.round(percent)} aria-label={typeof label==='string'?label:'میزان پیشرفت'}>
   <span className="ui-progress__fill" data-percent={Math.round(percent/5)*5}/>
  </div>
  {description&&<p className="ui-progress__description">{description}</p>}
 </div>
}
export interface CircularProgressProps{value?:number;size?:number;label?:string;tone?:ProgressTone;indeterminate?:boolean;children?:ReactNode;className?:string}
export function CircularProgress({value=0,size=64,label='میزان پیشرفت',tone='primary',indeterminate=false,children,className}:CircularProgressProps){
 const percent=clampPercent(value)
 const radius=(size-8)/2
 const circumference=2*Math.PI*radius
 return <div className={cx('ui-circular',`ui-circular--${tone}`,indeterminate&&'is-indeterminate',className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={indeterminate?undefined:Math.round(percent)} aria-label={label} data-size={size}>
  <svg viewBox={`0 0 ${size} ${size}`} focusable="false" aria-hidden="true">
   <circle className="ui-circular__track" cx={size/2} cy={size/2} r={radius} fill="none" strokeWidth="6"/>
   <circle className="ui-circular__value" cx={size/2} cy={size/2} r={radius} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={indeterminate?circumference*0.7:circumference*(1-percent/100)}/>
  </svg>
  <span className="ui-circular__content">{children??formatPercent(percent,{maximumFractionDigits:0})}</span>
 </div>
}
export interface StepProgressStep{id:string;label:ReactNode;description?:ReactNode}
export interface StepProgressProps{steps:readonly StepProgressStep[];activeIndex:number;completedLabel?:string;className?:string}
export function StepProgress({steps,activeIndex,completedLabel='تکمیل‌شده',className}:StepProgressProps){
 return <ol className={cx('ui-steps',className)} aria-label="مراحل">
  {steps.map((step,index)=>{
   const state=index<activeIndex?'done':index===activeIndex?'current':'todo'
   return <li key={step.id} className={cx('ui-steps__item',`is-${state}`)} aria-current={state==='current'?'step':undefined}>
    <span className="ui-steps__marker" aria-hidden="true">{formatNumber(index+1)}</span>
    <span className="ui-steps__body"><span className="ui-steps__label">{step.label}</span>{step.description&&<span className="ui-steps__description">{step.description}</span>}</span>
    {state==='done'&&<span className="visually-hidden">{completedLabel}</span>}
   </li>
  })}
 </ol>
}
export interface UploadProgressItem{id:string;name:string;progress:number;status:'PENDING'|'UPLOADING'|'COMPLETED'|'FAILED';sizeLabel?:string}
export function UploadProgressList({items,onRemove,className}:{items:readonly UploadProgressItem[];onRemove?(id:string):void;className?:string}){
 if(!items.length)return null
 return <ul className={cx('ui-upload-progress',className)}>
  {items.map((item)=><li key={item.id} className="ui-upload-progress__item">
   <div className="ui-upload-progress__meta"><span className="ui-upload-progress__name">{item.name}</span>{item.sizeLabel&&<span className="ui-upload-progress__size">{item.sizeLabel}</span>}</div>
   <LinearProgress value={item.progress} size="sm" showValue={false} indeterminate={item.status==='PENDING'} tone={item.status==='FAILED'?'danger':item.status==='COMPLETED'?'success':'primary'} label={<span className="visually-hidden">{item.name}</span>}/>
   {onRemove&&<button type="button" className="ui-upload-progress__remove" onClick={()=>onRemove(item.id)}>حذف<span className="visually-hidden"> {item.name}</span></button>}
  </li>)}
 </ul>
}
