import type {AnchorHTMLAttributes,MouseEvent} from 'react'
import {useAppLocation} from './useAppLocation'
export function AppLink({href,onClick,...props}:AnchorHTMLAttributes<HTMLAnchorElement>&{href:string}){const {navigate}=useAppLocation();return <a href={href} onClick={(event:MouseEvent<HTMLAnchorElement>)=>{onClick?.(event);if(!event.defaultPrevented&&event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey){event.preventDefault();navigate(href)}}} {...props}/>}
