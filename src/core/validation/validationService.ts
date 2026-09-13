import { ValidationError } from '../errors'

export interface FileValidationOptions { maxSize: number; allowedTypes: readonly string[] }
export type ValidationRule<T> = (value: T) => string | undefined

export const validate = <T>(value: T, rules: readonly ValidationRule<T>[]): void => {
  const errors = rules.flatMap((rule) => rule(value) ?? [])
  if (errors.length) throw new ValidationError('VALIDATION_ERROR', errors.join(' '), { errors })
}
export const validateRequired = (value: unknown, label = 'فیلد'): void => { if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) throw new ValidationError('REQUIRED', `${label} الزامی است.`) }
export const validateEmail = (value: string): void => { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new ValidationError('INVALID_EMAIL', 'ایمیل معتبر نیست.') }
export const validateLength = (value: string, min: number, max: number): void => { if (value.length < min || value.length > max) throw new ValidationError('INVALID_LENGTH', `طول متن باید بین ${min} و ${max} نویسه باشد.`) }
export const validateDate = (value: string): void => { if (Number.isNaN(Date.parse(value))) throw new ValidationError('INVALID_DATE', 'تاریخ معتبر نیست.') }
export const validateFile = (file: Pick<File, 'size' | 'type'>, options: FileValidationOptions): void => { if (file.size > options.maxSize) throw new ValidationError('FILE_TOO_LARGE', 'حجم فایل بیش از حد مجاز است.'); if (!options.allowedTypes.includes(file.type)) throw new ValidationError('FILE_TYPE_NOT_ALLOWED', 'نوع فایل مجاز نیست.') }

export const validationService = { validate, validateRequired, validateEmail, validateLength, validateDate, validateFile }
