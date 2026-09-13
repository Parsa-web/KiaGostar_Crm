import type {ReactNode} from 'react'
export const fieldMessageIds=(id:string,{error,success,warning,hint}:{error?:ReactNode;success?:ReactNode;warning?:ReactNode;hint?:ReactNode})=>error?`${id}-error`:success?`${id}-success`:warning?`${id}-warning`:hint?`${id}-hint`:undefined
