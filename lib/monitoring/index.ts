import * as Sentry from '@sentry/nextjs'

/**
 * Track a business metric in Sentry
 */
export function trackMetric(name: string, value: number, tags?: Record<string, string>) {
  Sentry.metrics.gauge(name, value, {
    tags,
  })
}

/**
 * Track user actions
 */
export function trackUserAction(action: string, metadata?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    category: 'user-action',
    message: action,
    level: 'info',
    data: metadata,
  })
}

/**
 * Track API performance
 */
export async function trackAPICall<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const result = await fn()
    
    trackMetric('api.duration', Date.now() - startTime, {
      operation,
      status: 'success',
    })
    
    return result
  } catch (error) {
    trackMetric('api.duration', Date.now() - startTime, {
      operation,
      status: 'error',
    })
    
    Sentry.captureException(error, {
      tags: {
        operation,
      },
    })
    
    throw error
  }
}

/**
 * Track transcription jobs
 */
export function trackTranscriptionJob(
  meetingId: string,
  status: 'started' | 'completed' | 'failed',
  metadata?: {
    duration?: number
    fileSize?: number
    processingTime?: number
    error?: string
  }
) {
  const event = `transcription.${status}`
  
  Sentry.addBreadcrumb({
    category: 'transcription',
    message: event,
    level: status === 'failed' ? 'error' : 'info',
    data: {
      meetingId,
      ...metadata,
    },
  })
  
  if (status === 'completed' && metadata?.processingTime) {
    trackMetric('transcription.processing_time', metadata.processingTime, {
      status: 'success',
    })
  }
  
  if (status === 'failed') {
    Sentry.captureMessage(`Transcription failed for meeting ${meetingId}`, {
      level: 'error',
      tags: {
        meetingId,
      },
      extra: metadata,
    })
  }
}

/**
 * Track payment events
 */
export function trackPaymentEvent(
  type: 'subscription' | 'invoice' | 'payment',
  status: 'success' | 'failed',
  metadata?: Record<string, unknown>
) {
  const event = `payment.${type}.${status}`
  
  Sentry.addBreadcrumb({
    category: 'payment',
    message: event,
    level: status === 'failed' ? 'error' : 'info',
    data: metadata,
  })
  
  if (status === 'failed') {
    Sentry.captureMessage(`Payment ${type} failed`, {
      level: 'error',
      extra: metadata,
    })
  }
}

/**
 * Create a monitored function wrapper
 */
export function monitored<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: {
    name: string
    category?: string
  }
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now()
    
    try {
      const result = await fn(...args)
      
      trackMetric(`function.duration`, Date.now() - startTime, {
        function: options.name,
        category: options.category || 'general',
        status: 'success',
      })
      
      return result
    } catch (error) {
      trackMetric(`function.duration`, Date.now() - startTime, {
        function: options.name,
        category: options.category || 'general',
        status: 'error',
      })
      
      Sentry.captureException(error, {
        tags: {
          function: options.name,
          category: options.category || 'general',
        },
      })
      
      throw error
    }
  }) as T
}