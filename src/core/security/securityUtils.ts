export const isSafeMimeType = (type: string, allowed: readonly string[]) => allowed.includes(type.toLowerCase())
export const hasSafeExtension = (name: string, allowed: readonly string[]) => allowed.some((extension) => name.toLowerCase().endsWith(`.${extension.toLowerCase()}`))
