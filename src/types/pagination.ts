import type { Pagination } from './common'
export interface PaginatedResult<T> { items: readonly T[]; pagination: Pagination }
export const paginate = <T>(items: readonly T[], page = 1, limit = 20): PaginatedResult<T> => ({ items: items.slice((Math.max(1, page) - 1) * limit, Math.max(1, page) * limit), pagination: { page: Math.max(1, page), limit, total: items.length } })
