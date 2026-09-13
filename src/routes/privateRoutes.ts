import type { RouteConfig } from './routeConfig'

export const privateRoutes: readonly RouteConfig[] = [
  { path: '/', access: 'authenticated' },
  { path: '/organization', access: 'capability', capability: 'organization.view' },
  { path: '/meetings', access: 'capability', capability: 'meeting.view' },
  { path: '/resolutions', access: 'capability', capability: 'decision.view' },
  { path: '/tasks', access: 'scope', capability: 'task.view' },
  { path: '/reports', access: 'capability', capability: 'report.view' },
  { path: '/requests', access: 'capability', capability: 'request.view' },
  { path: '/notifications', access: 'capability', capability: 'notification.view' },
  { path: '/files', access: 'capability', capability: 'file.manage' },
  { path: '/audit', access: 'capability', capability: 'audit.view' },
  { path: '/calendar', access: 'capability', capability: 'meeting.view' },
  { path: '/performance', access: 'authenticated' },
  { path: '/dashboard', access: 'authenticated' },
  { path: '/settings', access: 'authenticated' },
  { path: '/search', access: 'authenticated' },
]
