import { ValidationError } from '../../../core/errors'
export type TransitionMap = Readonly<Record<string, readonly string[]>>
export const transitionMaps: Readonly<Record<string, TransitionMap>> = {
  TASK: { CREATED: ['ASSIGNED'], ASSIGNED: ['IN_PROGRESS'], IN_PROGRESS: ['WAITING_REVIEW'], WAITING_REVIEW: ['COMPLETED', 'IN_PROGRESS'], COMPLETED: [] },
  REPORT: { DRAFT: ['SUBMITTED'], SUBMITTED: ['UNDER_REVIEW'], UNDER_REVIEW: ['APPROVED', 'REJECTED'], REJECTED: ['DRAFT'], APPROVED: [] },
  REQUEST: { CREATED: ['UNDER_REVIEW'], UNDER_REVIEW: ['APPROVED', 'REJECTED', 'ESCALATED'], ESCALATED: ['APPROVED', 'REJECTED', 'COMPLETED'], APPROVED: ['COMPLETED'], REJECTED: [], COMPLETED: [] },
  MEETING: { DRAFT: ['SCHEDULED'], SCHEDULED: ['IN_PROGRESS', 'CANCELLED'], IN_PROGRESS: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [] },
}
export const canTransition = (entityType: string, from: string, to: string) => transitionMaps[entityType]?.[from]?.includes(to) ?? false
export const assertTransition = (entityType: string, from: string, to: string) => { if (!canTransition(entityType, from, to)) throw new ValidationError('INVALID_WORKFLOW_TRANSITION', `تغییر وضعیت از ${from} به ${to} مجاز نیست.`) }
