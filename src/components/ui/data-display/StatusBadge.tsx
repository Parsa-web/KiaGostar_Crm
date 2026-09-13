import type {ReactNode} from 'react'
import type {IconName} from '../Icon'
import {Icon} from '../Icon'
import {statusLabels} from '../../../app/presentation/labels'
import {cx} from '../utils'
export type StatusTone='success'|'warning'|'danger'|'info'|'neutral'
export interface StatusBadgeProps{status?:string;tone?:StatusTone;label?:ReactNode;icon?:IconName;size?:'sm'|'md';dot?:boolean;className?:string}
const statusTones:Readonly<Record<string,StatusTone>>={
 DRAFT:'neutral',PENDING:'warning',PENDING_APPROVAL:'warning',SUBMITTED:'info',SCHEDULED:'info',IN_PROGRESS:'info',UNDER_REVIEW:'warning',WAITING_REVIEW:'warning',
 APPROVED:'success',COMPLETED:'success',FINALIZED:'success',FINAL:'success',ACTIVE:'success',PRESENT:'success',CONFIRMED:'success',
 REJECTED:'danger',CANCELLED:'danger',OVERDUE:'danger',ABSENT:'danger',CRITICAL:'danger',
 REQUIRES_CORRECTION:'warning',ESCALATED:'warning',EXCUSED:'warning',INACTIVE:'neutral',INVITED:'neutral',
}
/* eslint-disable-next-line react-refresh/only-export-components */
export const toneForStatus=(status:string):StatusTone=>statusTones[status]??'neutral'
export function StatusBadge({status,tone,label,icon,size='md',dot=false,className}:StatusBadgeProps){
 const resolvedTone=tone??(status?toneForStatus(status):'neutral')
 const content=label??(status?statusLabels[status]??status:'')
 return <span className={cx('ui-status-badge',`ui-status-badge--${resolvedTone}`,size==='sm'&&'ui-status-badge--sm',className)} data-status={status}>
  {dot&&<span className="ui-status-badge__dot" aria-hidden="true"/>}
  {icon&&<Icon name={icon} size="xs"/>}
  <span>{content}</span>
 </span>
}
