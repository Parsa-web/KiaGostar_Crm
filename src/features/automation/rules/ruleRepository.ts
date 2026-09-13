import type {AutomationRule,RuleRepository} from '../types'
export class InMemoryRuleRepository implements RuleRepository{private rules=new Map<string,AutomationRule>();async list(){return [...this.rules.values()].map((item)=>structuredClone(item))}async save(rule:AutomationRule){this.rules.set(rule.id,structuredClone(rule));return rule}}
