import type {ReactNode} from 'react'
import type {IconName} from '../Icon'
import {Icon} from '../Icon'
import {cx} from '../utils'
export interface PropertyItem{key:string;label:ReactNode;value:ReactNode;icon?:IconName;multiline?:boolean;fullWidth?:boolean;hint?:ReactNode}
export interface PropertyListProps{items:readonly PropertyItem[];columns?:1|2|3;emptyValue?:ReactNode;className?:string}
export function PropertyList({items,columns=2,emptyValue='—',className}:PropertyListProps){
 return <dl className={cx('ui-property-list',`ui-property-list--${columns}`,className)}>
  {items.map((item)=><div key={item.key} className={cx('ui-property',item.multiline&&'ui-property--multiline',item.fullWidth&&'ui-property--full')}>
   <dt className="ui-property__label">{item.icon&&<Icon name={item.icon} size="xs"/>}<span>{item.label}</span></dt>
   <dd className="ui-property__value">{item.value===undefined||item.value===null||item.value===''?emptyValue:item.value}{item.hint&&<small className="ui-property__hint">{item.hint}</small>}</dd>
  </div>)}
 </dl>
}
export interface DescriptionListProps{items:readonly {key:string;term:ReactNode;description:ReactNode}[];layout?:'vertical'|'horizontal';compact?:boolean;className?:string}
export function DescriptionList({items,layout='vertical',compact=false,className}:DescriptionListProps){
 return <dl className={cx('ui-description-list',`ui-description-list--${layout}`,compact&&'ui-description-list--compact',className)}>
  {items.map((item)=><div key={item.key} className="ui-description-list__row">
   <dt>{item.term}</dt>
   <dd>{item.description}</dd>
  </div>)}
 </dl>
}
export function PropertyGroup({title,children,className}:{title?:ReactNode;children:ReactNode;className?:string}){
 return <section className={cx('ui-property-group',className)}>{title&&<h3 className="ui-property-group__title">{title}</h3>}{children}</section>
}
