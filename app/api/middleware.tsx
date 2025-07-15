import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logger'
import { nanoid } from 'nanoid'

export function withLogging(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const requestId = req.headers.get('x-request-id') || nanoid()
    const start = Date.now()
    
    // Create request logger
    const requestLogger = log.child({
      requestId,
      method: req.method,
      url: req.url,
      pathname: new URL(req.url).pathname,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent'),
    })
    
    // Log request
    ;(requestLogger as any).http('Incoming request')
    
    try {
      // Add logger to request
      (req as any).log = requestLogger
      (req as any).requestId = requestId
      
      // Execute handler
      const response = await handler(req, context)
      
      // Calculate duration
      const duration = Date.now() - start
      
      // Log response
      ;(requestLogger as any).http('Request completed', {
        statusCode: response.status,
        duration,
      })
      
      // Log slow requests
      if (duration > 1000) {
        ;(requestLogger as any).warn('Slow request detected', {
          duration,
          threshold: 1000,
        })
      }
      
      // Add headers
      response.headers.set('x-request-id', requestId)
      response.headers.set('x-response-time', `${duration}ms`)
      
      return response
    } catch (error) {
      const duration = Date.now() - start
      
      // Log error
      ;(requestLogger as any).error('Request failed', {
        error,
        duration,
      })
      
      // Return error response
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' 
            ? (error as Error).message 
            : undefined,
          requestId,
        },
        { 
          status: 500,
          headers: {
            'x-request-id': requestId,
            'x-response-time': `${duration}ms`,
          }
        }
      )
    }
  }
}

// Usage example:
// export const GET = withLogging(async (req) => {
//   const logger = (req as any).log
//   logger.info('Processing GET request')
//   return NextResponse.json({ data: 'example' })
// })