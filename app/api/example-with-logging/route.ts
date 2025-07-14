import { NextRequest, NextResponse } from 'next/server'
import { withLogging } from '@/app/api/middleware'
import { log } from '@/lib/logger'
import { logAuth, logRateLimit, logMetric, logQueue } from '@/lib/logger/formatters'

// Example API route demonstrating comprehensive logging
export const POST = withLogging(async (req: NextRequest) => {
  // Get the request logger with context
  const requestLogger = (req as any).log as typeof log
  const requestId = (req as any).requestId
  
  try {
    // Parse request body
    const body = await req.json()
    const { userId, action, data } = body
    
    requestLogger.info('Processing user action', {
      userId,
      action,
    })
    
    // Check authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      requestLogger.warn('Missing authentication', { userId })
      // Log as general auth failure instead of specific api_access event
      requestLogger.info('API access attempt without auth', { userId })
      
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Simulate rate limiting check
    const rateLimit = {
      allowed: Math.random() > 0.1,
      limit: 100,
      remaining: Math.floor(Math.random() * 100),
    }
    
    logRateLimit('api', userId, rateLimit.limit, rateLimit.remaining)
    
    if (!rateLimit.allowed) {
      requestLogger.warn('Rate limit exceeded', {
        userId,
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
      })
      
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }
    
    // Process the action
    const result = await requestLogger.measureTime(
      `Process ${action}`,
      async () => {
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000))
        
        // Log business metrics
        logMetric(`action_${action}`, 1, 'count', { userId })
        
        // Queue background job
        const jobId = `job_${Date.now()}`
        logQueue('enqueue', 'process_action', jobId, {
          userId,
          action,
          priority: 'normal',
        })
        
        return {
          success: true,
          jobId,
          processedAt: new Date().toISOString(),
        }
      },
      { userId, action }
    )
    
    // Log successful completion
    requestLogger.info('Action processed successfully', {
      userId,
      action,
      jobId: result.jobId,
    })
    
    // Audit log for important actions
    if (['delete', 'update', 'export'].includes(action)) {
      requestLogger.audit(`User performed ${action}`, {
        userId,
        action,
        data,
        result: result.jobId,
      })
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      requestId,
    })
    
  } catch (error) {
    // Error will be logged by middleware
    throw error
  }
})

// Example GET endpoint with query logging
export const GET = withLogging(async (req: NextRequest) => {
  const requestLogger = (req as any).log as typeof log
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  
  requestLogger.info('Fetching user data', { userId })
  
  try {
    // Simulate database query with logging
    const userData = await requestLogger.measureTime(
      'Fetch user from database',
      async () => {
        // Simulate DB query
        requestLogger.query(
          'SELECT * FROM users WHERE id = $1',
          [userId],
          Math.random() * 100
        )
        
        await new Promise(resolve => setTimeout(resolve, 50))
        
        return {
          id: userId,
          name: 'Test User',
          email: 'test@example.com',
        }
      },
      { userId }
    )
    
    // Log cache miss (for example)
    requestLogger.debug('Cache miss for user data', {
      userId,
      cacheKey: `user:${userId}`,
    })
    
    return NextResponse.json({
      success: true,
      data: userData,
    })
    
  } catch (error) {
    // Log specific error details
    requestLogger.error('Failed to fetch user data', {
      error,
      userId,
      operation: 'database_read',
    })
    
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    )
  }
})