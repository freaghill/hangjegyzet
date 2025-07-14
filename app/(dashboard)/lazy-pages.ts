import { lazyRoute } from '@/lib/utils/lazy-route'

// Lazy load heavy dashboard pages
export const LazyAnalyticsPage = lazyRoute(
  () => import('./analytics/page'),
  { ssr: false }
)

export const LazyTeamsPage = lazyRoute(
  () => import('./teams/page'),
  { ssr: true }
)

export const LazySettingsPage = lazyRoute(
  () => import('./dashboard/settings/page'),
  { ssr: true }
)

export const LazyBillingPage = lazyRoute(
  () => import('./billing/page'),
  { ssr: true }
)

export const LazyIntegrationsPage = lazyRoute(
  () => import('./integrations/page'),
  { ssr: true }
)

// Export route loaders for preloading
export const routeLoaders = {
  '/dashboard/analytics': () => import('./analytics/page'),
  '/dashboard/teams': () => import('./teams/page'),
  '/dashboard/settings': () => import('./dashboard/settings/page'),
  '/dashboard/billing': () => import('./billing/page'),
  '/dashboard/integrations': () => import('./integrations/page'),
}