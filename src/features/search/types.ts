import type { AuthorizedPrincipal } from '../../security'
export type SearchResultType='MEETING'|'TASK'|'REPORT'|'REQUEST'|'FILE'|'USER'
export interface SearchResult { id:string;type:SearchResultType;title:string;description:string;createdAt:string;permissionAllowed:boolean;status?:string;userId?:string;departmentId?:string;participantIds?:string[];keywords?:string[] }
export interface SearchHistory { id:string;userId:string;query:string;createdAt:string }
export interface SearchFiltersValue { from?:string;to?:string;types?:readonly SearchResultType[];status?:string;userId?:string }
export interface SearchRepository { all():Promise<readonly SearchResult[]>;history(userId:string):Promise<readonly SearchHistory[]>;addHistory(item:SearchHistory):Promise<SearchHistory> }
export const canSearchResult=(actor:AuthorizedPrincipal,item:SearchResult)=>{if(!item.permissionAllowed)return false;if(actor.roles.includes('MAIN_MANAGER'))return true;if(actor.roles.includes('SECRETARY'))return ['MEETING','FILE'].includes(item.type)&&(item.participantIds?.includes(actor.userId)||item.userId===actor.userId||!item.userId);if(actor.roles.includes('DEPARTMENT_MANAGER'))return item.userId===actor.userId||Boolean(item.departmentId&&actor.departmentIds.includes(item.departmentId));return item.userId===actor.userId||Boolean(item.participantIds?.includes(actor.userId))}
