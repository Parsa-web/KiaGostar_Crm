import type { Notification } from '../types'
export interface NotificationState { items: readonly Notification[]; loading: boolean; error?: string }
export const createNotificationStore = () => { let state: NotificationState = { items: [], loading: false }; const listeners = new Set<() => void>(); return { getSnapshot: () => state, subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener) }, set: (next: NotificationState) => { state = next; listeners.forEach((listener) => listener()) } } }
