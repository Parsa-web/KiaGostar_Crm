import { ActivityTimeline, AuditLogList } from '../components'; import type { AuditLog } from '../types'
export const AuditPage = ({ logs }: { logs: readonly AuditLog[] }) => <section><h1>رویدادهای سامانه</h1><AuditLogList logs={logs} /></section>
export const EntityHistoryPage = ({ logs }: { logs: readonly AuditLog[] }) => <section><h1>تاریخچه</h1><ActivityTimeline logs={logs} /></section>
export const UserActivityPage = ({ logs }: { logs: readonly AuditLog[] }) => <section><h1>فعالیت کاربر</h1><AuditLogList logs={logs} /></section>
