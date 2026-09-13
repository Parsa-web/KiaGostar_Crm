import type {ReactNode} from 'react'
import type {IconName} from '../Icon'
import {Icon} from '../Icon'
import {cx} from '../utils'
export type EmptyStateVariant='default'|'search'|'filter'|'error'|'create'|'inline'
export interface EmptyStateProps{icon?:IconName;illustration?:ReactNode;title?:ReactNode;description?:ReactNode;primaryAction?:ReactNode;secondaryAction?:ReactNode;variant?:EmptyStateVariant;compact?:boolean;className?:string}
const variantIcon:Readonly<Record<EmptyStateVariant,IconName>>={default:'folder',search:'search',filter:'search',error:'alert',create:'plus',inline:'folder'}
export function EmptyState({icon,illustration,title='موردی برای نمایش وجود ندارد',description,primaryAction,secondaryAction,variant='default',compact=false,className}:EmptyStateProps){
 return <section className={cx('ui-empty',`ui-empty--${variant}`,compact&&'ui-empty--compact',className)}>
  <span className="ui-empty__visual" aria-hidden="true">{illustration??<Icon name={icon??variantIcon[variant]} size={compact?'lg':'xl'}/>}</span>
  <div className="ui-empty__copy">
   <h3 className="ui-empty__title">{title}</h3>
   {description&&<p className="ui-empty__description">{description}</p>}
  </div>
  {(primaryAction||secondaryAction)&&<div className="ui-empty__actions">{primaryAction}{secondaryAction}</div>}
 </section>
}
