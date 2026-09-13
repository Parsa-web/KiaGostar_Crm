import type {AutomationRule} from '../types'
const forbidden=new Set(['APPROVE','CHANGE_PERMISSION','CREATE_TASK','CHANGE_OWNER','COMPLETE_TASK'])
export const ruleValidator={validate(rule:AutomationRule){if(!rule.name.trim()||!rule.trigger.trim())throw new Error('INVALID_AUTOMATION_RULE');for(const action of rule.actions)if(forbidden.has(action.type)||forbidden.has(String(action.payload.operation??'')))throw new Error('UNSAFE_AUTOMATION_ACTION');return true}}
