import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Different rate limit tiers
export const rateLimiters = {
  // Public endpoints (strict)
  public: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
    analytics: true,
    prefix: 'rl:public'
  }),
  
  // Authenticated users (normal)
  authenticated: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minute
    analytics: true,
    prefix: 'rl:auth'
  }),
  
  // API endpoints (generous)
  api: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
    prefix: 'rl:api'
  }),
  
  // Export endpoints (strict - expensive operations)
  export: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '5 m'), // 5 exports per 5 minutes
    analytics: true,
    prefix: 'rl:export'
  }),
  
  // AI endpoints (expensive)
  ai: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 AI calls per minute
    analytics: true,
    prefix: 'rl:ai'
  })
}

// Rate limit by organization (for better fairness)
export async function getRateLimitKey(req: NextRequest): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Get user's organization
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()
      
      // Rate limit by organization to prevent one org from hogging resources
      if (member?.organization_id) {
        return `org:${member.organization_id}`
      }
      
      // Fallback to user ID
      return `user:${user.id}`
    }
  } catch (error) {
    console.error('Rate limit key error:', error)
  }
  
  // Fallback to IP address
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'anonymous'
  
  return `ip:${ip}`
}

// Middleware helper
export async function checkRateLimit(
  req: NextRequest,
  limiter: keyof typeof rateLimiters = 'authenticated'
): Promise<{ 
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return { success: true, limit: 999, remaining: 999, reset: 0 }
  }
  
  // Skip if Redis not configured
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return { success: true, limit: 999, remaining: 999, reset: 0 }
  }
  
  try {
    const key = await getRateLimitKey(req)
    const { success, limit, remaining, reset } = await rateLimiters[limiter].limit(key)
    
    return { success, limit, remaining, reset }
  } catch (error) {
    console.error('Rate limit error:', error)
    // Fail open - don't block requests if rate limiting fails
    return { success: true, limit: 999, remaining: 999, reset: 0 }
  }
}

// Response helper
export function rateLimitResponse(limit: number, remaining: number, reset: number) {
  return new Response('Too Many Requests', {
    status: 429,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
      'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString()
    }
  })
}

// Decorator for API routes
export function withRateLimit(
  handler: Function,
  limiterType: keyof typeof rateLimiters = 'authenticated'
) {
  return async (req: NextRequest, ...args: any[]) => {
    const { success, limit, remaining, reset } = await checkRateLimit(req, limiterType)
    
    if (!success) {
      return rateLimitResponse(limit, remaining, reset)
    }
    
    // Add rate limit headers to successful responses
    const response = await handler(req, ...args)
    
    if (response instanceof Response) {
      response.headers.set('X-RateLimit-Limit', limit.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString())
    }
    
    return response
  }
}

// Export getClientId as alias for getRateLimitKey for compatibility
export const getClientId = getRateLimitKey