import { NextRequest, NextResponse } from 'next/server'
import { cacheManager, CacheKeys } from './index'

interface CacheMiddlewareOptions {
  ttl?: number
  keyGenerator?: (req: NextRequest) => string
  condition?: (req: NextRequest) => boolean
  tags?: string[]
}

/**
 * Create a cache key from request
 */
function generateCacheKey(req: NextRequest): string {
  const url = new URL(req.url)
  const method = req.method
  const pathname = url.pathname
  const searchParams = url.searchParams.toString()
  
  // Use simple string concatenation instead of hashing for performance
  const key = `${method}:${pathname}${searchParams ? ':' + searchParams : ''}`
  
  // Truncate if too long to avoid key size issues
  return key.length > 200 ? key.substring(0, 200) : key
}

/**
 * Cache middleware for API routes
 */
export function withCache(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: CacheMiddlewareOptions = {}
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    // Check if caching should be applied
    if (options.condition && !options.condition(req)) {
      return handler(req, context)
    }

    // Only cache GET requests by default
    if (req.method !== 'GET') {
      return handler(req, context)
    }

    // Generate cache key
    const cacheKey = options.keyGenerator 
      ? options.keyGenerator(req)
      : generateCacheKey(req)

    try {
      // Try to get from cache
      const cached = await cacheManager.getOrSet(
        cacheKey,
        async () => {
          // Execute handler and get response
          const response = await handler(req, context)
          
          // Only cache successful responses
          if (response.status >= 200 && response.status < 300) {
            const body = await response.text()
            const headers = Object.fromEntries(response.headers.entries())
            
            return {
              body,
              status: response.status,
              headers
            }
          }
          
          return null
        },
        {
          prefix: 'api-cache',
          ttl: options.ttl || 300 // 5 minutes default
        }
      )

      if (cached) {
        // Return cached response
        return new NextResponse(cached.body, {
          status: cached.status,
          headers: {
            ...cached.headers,
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey
          }
        })
      }
    } catch (error) {
      console.error('Cache middleware error:', error)
    }

    // Fallback to handler
    const response = await handler(req, context)
    response.headers.set('X-Cache', 'MISS')
    return response
  }
}

/**
 * Invalidate cache middleware
 */
export function withCacheInvalidation(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  patterns: string[] | ((req: NextRequest) => string[])
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const response = await handler(req, context)
    
    // Only invalidate on successful mutations
    if (
      response.status >= 200 && 
      response.status < 300 &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
    ) {
      const patternsToInvalidate = typeof patterns === 'function' 
        ? patterns(req)
        : patterns
      
      // Invalidate cache patterns
      await Promise.all(
        patternsToInvalidate.map(pattern => 
          cacheManager.invalidatePattern(pattern)
        )
      )
    }
    
    return response
  }
}

/**
 * Edge cache headers middleware
 */
export function withEdgeCache(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  maxAge: number = 60
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const response = await handler(req, context)
    
    // Set cache control headers for edge caching
    if (response.status >= 200 && response.status < 300) {
      response.headers.set(
        'Cache-Control',
        `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`
      )
    }
    
    return response
  }
}

/**
 * Conditional cache based on user role
 */
export function withConditionalCache(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    ttl?: number
    adminTTL?: number
    publicTTL?: number
  } = {}
) {
  return withCache(handler, {
    ttl: options.ttl || 300,
    keyGenerator: (req) => {
      const url = new URL(req.url)
      const userId = req.headers.get('x-user-id') || 'anonymous'
      return `${generateCacheKey(req)}:${userId}`
    },
    condition: (req) => {
      // Don't cache for authenticated admin users
      const userRole = req.headers.get('x-user-role')
      return userRole !== 'admin'
    }
  })
}