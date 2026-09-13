import { useAsyncResource } from '../../../hooks'
import type { DashboardData } from '../types'
export const useDashboard = (loader: () => Promise<DashboardData>) => useAsyncResource(loader)
