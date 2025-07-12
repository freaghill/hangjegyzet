import { NextRequest, NextResponse } from 'next/server'
import { log } from './index'
import { nanoid } from 'nanoid'

// Middleware for logging HTTP requests
export function loggingMiddleware(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = req.headers.get('x-request-id') || nanoid()
    const start = Date.now()
    
    // Create child logger with request context
    const requestLogger = log.child({
      requestId,
      method: req.method,
      url: req.url,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent'),
    })
    
    // Log incoming request
    requestLogger.http(`Incoming request: ${req.method} ${req.url}`)
    
    try {
      // Execute handler
      const response = await handler(req)
      
      // Calculate duration
      const duration = Date.now() - start
      
      // Log response
      requestLogger.http(`Request completed: ${req.method} ${req.url}`, {
        statusCode: response.status,
        duration,
      })
      
      // Add request ID to response headers
      response.headers.set('x-request-id', requestId)
      
      // Log slow requests
      if (duration > 1000) {
        requestLogger.warn(`Slow request detected: ${req.method} ${req.url}`, {
          duration,
          threshold: 1000,
        })
      }
      
      return response
    } catch (error) {
      const duration = Date.now() - start
      
      // Log error
      requestLogger.error(`Request failed: ${req.method} ${req.url}`, {
        duration,
        error,
      })
      
      throw error
    }
  }
}

// Express-style middleware for API routes
export function expressLoggingMiddleware(
  req: any,
  res: any,
  next: any
): void {
  const requestId = req.headers['x-request-id'] || nanoid()
  const start = Date.now()
  
  // Store request ID
  req.requestId = requestId
  
  // Create child logger
  req.log = log.child({
    requestId,
    method: req.method,
    url: req.url,
    ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  })
  
  // Log request
  req.log.http(`${req.method} ${req.url}`)
  
  // Capture response
  const originalSend = res.send
  res.send = function (data: any) {
    const duration = Date.now() - start
    
    // Log response
    req.log.http(`${req.method} ${req.url} ${res.statusCode}`, {
      statusCode: res.statusCode,
      duration,
    })
    
    // Log slow requests
    if (duration > 1000) {
      req.log.warn('Slow request detected', {
        duration,
        threshold: 1000,
      })
    }
    
    // Add request ID to response
    res.setHeader('x-request-id', requestId)
    
    // Call original send
    originalSend.call(this, data)
  }
  
  next()
}