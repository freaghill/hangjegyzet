import { NextRequest, NextResponse } from 'next/server'
import { cache, cacheKeys } from './redis-client'

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  key?: string | ((req: NextRequest) => string) // Custom cache key
  revalidate?: boolean // Force cache revalidation
  tags?: string[] // Cache tags for invalidation
  swr?: boolean // Enable stale-while-revalidate
  swrTtl?: number // SWR window in seconds
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
  options: CacheOptions = {}
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return handler(req, context)
    }

    // Generate cache key
    const cacheKey = typeof options.key === 'function'
      ? options.key(req)
      : options.key || generateCacheKey(req)

    // Check if revalidation is requested
    const shouldRevalidate = options.revalidate || 
      req.headers.get('cache-control') === 'no-cache' ||
      req.headers.get('x-revalidate') === 'true'

    // Try to get from cache if not revalidating
    if (!shouldRevalidate) {
      const cached = await cache.get<any>(cacheKey)
      
      if (cached) {
        // Check if SWR is enabled
        if (options.swr && cached.timestamp) {
          const age = (Date.now() - cached.timestamp) / 1000
          const ttl = options.ttl || 300
          const swrWindow = options.swrTtl || 60
          
          // If data is stale but within SWR window, return it and revalidate in background
          if (age > ttl && age < ttl + swrWindow) {
            // Revalidate in background
            handler(req, context).then(async (freshResponse) => {
              if (freshResponse.status === 200) {
                const data = await freshResponse.json()
                await cache.set(
                  cacheKey,
                  { data, timestamp: Date.now() },
                  ttl + swrWindow
                )
              }
            }).catch(console.error)
          }
        }
        
        // Return cached response with cache headers
        return NextResponse.json(cached.data, {
          status: 200,
          headers: {
            'x-cache': 'HIT',
            'x-cache-key': cacheKey,
            'x-cache-age': cached.timestamp ? String(Math.floor((Date.now() - cached.timestamp) / 1000)) : '0',
            'cache-control': `public, max-age=${options.ttl || 300}`,
          },
        })
      }
    }

    // Execute handler
    const response = await handler(req, context)

    // Only cache successful responses
    if (response.status === 200) {
      try {
        const data = await response.json()
        
        // Store in cache
        await cache.set(
          cacheKey,
          { data, timestamp: Date.now() },
          options.ttl || 300 // Default 5 minutes
        )

        // Return response with cache headers
        return NextResponse.json(data, {
          status: 200,
          headers: {
            'x-cache': shouldRevalidate ? 'REVALIDATED' : 'MISS',
            'x-cache-key': cacheKey,
            'cache-control': `public, max-age=${options.ttl || 300}`,
          },
        })
      } catch (error) {
        console.error('Cache middleware error:', error)
        return response
      }
    }

    return response
  }
}

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>()

export async function dedupeRequest<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  // Check if request is already pending
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!
  }

  // Create new request
  const promise = fn().finally(() => {
    pendingRequests.delete(key)
  })

  pendingRequests.set(key, promise)
  return promise
}

// Cache wrapper for server functions
export async function withServerCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  // Try cache first
  const cached = await cache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Execute function with deduplication
  const result = await dedupeRequest(key, fn)

  // Cache result
  await cache.set(key, result, ttl)

  return result
}

// Edge caching headers
export function setEdgeCacheHeaders(
  response: NextResponse,
  options: {
    maxAge?: number
    sMaxAge?: number
    staleWhileRevalidate?: number
    tags?: string[]
  } = {}
): NextResponse {
  const {
    maxAge = 0,
    sMaxAge = 300,
    staleWhileRevalidate = 60,
    tags = []
  } = options

  // Set Cache-Control header
  const cacheControl = [
    'public',
    maxAge > 0 && `max-age=${maxAge}`,
    `s-maxage=${sMaxAge}`,
    staleWhileRevalidate > 0 && `stale-while-revalidate=${staleWhileRevalidate}`,
  ].filter(Boolean).join(', ')

  response.headers.set('Cache-Control', cacheControl)

  // Set cache tags for purging
  if (tags.length > 0) {
    response.headers.set('Cache-Tag', tags.join(','))
  }

  // Set CDN cache headers
  response.headers.set('CDN-Cache-Control', `max-age=${sMaxAge}`)
  response.headers.set('Vercel-CDN-Cache-Control', `max-age=${sMaxAge}`)

  return response
}

// Stale-while-revalidate pattern
export async function withSWR<T>(
  key: string,
  fn: () => Promise<T>,
  options: {
    ttl?: number
    staleTime?: number
  } = {}
): Promise<T> {
  const { ttl = 300, staleTime = 60 } = options

  // Get from cache
  const cached = await cache.get<{ data: T; timestamp: number }>(key)

  if (cached) {
    const age = (Date.now() - cached.timestamp) / 1000

    // Return fresh data
    if (age < ttl) {
      return cached.data
    }

    // Return stale data and revalidate in background
    if (age < ttl + staleTime) {
      // Revalidate in background
      fn().then(async (fresh) => {
        await cache.set(key, { data: fresh, timestamp: Date.now() }, ttl + staleTime)
      }).catch(console.error)

      return cached.data
    }
  }

  // No cache or expired, fetch fresh
  const fresh = await fn()
  await cache.set(key, { data: fresh, timestamp: Date.now() }, ttl + staleTime)
  
  return fresh
}