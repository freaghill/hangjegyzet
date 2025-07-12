// Temporarily disable Sentry in development to avoid module resolution issues
if (process.env.NODE_ENV === 'production') {
  const Sentry = require('@sentry/nextjs')
  
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enabled: true,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  })
  
  exports.onRouterTransitionStart = Sentry.captureRouterTransitionStart
} else {
  // Mock for development
  exports.onRouterTransitionStart = () => {}
}