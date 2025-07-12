# Structured Logging System Guide

## Overview

We've implemented a comprehensive structured logging system using Winston that provides:
- Centralized logging with proper log levels
- Structured JSON output for better parsing
- Integration with monitoring services
- Performance tracking and audit trails
- Automatic error context capture

## Features

### 1. Log Levels
- **error**: Application errors and exceptions
- **warn**: Warning conditions that should be investigated
- **info**: General informational messages
- **http**: HTTP request/response logging
- **debug**: Detailed debugging information

### 2. Structured Context
All logs support structured context for better searchability:
```typescript
log.info('User action', {
  userId: 'user123',
  action: 'upload_meeting',
  meetingId: 'meeting456',
  duration: 1250
})
```

### 3. Specialized Loggers

#### Child Loggers
Create loggers with persistent context:
```typescript
const userLogger = log.child({ userId, sessionId })
userLogger.info('All logs will include userId and sessionId')
```

#### Performance Logging
Track operation performance:
```typescript
await log.measureTime('Database query', async () => {
  return await db.query('SELECT * FROM meetings')
})
```

#### Audit Logging
Track user actions for compliance:
```typescript
log.audit('Meeting deleted', {
  userId: user.id,
  meetingId: meeting.id,
  reason: 'User requested'
})
```

#### Security Logging
Track security-related events:
```typescript
log.security('Failed login attempt', {
  userId: email,
  ip: request.ip,
  attempts: failedAttempts
})
```

## Integration Examples

### 1. API Route Handler
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logger'
import { logAuth, logRateLimit } from '@/lib/logger/formatters'

export async function POST(req: NextRequest) {
  const requestLogger = log.child({
    requestId: req.headers.get('x-request-id'),
    method: 'POST',
    path: '/api/meetings/upload'
  })
  
  try {
    requestLogger.info('Processing meeting upload')
    
    // Check rate limit
    const { allowed, remaining } = await checkRateLimit(userId)
    logRateLimit('meeting-upload', userId, 10, remaining)
    
    if (!allowed) {
      requestLogger.warn('Rate limit exceeded')
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    
    // Process upload
    const result = await requestLogger.measureTime(
      'Process meeting upload',
      async () => await processMeeting(data)
    )
    
    requestLogger.info('Meeting upload completed', {
      meetingId: result.id,
      processingTime: result.duration
    })
    
    return NextResponse.json(result)
    
  } catch (error) {
    requestLogger.error('Meeting upload failed', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 2. Database Operations
```typescript
import { log } from '@/lib/logger'
import { logQuery } from '@/lib/logger/formatters'

export async function getMeetingById(id: string) {
  const start = Date.now()
  
  try {
    const result = await db.query(
      'SELECT * FROM meetings WHERE id = $1',
      [id]
    )
    
    const duration = Date.now() - start
    logQuery('SELECT', 'meetings', {
      meetingId: id,
      rows: result.rows.length,
      duration
    })
    
    return result.rows[0]
    
  } catch (error) {
    log.error('Database query failed', {
      error,
      query: 'getMeetingById',
      meetingId: id
    })
    throw error
  }
}
```

### 3. External Service Integration
```typescript
import { log } from '@/lib/logger'
import { logIntegration, logAPI } from '@/lib/logger/formatters'

export async function syncWithGoogleDrive(userId: string) {
  const logger = log.child({ userId, integration: 'google-drive' })
  
  try {
    logger.info('Starting Google Drive sync')
    
    const start = Date.now()
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    log.api('GET', 'https://www.googleapis.com/drive/v3/files', 
      response.status, Date.now() - start)
    
    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`)
    }
    
    const files = await response.json()
    
    logIntegration('google-drive', 'sync-files', true, {
      filesFound: files.items.length,
      userId
    })
    
    return files
    
  } catch (error) {
    logIntegration('google-drive', 'sync-files', false, {
      error,
      userId
    })
    throw error
  }
}
```

### 4. Queue Processing
```typescript
import { log } from '@/lib/logger'
import { logQueue, logAI } from '@/lib/logger/formatters'

export async function processTranscriptionJob(job: Job) {
  const logger = log.child({
    jobId: job.id,
    jobType: 'transcription',
    meetingId: job.data.meetingId
  })
  
  try {
    logQueue('process', 'transcription', job.id, {
      meetingId: job.data.meetingId,
      attempt: job.attemptsMade
    })
    
    logger.info('Starting transcription')
    
    const start = Date.now()
    const result = await transcribeAudio(job.data.audioUrl)
    const duration = Date.now() - start
    
    logAI('transcription', 'whisper-large-v3', duration, result.tokens, {
      meetingId: job.data.meetingId,
      audioLength: job.data.duration
    })
    
    logQueue('complete', 'transcription', job.id, { duration })
    
    return result
    
  } catch (error) {
    logQueue('fail', 'transcription', job.id, {
      error,
      attempt: job.attemptsMade
    })
    throw error
  }
}
```

### 5. Authentication Flow
```typescript
import { log } from '@/lib/logger'
import { logAuth } from '@/lib/logger/formatters'

export async function loginUser(email: string, password: string, ip: string) {
  try {
    const user = await validateCredentials(email, password)
    
    if (!user) {
      logAuth('login', email, false, {
        reason: 'Invalid credentials',
        ip
      })
      return null
    }
    
    logAuth('login', user.id, true, {
      method: 'email',
      ip
    })
    
    // Create session
    const session = await createSession(user.id)
    
    log.audit('Session created', {
      userId: user.id,
      sessionId: session.id,
      ip
    })
    
    return { user, session }
    
  } catch (error) {
    log.error('Login error', {
      error,
      email,
      ip
    })
    throw error
  }
}
```

## Production Configuration

### Environment Variables
```env
# Logging Configuration
LOG_LEVEL=info                    # Log level (error, warn, info, http, debug)
LOG_DIR=/var/log/hangjegyzet     # Directory for log files

# External Integrations (optional)
SENTRY_DSN=https://xxx@sentry.io/xxx
DD_API_KEY=xxx                    # Datadog API key
ELASTICSEARCH_URL=http://localhost:9200
SLACK_WEBHOOK_URL=https://hooks.slack.com/xxx
AWS_REGION=eu-central-1
CLOUDWATCH_LOG_GROUP=hangjegyzet-logs
ENABLE_PROMETHEUS_METRICS=true
```

### Log Rotation
In production, logs are automatically rotated:
- Error logs: Kept for 30 days
- Combined logs: Kept for 14 days  
- HTTP logs: Kept for 7 days
- Max file size: 20MB per file

### Performance Considerations

1. **Async Logging**: All file operations are asynchronous
2. **Buffering**: Logs are buffered before writing to external services
3. **Sampling**: Debug logs are disabled in production
4. **Compression**: Old log files are automatically compressed

## Monitoring & Alerts

### Key Metrics to Monitor
```typescript
// These are automatically tracked
- Error rate by type
- Response time percentiles  
- Failed authentication attempts
- Rate limit violations
- External API failures
- Queue processing times
```

### Alert Examples
```yaml
alerts:
  - name: "High Error Rate"
    condition: "error_rate > 1%"
    severity: "critical"
    
  - name: "Authentication Failures"
    condition: "failed_logins > 10 per minute"
    severity: "warning"
    
  - name: "Slow API Response"
    condition: "p95_latency > 1000ms"
    severity: "warning"
```

## Best Practices

### 1. Use Appropriate Log Levels
```typescript
// ❌ Bad
console.log('User logged in')
console.error('Something went wrong')

// ✅ Good
log.info('User logged in', { userId, method: 'oauth' })
log.error('Database connection failed', { error, retryCount: 3 })
```

### 2. Include Relevant Context
```typescript
// ❌ Bad
log.error('Failed to process')

// ✅ Good
log.error('Failed to process meeting', {
  meetingId,
  userId,
  step: 'transcription',
  error
})
```

### 3. Use Child Loggers for Request Context
```typescript
// ❌ Bad - Repeating context
log.info('Request started', { requestId, userId })
log.info('Validating input', { requestId, userId })
log.info('Processing complete', { requestId, userId })

// ✅ Good - Child logger
const reqLogger = log.child({ requestId, userId })
reqLogger.info('Request started')
reqLogger.info('Validating input')
reqLogger.info('Processing complete')
```

### 4. Avoid Logging Sensitive Data
```typescript
// ❌ Bad
log.info('User login', { 
  email: user.email,
  password: req.body.password  // Never log passwords!
})

// ✅ Good
log.info('User login', { 
  userId: user.id,
  email: user.email,
  method: 'password'
})
```

### 5. Use Formatters for Consistency
```typescript
// ❌ Bad - Inconsistent formatting
log.info(`Email sent to ${email}`)
log.info('Sent email', { to: email })

// ✅ Good - Use formatters
logEmail('sent', email, subject, { templateId })
```

## Migration from Console.log

To migrate existing code:

1. **Replace console.log**
   ```typescript
   // Before
   console.log('Processing meeting', meetingId)
   
   // After
   log.info('Processing meeting', { meetingId })
   ```

2. **Replace console.error**
   ```typescript
   // Before
   console.error('Error:', error)
   
   // After
   log.error('Processing failed', { error })
   ```

3. **Add context to errors**
   ```typescript
   // Before
   try {
     await processFile(file)
   } catch (err) {
     console.error(err)
     throw err
   }
   
   // After
   try {
     await processFile(file)
   } catch (error) {
     log.error('File processing failed', {
       error,
       filename: file.name,
       size: file.size
     })
     throw error
   }
   ```

## Testing

Use log mocking in tests:
```typescript
import { log } from '@/lib/logger'

jest.mock('@/lib/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn()
    }))
  }
}))

test('logs user action', () => {
  performAction()
  
  expect(log.info).toHaveBeenCalledWith(
    'Action performed',
    expect.objectContaining({ userId: 'test-user' })
  )
})
```

## Troubleshooting

### Logs not appearing
1. Check LOG_LEVEL environment variable
2. Ensure LOG_DIR has write permissions
3. Verify Node.js process has file access

### Performance impact
1. Reduce log level in production (use 'info' not 'debug')
2. Enable log sampling for high-traffic endpoints
3. Use child loggers to reduce context duplication

### External service integration issues
1. Check API keys and endpoints
2. Verify network connectivity
3. Review service-specific error logs