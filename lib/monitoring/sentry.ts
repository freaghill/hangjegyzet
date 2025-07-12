import * as Sentry from '@sentry/nextjs'

export interface ErrorContext {
  userId?: string
  organizationId?: string
  meetingId?: string
  action?: string
  metadata?: Record<string, any>
}

/**
 * Capture an exception with additional context
 */
export function captureException(error: Error, context?: ErrorContext) {
  Sentry.withScope((scope) => {
    // Add user context
    if (context?.userId) {
      scope.setUser({ id: context.userId })
    }
    
    // Add tags
    if (context?.organizationId) {
      scope.setTag('organization_id', context.organizationId)
    }
    if (context?.meetingId) {
      scope.setTag('meeting_id', context.meetingId)
    }
    if (context?.action) {
      scope.setTag('action', context.action)
    }
    
    // Add extra context
    if (context?.metadata) {
      scope.setContext('metadata', context.metadata)
    }
    
    // Set error level based on error type
    if (error.name === 'ValidationError') {
      scope.setLevel('warning')
    } else if (error.message?.includes('rate limit')) {
      scope.setLevel('warning')
    } else {
      scope.setLevel('error')
    }
    
    Sentry.captureException(error)
  })
}

/**
 * Capture a message with context
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: ErrorContext) {
  Sentry.withScope((scope) => {
    // Add context same as captureException
    if (context?.userId) scope.setUser({ id: context.userId })
    if (context?.organizationId) scope.setTag('organization_id', context.organizationId)
    if (context?.meetingId) scope.setTag('meeting_id', context.meetingId)
    if (context?.action) scope.setTag('action', context.action)
    if (context?.metadata) scope.setContext('metadata', context.metadata)
    
    scope.setLevel(level)
    Sentry.captureMessage(message)
  })
}

/**
 * Track performance of operations
 */
export function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  const transaction = Sentry.startTransaction({
    op: operation,
    name: operation,
  })
  
  Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction))
  
  // Add context to transaction
  if (context?.userId) transaction.setTag('user_id', context.userId)
  if (context?.organizationId) transaction.setTag('organization_id', context.organizationId)
  
  return fn()
    .then(result => {
      transaction.setStatus('ok')
      return result
    })
    .catch(error => {
      transaction.setStatus('internal_error')
      captureException(error, context)
      throw error
    })
    .finally(() => {
      transaction.finish()
    })
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Set user context for all subsequent errors
 */
export function setUserContext(user: { id: string; email?: string; organizationId?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    organization_id: user.organizationId,
  })
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null)
}

/**
 * Monitor API endpoint performance
 */
export function monitorApiEndpoint(endpoint: string, method: string, statusCode: number, duration: number) {
  // Send custom metric to Sentry
  Sentry.metrics.distribution('api.request.duration', duration, {
    tags: {
      endpoint,
      method,
      status_code: statusCode.toString(),
      status_category: statusCode < 400 ? 'success' : statusCode < 500 ? 'client_error' : 'server_error',
    },
    unit: 'millisecond',
  })
  
  // Track error rate
  if (statusCode >= 400) {
    Sentry.metrics.increment('api.request.error', 1, {
      tags: { endpoint, method, status_code: statusCode.toString() },
    })
  }
}

/**
 * Monitor job queue performance
 */
export function monitorJobPerformance(
  queueName: string,
  jobName: string,
  status: 'completed' | 'failed',
  duration: number,
  attemptNumber?: number
) {
  Sentry.metrics.distribution('job.duration', duration, {
    tags: {
      queue: queueName,
      job: jobName,
      status,
      attempt: attemptNumber?.toString() || '1',
    },
    unit: 'millisecond',
  })
  
  if (status === 'failed') {
    Sentry.metrics.increment('job.failure', 1, {
      tags: { queue: queueName, job: jobName },
    })
  }
}