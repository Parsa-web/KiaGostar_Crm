import type { ReactNode } from 'react'
import { AuthProvider } from '../features/auth'
import { services } from './dependencies'

export const AppProvider = ({ children }: { children: ReactNode }) => (
  <AuthProvider service={services.auth}>{children}</AuthProvider>
)
