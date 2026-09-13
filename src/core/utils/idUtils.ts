export const generateId = () => crypto.randomUUID()
export const isValidId = (value: string) => /^[\w-]{8,}$/.test(value)
