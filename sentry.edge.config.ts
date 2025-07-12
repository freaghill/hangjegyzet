import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn: SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV,
  
  // Edge-specific configuration
  transportOptions: {
    // Reduce payload size for edge runtime
    maxValueLength: 250,
  },
  
  // Hooks
  beforeSend(event) {
    // Filter out non-errors in development
    if (process.env.NODE_ENV === 'development' && event.level !== 'error') {
      return null
    }
    
    return event
  },
})