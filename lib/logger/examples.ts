// Example usage of the structured logging system

import { log } from './index'
import {
  logQuery,
  logCache,
  logQueue,
  logIntegration,
  logMetric,
  logAuth,
  logPayment,
  logAI,
  logFile,
  logEmail,
  logWebhook,
  logRateLimit,
} from './formatters'

// Basic logging examples
export function basicLoggingExamples() {
  // Simple messages
  log.info('Application started')
  log.warn('Low memory warning', { memoryUsage: process.memoryUsage() })
  log.error('Failed to connect to database', { error: new Error('Connection timeout') })
  
  // With context
  log.info('User logged in', {
    userId: 'user123',
    organizationId: 'org456',
    loginMethod: 'email',
  })
  
  // Performance logging
  log.perf('Database query', 150, {
    query: 'SELECT * FROM meetings',
    rows: 25,
  })
  
  // Audit logging
  log.audit('Meeting deleted', {
    userId: 'user123',
    meetingId: 'meeting789',
    reason: 'User requested deletion',
  })
  
  // Security events
  log.security('Multiple failed login attempts', {
    userId: 'user123',
    attempts: 5,
    ip: '192.168.1.1',
  })
}

// Child logger example
export function childLoggerExample(userId: string, meetingId: string) {
  // Create a child logger with default context
  const meetingLogger = log.child({
    userId,
    meetingId,
    module: 'meeting-processor',
  })
  
  // All logs from this logger will include the context
  meetingLogger.info('Processing meeting')
  meetingLogger.debug('Extracting audio')
  meetingLogger.info('Transcription completed', { duration: 1200 })
}

// Measure time example
export async function measureTimeExample() {
  // Automatically measure and log execution time
  const result = await log.measureTime(
    'Process meeting',
    async () => {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { transcriptId: 'transcript123' }
    },
    { meetingId: 'meeting456' }
  )
  
  return result
}

// Database logging examples
export function databaseLoggingExamples() {
  logQuery('SELECT', 'meetings', {
    userId: 'user123',
    rows: 10,
  })
  
  logQuery('INSERT', 'transcripts', {
    meetingId: 'meeting456',
    affected: 1,
  })
  
  log.query('SELECT * FROM users WHERE email = $1', ['user@example.com'], 45)
}

// Cache logging examples
export function cacheLoggingExamples() {
  logCache('hit', 'user:123:profile')
  logCache('miss', 'meeting:456:transcript')
  logCache('set', 'org:789:settings', { ttl: 3600 })
  logCache('delete', 'session:abc123')
}

// Queue logging examples
export function queueLoggingExamples() {
  logQueue('enqueue', 'transcription', 'job123', {
    meetingId: 'meeting456',
    priority: 'high',
  })
  
  logQueue('process', 'transcription', 'job123', {
    attempt: 1,
  })
  
  logQueue('complete', 'transcription', 'job123', {
    duration: 1200,
  })
  
  logQueue('fail', 'transcription', 'job124', {
    error: new Error('Audio file corrupted'),
    attempt: 3,
  })
}

// Integration logging examples
export function integrationLoggingExamples() {
  logIntegration('google-drive', 'sync-folder', true, {
    filesFound: 5,
    filesSynced: 5,
  })
  
  logIntegration('slack', 'send-notification', false, {
    error: new Error('Invalid webhook URL'),
    channel: '#meetings',
  })
}

// Business metrics examples
export function businessMetricsExamples() {
  logMetric('meetings_processed', 25, 'count', {
    timeframe: 'hourly',
  })
  
  logMetric('average_transcription_time', 8.5, 'minutes', {
    model: 'whisper-large',
  })
  
  logMetric('api_response_time', 89, 'ms', {
    endpoint: '/api/meetings',
    method: 'GET',
  })
}

// Authentication logging examples
export function authLoggingExamples() {
  logAuth('login', 'user123', true, {
    method: 'email',
    ip: '192.168.1.1',
  })
  
  logAuth('logout', 'user123', true)
  
  logAuth('login', 'user456', false, {
    reason: 'Invalid password',
    attempts: 3,
  })
  
  logAuth('mfa_enabled', 'user789', true, {
    method: 'totp',
  })
}

// Payment logging examples
export function paymentLoggingExamples() {
  logPayment('subscription_created', 99.99, 'EUR', {
    customerId: 'cus_123',
    subscriptionId: 'sub_456',
    plan: 'professional',
  })
  
  logPayment('payment_failed', 99.99, 'EUR', {
    customerId: 'cus_789',
    reason: 'Insufficient funds',
  })
}

// AI operations logging examples
export function aiLoggingExamples() {
  logAI('transcription', 'whisper-large-v3', 1250, 15000, {
    meetingId: 'meeting123',
    audioLength: 3600,
    language: 'hu',
  })
  
  logAI('summary', 'claude-3-opus', 2000, 500, {
    meetingId: 'meeting123',
    summaryType: 'executive',
  })
}

// File operations logging examples
export function fileLoggingExamples() {
  logFile('upload', 'meeting-2024-01-15.mp4', 250 * 1024 * 1024, {
    userId: 'user123',
    meetingId: 'meeting456',
  })
  
  logFile('process', 'meeting-2024-01-15.mp4', undefined, {
    operation: 'audio-extraction',
    format: 'wav',
  })
}

// Email logging examples
export function emailLoggingExamples() {
  logEmail('sent', 'user@example.com', 'Meeting summary ready', {
    meetingId: 'meeting123',
    template: 'meeting-complete',
  })
  
  logEmail('bounced', 'invalid@example.com', undefined, {
    reason: 'Invalid email address',
  })
}

// Webhook logging examples
export function webhookLoggingExamples() {
  logWebhook('sent', 'https://api.example.com/webhook', 200, 1, {
    event: 'meeting.completed',
    meetingId: 'meeting123',
  })
  
  logWebhook('failed', 'https://api.example.com/webhook', 500, 3, {
    event: 'meeting.completed',
    error: 'Internal server error',
  })
}

// Rate limiting examples
export function rateLimitingExamples() {
  logRateLimit('api', 'user123', 100, 75)
  logRateLimit('api', 'user456', 100, 0, {
    endpoint: '/api/transcribe',
  })
}

// Error handling with context
export async function errorHandlingExample() {
  try {
    // Some operation that might fail
    throw new Error('Database connection failed')
  } catch (error) {
    log.error('Failed to process meeting', {
      error,
      meetingId: 'meeting123',
      userId: 'user456',
      operation: 'transcription',
      retryCount: 3,
    })
  }
}

// Request logging example
export function requestLoggingExample(req: any) {
  const requestLogger = log.child({
    requestId: req.requestId,
    userId: req.user?.id,
    method: req.method,
    path: req.path,
  })
  
  requestLogger.info('Processing request')
  
  // Use throughout request handling
  return requestLogger
}