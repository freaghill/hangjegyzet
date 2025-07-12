import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

// Simple in-memory rate limiter for development
// In production, use Redis or Upstash
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitConfig {
  interval: number // Time window in seconds
  limit: number    // Max requests in time window
}

export const RATE_LIMITS = {
  transcription: { interval: 60, limit: 10 },      // 10 per minute
  aiAnalysis: { interval: 300, limit: 10 },        // 10 per 5 minutes
  export: { interval: 60, limit: 5 },              // 5 per minute
  webhook: { interval: 1, limit: 10 },             // 10 per second
  api: { interval: 60, limit: 60 },                // 60 per minute
  upload: { interval: 300, limit: 20 },            // 20 per 5 minutes
} as const

/**
 * Check rate limit for a given identifier
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.api
): Promise<{
  allowed: boolean
  limit: number
  remaining: number
  reset: number
}> {
  const now = Date.now()
  const key = `${identifier}:${config.interval}`
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    cleanupRateLimits()
  }
  
  const record = rateLimitMap.get(key)
  
  if (!record || now > record.resetTime) {
    // First request or window expired
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + (config.interval * 1000)
    })
    
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: now + (config.interval * 1000)
    }
  }
  
  if (record.count >= config.limit) {
    // Rate limit exceeded
    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      reset: record.resetTime
    }
  }
  
  // Increment counter
  record.count++
  rateLimitMap.set(key, record)
  
  return {
    allowed: true,
    limit: config.limit,
    remaining: config.limit - record.count,
    reset: record.resetTime
  }
}

/**
 * Rate limit middleware for API routes
 */
export async function withRateLimit(
  request: Request,
  config: RateLimitConfig = RATE_LIMITS.api
): Promise<NextResponse | null> {
  const identifier = getIdentifier(request)
  const { allowed, limit, remaining, reset } = await checkRateLimit(identifier, config)
  
  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((reset - Date.now()) / 1000)} seconds.`
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString()
        }
      }
    )
  }
  
  // Add rate limit headers to response
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', reset.toString())
  
  return null // Continue processing
}

/**
 * Get identifier from request (IP or user ID)
 */
function getIdentifier(request: Request): string {
  const headersList = headers()
  
  // Try to get user ID from auth header or session
  const authHeader = headersList.get('authorization')
  if (authHeader) {
    // Extract user ID from token if possible
    // This is a simplified version
    return `user:${authHeader.slice(0, 16)}`
  }
  
  // Fall back to IP address
  const forwarded = headersList.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
  
  return `ip:${ip}`
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimits(): void {
  const now = Date.now()
  const keysToDelete: string[] = []
  
  rateLimitMap.forEach((record, key) => {
    if (now > record.resetTime + 60000) { // 1 minute grace period
      keysToDelete.push(key)
    }
  })
  
  keysToDelete.forEach(key => rateLimitMap.delete(key))
}

/**
 * Decorator for rate-limited API endpoints
 */
export function rateLimited(config: RateLimitConfig = RATE_LIMITS.api) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const [request] = args
      const rateLimitResponse = await withRateLimit(request, config)
      
      if (rateLimitResponse) {
        return rateLimitResponse
      }
      
      return originalMethod.apply(this, args)
    }
    
    return descriptor
  }
}