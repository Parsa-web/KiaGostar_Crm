import type {ReactNode} from 'react'
import type {IconName} from '../Icon'
import {Icon} from '../Icon'
import {cx} from '../utils'
export type TagTone='neutral'|'primary'|'success'|'warning'|'danger'|'info'
export interface TagProps{children:ReactNode;tone?:TagTone;icon?:IconName;size?:'sm'|'md';removable?:boolean;onRemove?():void;removeLabel?:string;onSelect?():void;selected?:boolean;disabled?:boolean;className?:string}
export function Tag({children,tone='neutral',icon,size='md',removable=false,onRemove,removeLabel,onSelect,selected=false,disabled=false,className}:TagProps){
 const body=<>{icon&&<Icon name={icon} size="xs"/>}<span className="ui-tag__label">{children}</span></>
 const canRemove=removable||Boolean(onRemove)
 const classes=cx('ui-tag',`ui-tag--${tone}`,size==='sm'&&'ui-tag--sm',selected&&'is-selected',disabled&&'is-disabled',className)
 if(!onSelect&&!canRemove)return <span className={classes}>{body}</span>
 return <span className={classes}>
  {onSelect?<button type="button" className="ui-tag__select" aria-pressed={selected} disabled={disabled} onClick={onSelect}>{body}</button>:<span className="ui-tag__static">{body}</span>}
  {canRemove&&<button type="button" className="ui-tag__remove" disabled={disabled} onClick={onRemove} aria-label={removeLabel??'حذف برچسب'}><Icon name="error" size="xs"/></button>}
 </span>
}
export function TagList({children,wrap=true,className}:{children:ReactNode;wrap?:boolean;className?:string}){
 return <ul className={cx('ui-tag-list',wrap&&'ui-tag-list--wrap',className)}>{children}</ul>
}
export function TagListItem({children}:{children:ReactNode}){return <li className="ui-tag-list__item">{children}</li>}
