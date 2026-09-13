export abstract class BaseService<TRepository> {
  protected readonly repository: TRepository
  protected constructor(repository: TRepository) { this.repository = repository }
}
