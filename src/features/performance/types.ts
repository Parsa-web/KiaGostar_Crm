export type EvaluationStatus = 'DRAFT' | 'UNDER_REVIEW' | 'FINALIZED'
export interface EvaluationCriteria { name: string; score: number; weight: number; description: string }
export interface PerformanceRecord { id: string; employeeId: string; departmentId: string; evaluatedBy: string; period: string; score: number; status: EvaluationStatus; createdAt: string; finalizedAt?: string }
export interface Evaluation { id: string; employeeId: string; departmentId: string; managerId: string; period: string; criteria: readonly EvaluationCriteria[]; comment: string; score: number; status: EvaluationStatus; createdAt: string; finalizedAt?: string }
export interface Feedback { id: string; fromUser: string; toUser: string; relatedTo: string; message: string; createdAt: string }
export interface PerformanceSource { completedTasks: number; totalTasks: number; delayedTasks: number; submittedReports: number; approvedReports: number; completedWorkflows: number; totalWorkflows: number }
export interface PerformanceMetrics { taskScore: number; reportScore: number; completionRate: number; overallScore: number }
