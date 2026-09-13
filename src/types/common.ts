export type Identifier = string
export type ISODateString = string

export interface Pagination {
  page: number
  limit: number
  total: number
  perPage?: number
  totalPages?: number
}

export type EntityStatus = 'ACTIVE' | 'INACTIVE'
