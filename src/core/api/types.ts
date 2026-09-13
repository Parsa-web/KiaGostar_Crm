export interface ApiResponse<T> { data: T; status: number; headers: Readonly<Record<string, string>> }
export interface ApiErrorPayload { code: string; message: string; status: number; details?: unknown }
export interface ApiState<T> { data: T | null; loading: boolean; error: string | null }
export type RequestOptions = { headers?: Record<string, string>; signal?: AbortSignal; query?: Record<string, string | number | boolean | undefined> }
export type RequestInterceptor = (headers: Record<string, string>) => Record<string, string> | Promise<Record<string, string>>
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>
