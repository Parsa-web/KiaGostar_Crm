export interface ValidationResult {
  valid: boolean
  errors: readonly string[]
}

export type Validator<T> = (value: T) => string | undefined

export const validate = <T>(value: T, validators: readonly Validator<T>[]): ValidationResult => {
  const errors = validators.flatMap((validator) => {
    const error = validator(value)
    return error ? [error] : []
  })
  return { valid: errors.length === 0, errors }
}

export const required = (value: string): string | undefined =>
  value.trim() ? undefined : 'این فیلد الزامی است.'
