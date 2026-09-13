import type { RequestInterceptor, ResponseInterceptor } from './types'
export const bearerTokenInterceptor = (getToken: () => string | null): RequestInterceptor => (headers) => { const token = getToken(); return token ? { ...headers, Authorization: `Bearer ${token}` } : headers }
export const securityResponseInterceptor = (onUnauthorized?: () => void): ResponseInterceptor => (response) => { if (response.status === 401) onUnauthorized?.(); return response }
