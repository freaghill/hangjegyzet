import { Analytics } from '@vercel/analytics/react'
import posthog from 'posthog-js'

// Initialize PostHog
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') posthog.debug()
    },
    autocapture: false, // GDPR compliance - explicit tracking only
    capture_pageview: false, // We'll manually track with consent
    disable_session_recording: true, // GDPR compliance
  })
}

// Analytics event types
export type AnalyticsEvent = 
  | { name: 'page_view'; properties: { path: string; title?: string } }
  | { name: 'sign_up'; properties: { method: string; plan?: string } }
  | { name: 'sign_in'; properties: { method: string } }
  | { name: 'meeting_created'; properties: { mode: string; duration: number } }
  | { name: 'meeting_transcribed'; properties: { mode: string; duration: number; accuracy?: number } }
  | { name: 'meeting_exported'; properties: { format: string } }
  | { name: 'plan_selected'; properties: { plan: string; interval: 'monthly' | 'yearly' } }
  | { name: 'feature_used'; properties: { feature: string; context?: string } }
  | { name: 'error_occurred'; properties: { error: string; context?: string } }
  | { name: 'support_ticket_created'; properties: { priority: string; category?: string } }

class AnalyticsService {
  private hasConsent: boolean = false

  // Check for analytics consent from localStorage/cookies
  constructor() {
    if (typeof window !== 'undefined') {
      this.hasConsent = localStorage.getItem('analytics-consent') === 'true'
    }
  }

  // Set analytics consent
  setConsent(consent: boolean) {
    this.hasConsent = consent
    if (typeof window !== 'undefined') {
      localStorage.setItem('analytics-consent', consent.toString())
      
      if (consent) {
        // Start tracking if consent given
        posthog.opt_in_capturing()
      } else {
        // Stop tracking and clear data
        posthog.opt_out_capturing()
        posthog.reset()
      }
    }
  }

  // Track an event
  track(event: AnalyticsEvent) {
    if (!this.hasConsent) return

    const { name, properties } = event

    // Track in PostHog
    if (typeof window !== 'undefined' && posthog) {
      posthog.capture(name, properties)
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', name, properties)
    }
  }

  // Track page view
  pageView(path: string, title?: string) {
    this.track({
      name: 'page_view',
      properties: { path, title: title || document.title }
    })
  }

  // Identify user
  identify(userId: string, traits?: Record<string, any>) {
    if (!this.hasConsent) return

    if (typeof window !== 'undefined' && posthog) {
      posthog.identify(userId, traits)
    }
  }

  // Clear user identity
  reset() {
    if (typeof window !== 'undefined' && posthog) {
      posthog.reset()
    }
  }

  // Track timing metrics
  timing(category: string, variable: string, value: number) {
    this.track({
      name: 'feature_used',
      properties: {
        feature: 'timing',
        category,
        variable,
        value,
        context: `${category}_${variable}`
      }
    })
  }
}

// Export singleton instance
export const analytics = new AnalyticsService()

// Export Vercel Analytics component
export { Analytics as VercelAnalytics }

// Helper hook for React components
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function useAnalytics() {
  const pathname = usePathname()

  useEffect(() => {
    analytics.pageView(pathname)
  }, [pathname])

  return analytics
}