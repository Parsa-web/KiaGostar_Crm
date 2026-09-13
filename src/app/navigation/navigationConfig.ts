import type { IconName } from '../../components/ui/Icon'
import type { RoleCode } from '../../domain/enums'
import type { AuthorizedPrincipal } from '../../security'
import { can } from '../../security'
import { appLabels } from '../presentation/labels'

export interface NavigationItem {
  id: string
  label: string
  path: string
  icon: IconName
  capabilities?: readonly string[]
  roles?: readonly RoleCode[]
  match?: 'exact' | 'prefix'
}
export interface NavigationGroup { id: string; label?: string; items: readonly NavigationItem[] }

export const navigationGroups: readonly NavigationGroup[] = [
  { id: 'overview', items: [
    { id: 'dashboard', label: appLabels.dashboard, path: '/dashboard', icon: 'dashboard', match: 'exact' },
    { id: 'calendar', label: 'تقویم', path: '/calendar', icon: 'calendar', capabilities: ['meeting.view'] },
  ] },
  { id: 'work', label: 'فضای کاری', items: [
    { id: 'meetings', label: appLabels.meetings, path: '/meetings', icon: 'calendar', capabilities: ['meeting.view'] },
    { id: 'resolutions', label: 'مصوبات', path: '/resolutions', icon: 'check-square', capabilities: ['decision.view'], roles: ['SECRETARY'] },
    { id: 'tasks', label: appLabels.tasks, path: '/tasks', icon: 'check-square', capabilities: ['task.view', 'task.view.self'] },
    { id: 'reports', label: appLabels.reports, path: '/reports', icon: 'report', capabilities: ['report.view', 'report.create'] },
    { id: 'requests', label: appLabels.requests, path: '/requests', icon: 'request', capabilities: ['request.view'] },
  ] },
  { id: 'management', label: 'مدیریت', items: [
    { id: 'organization', label: appLabels.organization, path: '/organization', icon: 'building', capabilities: ['organization.view'] },
    { id: 'performance', label: appLabels.performance, path: '/performance', icon: 'chart', capabilities: ['performance.organization', 'performance.department', 'performance.self'] },
    { id: 'audit', label: appLabels.audit, path: '/audit', icon: 'shield', capabilities: ['audit.view'] },
  ] },
  { id: 'system', label: 'سامانه', items: [
    { id: 'notifications', label: appLabels.notifications, path: '/notifications', icon: 'bell', capabilities: ['notification.view'] },
    { id: 'files', label: appLabels.files, path: '/files', icon: 'folder', capabilities: ['file.manage'] },
    { id: 'settings', label: appLabels.settings, path: '/settings', icon: 'settings', match: 'exact' },
  ] },
]

export const filterNavigation = (principal: AuthorizedPrincipal) => navigationGroups
  .map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      (!item.roles?.length || item.roles.some((role) => principal.roles.includes(role)))
      && (!item.capabilities?.length || item.capabilities.some((capability) => can(principal, capability))),
    ),
  }))
  .filter((group) => group.items.length > 0)

export const findNavigationItem = (path: string) => navigationGroups.flatMap((group) => group.items)
  .find((item) => item.match === 'exact' ? item.path === path : path === item.path || path.startsWith(`${item.path}/`))
export const isNavigationItemActive = (item: NavigationItem, path: string) => item.match === 'exact' ? item.path === path : path === item.path || path.startsWith(`${item.path}/`)
export const routeTitles: Readonly<Record<string, string>> = Object.fromEntries(navigationGroups.flatMap((group) => group.items).map((item) => [item.path, item.label]))
