import {forwardRef,type HTMLAttributes,type ReactNode} from 'react';import {cx} from './utils'
export interface SurfaceProps extends HTMLAttributes<HTMLDivElement>{tone?:'base'|'elevated'|'selected'|'disabled'|'danger'|'success'|'warning'|'info';elevation?:0|1|2|3|4;children:ReactNode}
export const Surface=forwardRef<HTMLDivElement,SurfaceProps>(function Surface({tone='base',elevation=0,className,children,...props},ref){return <div ref={ref} className={cx('ui-surface',`ui-surface--${tone}`,`ui-elevation-${elevation}`,className)} {...props}>{children}</div>})
export const Paper=forwardRef<HTMLDivElement,SurfaceProps>(function Paper({className,elevation=1,...props},ref){return <Surface ref={ref} elevation={elevation} className={cx('ui-paper',className)} {...props}/>})
