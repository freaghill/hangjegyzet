import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

// Custom event tracking
export interface CustomEvent {
  name: string
  properties?: Record<string, any>
}

// Track custom events
export function trackEvent(event: CustomEvent) {
  if (typeof window !== 'undefined' && window.va) {
    window.va('event', event.name, event.properties)
  }
}

// Business metrics events
export const BusinessEvents = {
  // User events
  USER_SIGNUP: 'user_signup',
  USER_LOGIN: 'user_login',
  USER_UPGRADED: 'user_upgraded',
  USER_CHURNED: 'user_churned',
  
  // Meeting events
  MEETING_CREATED: 'meeting_created',
  MEETING_UPLOADED: 'meeting_uploaded',
  MEETING_TRANSCRIBED: 'meeting_transcribed',
  MEETING_SHARED: 'meeting_shared',
  MEETING_EXPORTED: 'meeting_exported',
  
  // Team events
  TEAM_CREATED: 'team_created',
  TEAM_MEMBER_INVITED: 'team_member_invited',
  TEAM_MEMBER_JOINED: 'team_member_joined',
  
  // Payment events
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  
  // Feature usage
  FEATURE_USED: 'feature_used',
  INTEGRATION_CONNECTED: 'integration_connected',
  SEARCH_PERFORMED: 'search_performed',
  EXPORT_GENERATED: 'export_generated',
  AI_FEATURE_USED: 'ai_feature_used',
}

// Track business metrics
export function trackBusinessMetric(
  event: string,
  properties?: {
    value?: number
    currency?: string
    plan?: string
    feature?: string
    source?: string
    [key: string]: any
  }
) {
  trackEvent({
    name: event,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
  })
}

// Revenue tracking
export function trackRevenue(
  amount: number,
  currency: string = 'HUF',
  properties?: {
    plan?: string
    billing_period?: 'monthly' | 'yearly'
    payment_method?: string
    [key: string]: any
  }
) {
  trackBusinessMetric(BusinessEvents.PAYMENT_COMPLETED, {
    value: amount,
    currency,
    ...properties,
  })
}

// Feature usage tracking
export function trackFeatureUsage(
  feature: string,
  properties?: {
    duration?: number
    success?: boolean
    error?: string
    [key: string]: any
  }
) {
  trackBusinessMetric(BusinessEvents.FEATURE_USED, {
    feature,
    ...properties,
  })
}

// Page view tracking with custom properties
export function trackPageView(
  path: string,
  properties?: {
    referrer?: string
    search?: string
    user_type?: 'anonymous' | 'free' | 'paid'
    [key: string]: any
  }
) {
  if (typeof window !== 'undefined' && window.va) {
    window.va('pageview', {
      path,
      ...properties,
    })
  }
}

// Session tracking
export function trackSession(
  sessionId: string,
  properties?: {
    duration?: number
    page_views?: number
    events?: number
    [key: string]: any
  }
) {
  trackEvent({
    name: 'session_end',
    properties: {
      session_id: sessionId,
      ...properties,
    },
  })
}

// Conversion tracking
export function trackConversion(
  type: 'signup' | 'upgrade' | 'purchase' | 'custom',
  properties?: {
    value?: number
    from?: string
    to?: string
    [key: string]: any
  }
) {
  trackEvent({
    name: `conversion_${type}`,
    properties: {
      ...properties,
      conversion_time: new Date().toISOString(),
    },
  })
}

// A/B test tracking
export function trackExperiment(
  experimentId: string,
  variant: string,
  properties?: Record<string, any>
) {
  trackEvent({
    name: 'experiment_viewed',
    properties: {
      experiment_id: experimentId,
      variant,
      ...properties,
    },
  })
}

// Error tracking (complement to Sentry)
export function trackError(
  error: string,
  properties?: {
    severity?: 'low' | 'medium' | 'high' | 'critical'
    category?: string
    [key: string]: any
  }
) {
  trackEvent({
    name: 'error_occurred',
    properties: {
      error,
      ...properties,
    },
  })
}

// Performance tracking
export function trackPerformance(
  metric: string,
  value: number,
  properties?: {
    unit?: string
    category?: string
    [key: string]: any
  }
) {
  trackEvent({
    name: 'performance_metric',
    properties: {
      metric,
      value,
      ...properties,
    },
  })
}

// Analytics provider component
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Analytics 
        beforeSend={(event) => {
          // Add custom properties to all events
          return {
            ...event,
            properties: {
              ...event.properties,
              app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
              deployment_id: process.env.VERCEL_DEPLOYMENT_ID,
            }
          }
        }}
      />
      <SpeedInsights />
      {children}
    </>
  )
}

// Custom hooks for analytics
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function usePageTracking() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    trackPageView(pathname, {
      search: searchParams.toString(),
    })
  }, [pathname, searchParams])
}

export function useEventTracking() {
  return {
    track: trackEvent,
    trackBusiness: trackBusinessMetric,
    trackFeature: trackFeatureUsage,
    trackConversion,
    trackError,
  }
}

// Augment window type
declare global {
  interface Window {
    va?: (command: string, ...args: any[]) => void
  }
}