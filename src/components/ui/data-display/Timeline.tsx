import {useState,type ReactNode} from 'react'
import type {IconName} from '../Icon'
import {Avatar,type AvatarSize} from '../Avatar'
import {Icon} from '../Icon'
import {formatPersianDate,formatRelativeTime} from '../../../core/utils'
import {EmptyState} from './EmptyState'
import {TimelineSkeleton} from './LoadingState'
import {cx} from '../utils'
export interface TimelineItemData{
 id:string;timestamp:string;actor?:{name:string;avatar?:string};icon?:IconName;
 iconTone?:'neutral'|'primary'|'success'|'warning'|'danger'|'info';title:ReactNode;description?:ReactNode;
 metadata?:ReactNode;expandedContent?:ReactNode;badge?:ReactNode;attachmentsCount?:number;typeLabel?:string
}
export interface TimelineProps{
 items:readonly TimelineItemData[];variant?:'default'|'compact'|'detailed';showRelativeTime?:boolean;
 avatarSize?:AvatarSize;loading?:boolean;emptyState?:ReactNode;emptyTitle?:string;className?:string
}
/** Chronological event list with avatars, status icons, attachment indicators and expandable details. */
export function Timeline({items,variant='default',showRelativeTime=true,avatarSize='sm',loading=false,emptyState,emptyTitle='رویدادی ثبت نشده است',className}:TimelineProps){
 if(loading)return <TimelineSkeleton className={className}/>
 if(!items.length)return <>{emptyState??<EmptyState variant="inline" title={emptyTitle}/>}</>
 return <ol className={cx('ui-timeline',`ui-timeline--${variant}`,className)}>
  {items.map((item,index)=><TimelineItem key={item.id} item={item} variant={variant} showRelativeTime={showRelativeTime} avatarSize={avatarSize} isLast={index===items.length-1}/>)}
 </ol>
}
function TimelineItem({item,variant,showRelativeTime,avatarSize,isLast}:{item:TimelineItemData;variant:'default'|'compact'|'detailed';showRelativeTime:boolean;avatarSize:AvatarSize;isLast:boolean}){
 const [expanded,setExpanded]=useState(variant==='detailed')
 const hasDetails=Boolean(item.expandedContent)
 return <li className={cx('ui-timeline-item',isLast&&'ui-timeline-item--last')}>
  <span className={cx('ui-timeline-item__marker',item.iconTone&&`ui-timeline-item__marker--${item.iconTone}`)} aria-hidden="true">
   {item.actor?<Avatar src={item.actor.avatar} alt={item.actor.name} name={item.actor.name} size={avatarSize}/>:item.icon?<Icon name={item.icon} size="sm"/>:<span className="ui-timeline-item__dot"/>}
  </span>
  <div className="ui-timeline-item__content">
   <div className="ui-timeline-item__header">
    <h4 className="ui-timeline-item__title">{item.title}</h4>
    {item.typeLabel&&<span className="ui-timeline-item__type">{item.typeLabel}</span>}
    {item.badge&&<span className="ui-timeline-item__badge">{item.badge}</span>}
   </div>
   {item.actor&&<p className="ui-timeline-item__actor">{item.actor.name}</p>}
   {item.description&&<p className="ui-timeline-item__description">{item.description}</p>}
   {item.metadata&&<div className="ui-timeline-item__metadata">{item.metadata}</div>}
   <div className="ui-timeline-item__footer">
    <time className="ui-timeline-item__time" dateTime={item.timestamp} title={formatPersianDate(item.timestamp)}>
     {showRelativeTime?formatRelativeTime(item.timestamp):formatPersianDate(item.timestamp)}
    </time>
    {Boolean(item.attachmentsCount)&&<span className="ui-timeline-item__attachments">
     <Icon name="folder" size="xs" aria-hidden="true"/>
     <span>{item.attachmentsCount} پیوست</span>
    </span>}
    {hasDetails&&<button
     type="button" className="ui-timeline-item__toggle" aria-expanded={expanded}
     onClick={()=>setExpanded((current)=>!current)}>{expanded?'بستن جزئیات':'نمایش جزئیات'}</button>}
   </div>
   {hasDetails&&expanded&&<div className="ui-timeline-item__expanded">{item.expandedContent}</div>}
  </div>
 </li>
}
export interface ActivityItemData{id:string;timestamp:string;actor:{id:string;name:string;avatar?:string};action:ReactNode;target?:ReactNode;metadata?:ReactNode;icon?:IconName;tone?:'neutral'|'primary'|'success'|'warning'|'danger'}
export interface ActivityFeedProps{
 items:readonly ActivityItemData[];compact?:boolean;showAvatars?:boolean;loading?:boolean;
 emptyState?:ReactNode;emptyTitle?:string;className?:string
}
/** Actor → action → target feed with its own loading and empty states. No event type is hardcoded. */
export function ActivityFeed({items,compact=false,showAvatars=true,loading=false,emptyState,emptyTitle='فعالیتی ثبت نشده است',className}:ActivityFeedProps){
 if(loading)return <TimelineSkeleton className={className}/>
 if(!items.length)return <>{emptyState??<EmptyState variant="inline" title={emptyTitle}/>}</>
 return <ul className={cx('ui-activity-feed',compact&&'ui-activity-feed--compact',className)}>
  {items.map((item)=><li key={item.id} className="ui-activity-item">
   {showAvatars&&<Avatar src={item.actor.avatar} alt={item.actor.name} name={item.actor.name} size={compact?'xs':'sm'} className="ui-activity-item__avatar"/>}
   <div className="ui-activity-item__content">
    <p className="ui-activity-item__text">
     <strong className="ui-activity-item__actor">{item.actor.name}</strong>
     {' '}{item.action}
     {item.target&&<>{' '}<span className="ui-activity-item__target">{item.target}</span></>}
    </p>
    {item.metadata&&<div className="ui-activity-item__metadata">{item.metadata}</div>}
    <time className="ui-activity-item__time" dateTime={item.timestamp}>{formatRelativeTime(item.timestamp)}</time>
   </div>
   {item.icon&&<Icon name={item.icon} size="xs" className={cx('ui-activity-item__icon',item.tone&&`ui-activity-item__icon--${item.tone}`)}/>}
  </li>)}
 </ul>
}
