export interface DashboardSummary { title: string; description?: string; generatedAt: string }
export interface DashboardMetric { title: string; value: number; trend?: number; status: 'UP' | 'DOWN' | 'STABLE' }
export interface DashboardChart { id: string; title: string; type: 'LINE' | 'BAR' | 'PIE' | 'PROGRESS'; data: readonly { label: string; value: number }[] }
export interface DashboardActivity { id: string; title: string; date: string }
export interface DashboardAlert { id: string; title: string; message: string; type: 'DELAYED_TASK' | 'PENDING_APPROVAL' | 'UPCOMING_MEETING' | 'REQUIRED_ACTION'; entityId?: string }
export interface DashboardData { summary: DashboardSummary; charts: readonly DashboardChart[]; metrics: readonly DashboardMetric[]; recentActivities: readonly DashboardActivity[]; alerts: readonly DashboardAlert[] }
export interface DashboardFilters { from?: string; to?: string; departmentId?: string; status?: 'COMPLETED' | 'PENDING' | 'DELAYED' }
export interface AnalyticsRecord { id: string; kind: 'TASK' | 'MEETING' | 'REPORT' | 'EMPLOYEE' | 'DEPARTMENT' | 'FILE'; status: string; departmentId?: string; ownerId?: string; deadline?: string; createdAt: string }
