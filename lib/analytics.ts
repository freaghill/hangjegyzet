// Analytics wrapper for multiple providers

interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
}

class Analytics {
  private initialized = false

  init() {
    if (this.initialized) return
    this.initialized = true

    // Initialize Vercel Analytics (already imported in layout)
    if (typeof window !== 'undefined') {
      console.log('Analytics initialized')
    }

    // Initialize Posthog
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY && typeof window !== 'undefined') {
      // Posthog will be initialized if needed
    }
  }

  track(event: string, properties?: Record<string, any>) {
    if (!this.initialized) {
      console.warn('Analytics not initialized')
      return
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event, properties)
    }

    // Send to analytics providers
    try {
      // Vercel Analytics
      if (typeof window !== 'undefined' && (window as any).va) {
        (window as any).va('track', event, properties)
      }

      // Posthog
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture(event, properties)
      }
    } catch (error) {
      console.error('Analytics error:', error)
    }
  }

  identify(userId: string, traits?: Record<string, any>) {
    if (!this.initialized) return

    try {
      // Posthog identify
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.identify(userId, traits)
      }
    } catch (error) {
      console.error('Analytics identify error:', error)
    }
  }

  page(name?: string, properties?: Record<string, any>) {
    if (!this.initialized) return

    try {
      // Track page view
      this.track('page_viewed', {
        page_name: name,
        ...properties
      })
    } catch (error) {
      console.error('Analytics page error:', error)
    }
  }
}

export const analytics = new Analytics()