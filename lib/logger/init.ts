// Initialize logging system with all integrations

import { log } from './index'
import { initializeLogIntegrations } from './integrations'

// Initialize logging on app startup
export function initializeLogging(): void {
  // Log startup
  log.info('Application starting', {
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
    pid: process.pid,
  })

  // Initialize external integrations
  initializeLogIntegrations()

  // Log unhandled errors
  process.on('uncaughtException', (error: Error) => {
    log.error('Uncaught exception', {
      error,
      critical: true,
    })
    // Give time for logs to flush
    setTimeout(() => process.exit(1), 1000)
  })

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    log.error('Unhandled promise rejection', {
      error: reason,
      promise: promise.toString(),
      critical: true,
    })
  })

  // Log process signals
  process.on('SIGTERM', () => {
    log.info('SIGTERM received, starting graceful shutdown')
  })

  process.on('SIGINT', () => {
    log.info('SIGINT received, starting graceful shutdown')
  })

  // Log memory usage periodically in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const usage = process.memoryUsage()
      log.debug('Memory usage', {
        rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(usage.external / 1024 / 1024) + 'MB',
      })
    }, 60000) // Every minute
  }

  log.info('Logging system initialized')
}