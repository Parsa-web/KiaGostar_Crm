import type { Notification } from '../types'
import { NotificationList } from '../components'
export const NotificationPage = ({ notifications }: { notifications: readonly Notification[] }) => <section><h1>اعلان‌ها</h1><NotificationList items={notifications} /></section>
