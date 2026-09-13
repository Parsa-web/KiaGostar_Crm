import type {KeyboardEvent,ReactNode} from 'react'
import type {IconName} from '../Icon'
import {Icon} from '../Icon'
import {CardSkeleton} from './LoadingState'
import {cx} from '../utils'
export interface DataCardProps{title:ReactNode;subtitle?:ReactNode;icon?:IconName;value?:ReactNode;description?:ReactNode;media?:ReactNode;footer?:ReactNode;actions?:ReactNode;badge?:ReactNode;loading?:boolean;selectable?:boolean;selected?:boolean;onSelect?():void;onActivate?():void;tone?:'default'|'primary'|'success'|'warning'|'danger'|'info';className?:string;children?:ReactNode}
export function DataCard({title,subtitle,icon,value,description,media,footer,actions,badge,loading=false,selectable=false,selected=false,onSelect,onActivate,tone='default',className,children}:DataCardProps){
 if(loading)return <CardSkeleton className={className}/>
 const interactive=Boolean(onActivate||(selectable&&onSelect))
 const activate=()=>{if(onActivate)onActivate();else if(selectable)onSelect?.()}
 const onKeyDown=(event:KeyboardEvent<HTMLElement>)=>{if(!interactive)return;if(event.key==='Enter'||event.key===' '){event.preventDefault();activate()}}
 return <article
  className={cx('ui-data-card',`ui-data-card--${tone}`,interactive&&'ui-data-card--interactive',selected&&'is-selected',className)}
  tabIndex={interactive?0:undefined}
  role={selectable?'button':undefined}
  aria-pressed={selectable?selected:undefined}
  onClick={interactive?activate:undefined}
  onKeyDown={interactive?onKeyDown:undefined}>
  <header className="ui-data-card__header">
   {icon&&<span className="ui-data-card__icon" aria-hidden="true"><Icon name={icon} size="md"/></span>}
   <div className="ui-data-card__titles">
    <h3 className="ui-data-card__title">{title}</h3>
    {subtitle&&<p className="ui-data-card__subtitle">{subtitle}</p>}
   </div>
   {badge&&<span className="ui-data-card__badge">{badge}</span>}
  </header>
  {media&&<div className="ui-data-card__media">{media}</div>}
  {value!==undefined&&<p className="ui-data-card__value">{value}</p>}
  {description&&<p className="ui-data-card__description">{description}</p>}
  {children&&<div className="ui-data-card__body">{children}</div>}
  {(footer||actions)&&<footer className="ui-data-card__footer">{footer&&<div className="ui-data-card__footer-content">{footer}</div>}{actions&&<div className="ui-data-card__actions">{actions}</div>}</footer>}
 </article>
}
export interface StatCardProps{label:ReactNode;value:ReactNode;icon?:IconName;description?:ReactNode;tone?:'default'|'primary'|'success'|'warning'|'danger'|'info';loading?:boolean;onActivate?():void;className?:string}
export function StatCard({label,value,icon,description,tone='default',loading=false,onActivate,className}:StatCardProps){
 if(loading)return <div className={cx('ui-stat-card ui-stat-card--loading',className)} role="status" aria-busy="true"><span className="visually-hidden">در حال بارگذاری آمار</span></div>
 const Element=onActivate?'button':'div'
 return <Element type={onActivate?'button':undefined} className={cx('ui-stat-card',`ui-stat-card--${tone}`,onActivate&&'ui-stat-card--interactive',className)} onClick={onActivate}>
  {icon&&<span className="ui-stat-card__icon" aria-hidden="true"><Icon name={icon} size="md"/></span>}
  <span className="ui-stat-card__copy">
   <span className="ui-stat-card__label">{label}</span>
   <strong className="ui-stat-card__value">{value}</strong>
   {description&&<span className="ui-stat-card__description">{description}</span>}
  </span>
 </Element>
}
