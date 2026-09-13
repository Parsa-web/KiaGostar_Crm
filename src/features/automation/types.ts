import type {AuthorizedPrincipal} from '../../security'
export interface AutomationEvent{id:string;type:string;entityType:string;entityId:string;createdAt:string;data:Record<string,unknown>}
export type Condition={field:string;operator:'EQUALS'|'BEFORE'|'AFTER'|'IN'|'OVERDUE';value:unknown}
export type AutomationActionType='CREATE_NOTIFICATION'|'CREATE_REMINDER'|'INTERNAL_ALERT'|'UPDATE_METADATA'|'AUDIT'
export interface Action{type:AutomationActionType;payload:Record<string,unknown>}
export interface AutomationRule{id:string;name:string;trigger:string;conditions:Condition[];actions:Action[];enabled:boolean;createdBy:string}
export interface AutomationExecution{id:string;ruleId:string;eventId:string;status:'SUCCESS'|'FAILED';executedAt:string;error?:string}
export interface RuleRepository{list():Promise<readonly AutomationRule[]>;save(rule:AutomationRule):Promise<AutomationRule>}
export interface AutomationActionContext{actor:AuthorizedPrincipal;event:AutomationEvent;rule:AutomationRule}
export type AutomationActionHandler=(action:Action,context:AutomationActionContext)=>Promise<void>
