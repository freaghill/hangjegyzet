import * as Sentry from '@sentry/nextjs'
import { ProfilingIntegration } from '@sentry/profiling-node'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn: SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV,
  
  // Server-specific integrations
  integrations: [
    new ProfilingIntegration(),
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn'],
    }),
  ],
  
  // Filtering
  ignoreErrors: [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
  ],
  
  // Hooks
  beforeSend(event, hint) {
    // Don't send events in development unless it's an error
    if (process.env.NODE_ENV === 'development' && event.level !== 'error') {
      return null
    }
    
    // Add additional context
    if (event.exception) {
      const error = hint.originalException
      
      // Add custom error context
      if (error && typeof error === 'object') {
        if ('code' in error) event.tags = { ...event.tags, errorCode: String(error.code) }
        if ('statusCode' in error) event.tags = { ...event.tags, statusCode: String(error.statusCode) }
      }
    }
    
    return event
  },
  
  // Custom transport options
  transportOptions: {
    // Increase timeout for slow connections
    timeout: 10000,
  },
})