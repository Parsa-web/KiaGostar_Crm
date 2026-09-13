import { useCallback, useEffect, useState } from 'react'
import type { NotificationService } from '../services'
import type { Notification, NotificationFilters } from '../types'

export function useNotifications(service: NotificationService, userId: string, filters: NotificationFilters = {}) {
  const [items, setItems] = useState<readonly Notification[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string>()
  const refresh = useCallback(async () => { setLoading(true); setError(undefined); try { setItems(await service.getUserNotifications(userId, userId, filters)) } catch { setError('دریافت اعلان‌ها انجام نشد.') } finally { setLoading(false) } }, [service, userId, filters])
  useEffect(() => { const timer = window.setTimeout(() => { void refresh() }, 0); return () => window.clearTimeout(timer) }, [refresh])
  return { notifications: items, loading, error, refresh }
}
export const useUnreadNotifications = (service: NotificationService, userId: string) => useNotifications(service, userId, { unreadOnly: true })
