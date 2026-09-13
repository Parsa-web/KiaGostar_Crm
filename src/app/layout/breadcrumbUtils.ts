import {findNavigationItem} from '../navigation/navigationConfig'
export interface BreadcrumbItem{label:string;path?:string}
export function getBreadcrumbs(path:string):BreadcrumbItem[]{const current=findNavigationItem(path);if(!current)return[];return current.path==='/dashboard'?[{label:current.label}]:[{label:'داشبورد',path:'/dashboard'},{label:current.label}]}
