const readEnv = (key: string, fallback: string): string =>
  (import.meta.env[key] as string | undefined)?.trim() || fallback

export type EnvironmentName = 'development' | 'test' | 'production'

export const environment = Object.freeze({
  APP_NAME: readEnv('VITE_APP_NAME', 'سامانه مدیریت کیا گستر'),
  API_URL: readEnv('VITE_API_URL', '/api'),
  ENVIRONMENT: readEnv('VITE_ENVIRONMENT', import.meta.env.MODE) as EnvironmentName,
  FEATURE_FLAGS: Object.freeze({
    authentication: readEnv('VITE_FEATURE_AUTHENTICATION', 'true') === 'true',
  }),
})
