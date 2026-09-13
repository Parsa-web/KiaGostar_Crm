import type {AuthorizedPrincipal} from '../../security'
export interface Suggestion{id:string;type:'TASK'|'REPORT'|'MEETING'|'WORKFLOW';message:string;priority:'LOW'|'MEDIUM'|'HIGH'}
export interface AssistantContext{principal:AuthorizedPrincipal;tasks:readonly {id:string;title:string;deadline?:string;status:string}[];pendingActions:readonly string[];notifications:readonly {id:string;message:string}[]}
