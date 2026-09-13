import { ApiError, apiErrorHandler } from './errors'
import type { ApiResponse, RequestInterceptor, RequestOptions, ResponseInterceptor } from './types'

export class ApiClient {
  private readonly requestInterceptors: RequestInterceptor[] = []
  private readonly responseInterceptors: ResponseInterceptor[] = []
  constructor(private readonly baseUrl: string = import.meta.env.VITE_API_URL ?? '') {}
  useRequest(interceptor: RequestInterceptor) { this.requestInterceptors.push(interceptor); return this }
  useResponse(interceptor: ResponseInterceptor) { this.responseInterceptors.push(interceptor); return this }
  get<T>(path: string, options?: RequestOptions) { return this.request<T>('GET', path, undefined, options) }
  post<T, B = unknown>(path: string, body?: B, options?: RequestOptions) { return this.request<T>('POST', path, body, options) }
  put<T, B = unknown>(path: string, body?: B, options?: RequestOptions) { return this.request<T>('PUT', path, body, options) }
  patch<T, B = unknown>(path: string, body?: B, options?: RequestOptions) { return this.request<T>('PATCH', path, body, options) }
  delete<T>(path: string, options?: RequestOptions) { return this.request<T>('DELETE', path, undefined, options) }
  private async request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<ApiResponse<T>> { try { let headers: Record<string, string> = { Accept: 'application/json', ...options.headers }; if (body !== undefined) headers['Content-Type'] = 'application/json'; for (const interceptor of this.requestInterceptors) headers = await interceptor(headers); const query = new URLSearchParams(Object.entries(options.query ?? {}).filter((entry) => entry[1] !== undefined).map(([key, value]) => [key, String(value)])); const responseUrl = `${this.baseUrl}${path}${query.size ? `?${query}` : ''}`; let response = await fetch(responseUrl, { method, headers, signal: options.signal, body: body === undefined ? undefined : JSON.stringify(body) }); for (const interceptor of this.responseInterceptors) response = await interceptor(response); const payload = response.status === 204 ? null : await response.json().catch(() => null); if (!response.ok) throw new ApiError({ status: response.status, code: payload?.code ?? `HTTP_${response.status}`, message: payload?.message ?? 'خطای سرویس', details: payload?.details }); return { data: payload as T, status: response.status, headers: Object.fromEntries(response.headers.entries()) } } catch (error) { throw apiErrorHandler(error) } }
}
export const apiClient = new ApiClient()
