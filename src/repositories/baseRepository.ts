import type { Identifier } from '../types/common'

export interface BaseRepository<TEntity extends { id: Identifier }> {
  findById(id: Identifier): Promise<TEntity | null>
  findAll(): Promise<readonly TEntity[]>
}
