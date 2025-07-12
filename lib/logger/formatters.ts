// Custom formatters for specific log types

import { log, LogContext } from './index'

// Database query logging
export function logQuery(
  operation: string,
  table: string,
  context?: LogContext & { rows?: number; affected?: number }
): void {
  log.debug(`Database: ${operation} on ${table}`, {
    ...context,
    type: 'database',
    operation,
    table,
  })
}

// Cache operations logging
export function logCache(
  operation: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  context?: LogContext
): void {
  const level = operation === 'miss' ? 'debug' : 'debug'
  log.debug(`Cache ${operation}: ${key}`, {
    ...context,
    type: 'cache',
    operation,
    key,
  })
}

// Queue operations logging
export function logQueue(
  operation: 'enqueue' | 'process' | 'complete' | 'fail',
  jobType: string,
  jobId: string,
  context?: LogContext
): void {
  const level = operation === 'fail' ? 'error' : 'info'
  const message = `Queue ${operation}: ${jobType} [${jobId}]`
  
  if (operation === 'fail') {
    log.error(message, {
      ...context,
      type: 'queue',
      operation,
      jobType,
      jobId,
    })
  } else {
    log.info(message, {
      ...context,
      type: 'queue',
      operation,
      jobType,
      jobId,
    })
  }
}

// Integration logging
export function logIntegration(
  service: string,
  operation: string,
  success: boolean,
  context?: LogContext
): void {
  const level = success ? 'info' : 'error'
  const message = `Integration ${service}: ${operation} ${success ? 'succeeded' : 'failed'}`
  
  if (success) {
    log.info(message, {
      ...context,
      type: 'integration',
      service,
      operation,
      success,
    })
  } else {
    log.error(message, {
      ...context,
      type: 'integration',
      service,
      operation,
      success,
    })
  }
}

// Business metrics logging
export function logMetric(
  metric: string,
  value: number,
  unit?: string,
  context?: LogContext
): void {
  log.info(`Metric: ${metric}`, {
    ...context,
    type: 'metric',
    metric,
    value,
    unit,
  })
}

// Feature flag logging
export function logFeatureFlag(
  flag: string,
  enabled: boolean,
  userId?: string,
  context?: LogContext
): void {
  log.debug(`Feature flag: ${flag} is ${enabled ? 'enabled' : 'disabled'}`, {
    ...context,
    type: 'feature_flag',
    flag,
    enabled,
    userId,
  })
}

// Authentication events
export function logAuth(
  event: 'login' | 'logout' | 'register' | 'password_reset' | 'mfa_enabled',
  userId?: string,
  success: boolean = true,
  context?: LogContext
): void {
  const level = success ? 'info' : 'warn'
  const message = `Auth: ${event} ${success ? 'succeeded' : 'failed'}`
  
  if (success) {
    log.info(message, {
      ...context,
      type: 'auth',
      event,
      userId,
      success,
    })
  } else {
    log.warn(message, {
      ...context,
      type: 'auth',
      event,
      userId,
      success,
    })
  }
}

// Payment events
export function logPayment(
  event: 'subscription_created' | 'payment_succeeded' | 'payment_failed' | 'subscription_cancelled',
  amount?: number,
  currency?: string,
  context?: LogContext & { customerId?: string; subscriptionId?: string }
): void {
  const level = event.includes('failed') || event.includes('cancelled') ? 'warn' : 'info'
  const message = `Payment: ${event}`
  
  if (level === 'warn') {
    log.warn(message, {
      ...context,
      type: 'payment',
      event,
      amount,
      currency,
    })
  } else {
    log.info(message, {
      ...context,
      type: 'payment',
      event,
      amount,
      currency,
    })
  }
}

// AI/ML operations
export function logAI(
  operation: 'transcription' | 'summary' | 'analysis' | 'embedding',
  model: string,
  duration: number,
  tokens?: number,
  context?: LogContext
): void {
  log.info(`AI: ${operation} with ${model}`, {
    ...context,
    type: 'ai',
    operation,
    model,
    duration,
    tokens,
    tokensPerSecond: tokens && duration ? Math.round((tokens / duration) * 1000) : undefined,
  })
}

// File operations
export function logFile(
  operation: 'upload' | 'download' | 'delete' | 'process',
  filename: string,
  size?: number,
  context?: LogContext
): void {
  log.info(`File ${operation}: ${filename}`, {
    ...context,
    type: 'file',
    operation,
    filename,
    size,
    sizeMB: size ? Math.round(size / 1024 / 1024 * 100) / 100 : undefined,
  })
}

// Email operations
export function logEmail(
  event: 'sent' | 'bounced' | 'delivered' | 'opened' | 'clicked',
  recipient: string,
  subject?: string,
  context?: LogContext
): void {
  const level = event === 'bounced' ? 'warn' : 'info'
  const message = `Email ${event}: ${recipient}`
  
  if (event === 'bounced') {
    log.warn(message, {
      ...context,
      type: 'email',
      event,
      recipient,
      subject,
    })
  } else {
    log.info(message, {
      ...context,
      type: 'email',
      event,
      recipient,
      subject,
    })
  }
}

// Webhook operations
export function logWebhook(
  event: 'sent' | 'received' | 'failed' | 'retrying',
  url: string,
  statusCode?: number,
  attempt?: number,
  context?: LogContext
): void {
  const level = event === 'failed' ? 'error' : 'info'
  const message = `Webhook ${event}: ${url}`
  
  if (event === 'failed') {
    log.error(message, {
      ...context,
      type: 'webhook',
      event,
      url,
      statusCode,
      attempt,
    })
  } else {
    log.info(message, {
      ...context,
      type: 'webhook',
      event,
      url,
      statusCode,
      attempt,
    })
  }
}

// Rate limiting events
export function logRateLimit(
  resource: string,
  userId?: string,
  limit: number = 0,
  remaining: number = 0,
  context?: LogContext
): void {
  const exceeded = remaining <= 0
  const level = exceeded ? 'warn' : 'debug'
  const message = exceeded 
    ? `Rate limit exceeded: ${resource}`
    : `Rate limit check: ${resource}`
  
  if (exceeded) {
    log.warn(message, {
      ...context,
      type: 'rate_limit',
      resource,
      userId,
      limit,
      remaining,
      exceeded,
    })
  } else {
    log.debug(message, {
      ...context,
      type: 'rate_limit',
      resource,
      userId,
      limit,
      remaining,
      exceeded,
    })
  }
}