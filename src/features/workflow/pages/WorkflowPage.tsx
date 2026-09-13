import { WorkflowTimeline } from '../components'; import type { WorkflowHistoryRecord, WorkflowInstance } from '../types'
export const WorkflowPage = ({ workflow, history }: { workflow: WorkflowInstance; history: readonly WorkflowHistoryRecord[] }) => <main><h1>گردش‌کار</h1><WorkflowTimeline workflow={workflow} history={history} /></main>
