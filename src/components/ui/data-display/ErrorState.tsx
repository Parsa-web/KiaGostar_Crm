import type {ReactNode} from 'react'
import type {IconName} from '../Icon'
import {Icon} from '../Icon'
import {Button} from '../Button'
import {cx} from '../utils'
export interface ErrorStateProps{icon?:IconName;title?:ReactNode;description?:ReactNode;onRetry?():void;retryLabel?:string;onSupport?():void;supportLabel?:string;compact?:boolean;className?:string}
export function ErrorState({icon='alert',title='نمایش اطلاعات ممکن نیست',description='ارتباط برقرار نشد یا اطلاعات در دسترس نیست. لطفاً دوباره تلاش کنید.',onRetry,retryLabel='تلاش دوباره',onSupport,supportLabel='ارتباط با پشتیبانی',compact=false,className}:ErrorStateProps){
 return <section className={cx('ui-error-state',compact&&'ui-error-state--compact',className)} role="alert" aria-live="assertive">
  <span className="ui-error-state__visual" aria-hidden="true"><Icon name={icon} size={compact?'md':'lg'}/></span>
  <div className="ui-error-state__copy">
   <h3 className="ui-error-state__title">{title}</h3>
   {description&&<p className="ui-error-state__description">{description}</p>}
  </div>
  {(onRetry||onSupport)&&<div className="ui-error-state__actions">
   {onRetry&&<Button variant="outline" size={compact?'sm':'md'} onClick={onRetry}>{retryLabel}</Button>}
   {onSupport&&<Button variant="ghost" size={compact?'sm':'md'} onClick={onSupport}>{supportLabel}</Button>}
  </div>}
 </section>
}
