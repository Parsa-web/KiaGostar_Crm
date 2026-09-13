import type {AuthorizedPrincipal} from '../../../security';import type {AssistantContext} from '../types'
export class ContextService{build(principal:AuthorizedPrincipal,input:Omit<AssistantContext,'principal'>):AssistantContext{return{principal,tasks:input.tasks.filter((task)=>task.id&&task.title),pendingActions:[...input.pendingActions],notifications:[...input.notifications]}}}
