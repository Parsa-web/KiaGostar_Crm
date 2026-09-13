import { useAsyncResource } from '../../../hooks'
import type { Evaluation } from '../types'
export const usePerformance = (loader: () => Promise<readonly Evaluation[]>) => useAsyncResource(loader)
