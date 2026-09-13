import { memo, type ReactNode } from 'react'
import { formatPersianDate } from '../../../core/utils'
import type { Notification } from '../types'

export const NotificationBell = memo(({ unreadCount, onClick }: { unreadCount: number; onClick(): void }) => <button type="button" className="notification-bell" aria-label={`اعلان‌ها، ${unreadCount} خوانده‌نشده`} onClick={onClick}>🔔{unreadCount > 0 && <span>{unreadCount}</span>}</button>)
export const NotificationCard = memo(({ item, onRead }: { item: Notification; onRead?(id: string): void }) => <article className={`card notification-card ${item.isRead ? '' : 'is-unread'}`}><header><strong>{item.title}</strong><span className={`badge badge--${item.priority.toLowerCase()}`}>{item.priority}</span></header><p>{item.message}</p><small>{item.category} · {formatPersianDate(item.createdAt)}</small>{!item.isRead && onRead && <button type="button" onClick={() => onRead(item.id)}>خواندم</button>}</article>)
export function NotificationList({ items, onRead, empty = <p className="state-message">اعلانی وجود ندارد.</p> }: { items: readonly Notification[]; onRead?(id: string): void; empty?: ReactNode }) { return items.length ? <div className="stack" aria-live="polite">{items.map((item) => <NotificationCard key={item.id} item={item} onRead={onRead} />)}</div> : empty }
export const NotificationDropdown = ({ items, onRead }: { items: readonly Notification[]; onRead?(id: string): void }) => <aside className="popover" aria-label="آخرین اعلان‌ها"><NotificationList items={items.slice(0, 5)} onRead={onRead} /></aside>
