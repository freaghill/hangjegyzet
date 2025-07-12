import { caching, MemoryCache, MultiCache } from 'cache-manager'
import { redisStore } from 'cache-manager-ioredis'
import Redis from 'ioredis'
import { redisClients } from './redis-sentinel'

// Types
export interface CacheConfig {
  ttl?: number // Time to live in seconds
  refreshThreshold?: number // Refresh cache when TTL is below this threshold
  tags?: string[] // Cache tags for invalidation
}

// Default configuration
const DEFAULT_TTL = 3600 // 1 hour
const DEFAULT_REFRESH_THRESHOLD = 300 // 5 minutes
const CACHE_VERSION = 1

// Create cache store based on environment
async function createCacheStore() {
  if (process.env.NODE_ENV === 'production' && redisClients.cache) {
    // Use existing Redis Sentinel client in production
    return redisStore({
      redisInstance: redisClients.cache as any,
      ttl: DEFAULT_TTL,
    })
  } else if (process.env.REDIS_HOST) {
    // Use standalone Redis for development
    const redisInstance = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: `v${CACHE_VERSION}:cache:`,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    })

    return redisStore({
      redisInstance,
      ttl: DEFAULT_TTL,
    })
  } else {
    // Fallback to memory cache
    return 'memory'
  }
}

// Create multi-tier cache (memory + redis)
export const cache = await caching(await createCacheStore(), {
  max: 500, // Max items in memory cache
  ttl: DEFAULT_TTL * 1000, // Convert to milliseconds for memory cache
})

// Create a separate memory cache for hot data
export const memoryCache = await caching('memory', {
  max: 100,
  ttl: 60 * 1000, // 1 minute for hot data
})

// Multi-tier cache with memory as L1 and Redis as L2
export const multiCache = await caching([memoryCache, cache])

/**
 * Enhanced cache manager with all features from the old implementation
 */
export class CacheManager {
  private static instance: CacheManager

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  /**
   * Get or set cache with automatic fallback
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig = {}
  ): Promise<T> {
    const ttl = config.ttl || DEFAULT_TTL

    try {
      // Check cache
      const cached = await cache.get<T>(key)
      
      if (cached !== undefined) {
        // Check if we should refresh in background
        if (config.refreshThreshold) {
          const ttlRemaining = await this.getTTL(key)
          if (ttlRemaining > 0 && ttlRemaining < config.refreshThreshold) {
            // Refresh in background
            this.refreshInBackground(key, fetcher, ttl)
          }
        }
        return cached
      }

      // Fetch fresh data
      const data = await fetcher()
      
      // Store in cache with tags
      await this.set(key, data, ttl, config.tags)
      
      return data
    } catch (error) {
      console.error('Cache error:', error)
      // Fallback to fetcher on any cache error
      return fetcher()
    }
  }

  /**
   * Set cache value with tags
   */
  async set<T>(key: string, value: T, ttl?: number, tags?: string[]): Promise<void> {
    await cache.set(key, value, ttl || DEFAULT_TTL)
    
    // Store tags for invalidation
    if (tags && tags.length > 0) {
      const redis = this.getRedisClient()
      if (redis) {
        const tagPromises = tags.map(tag => 
          redis.sadd(`tag:${tag}`, key)
        )
        await Promise.all(tagPromises)
      }
    }
  }

  /**
   * Get cache value
   */
  async get<T>(key: string): Promise<T | undefined> {
    return cache.get<T>(key)
  }

  /**
   * Delete cache value
   */
  async delete(key: string): Promise<void> {
    await cache.del(key)
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const redis = this.getRedisClient()
    if (!redis) {
      // For memory cache, we can't do pattern matching
      await cache.reset()
      return
    }

    const keys = await redis.keys(`v${CACHE_VERSION}:cache:${pattern}`)
    if (keys.length > 0) {
      // Remove prefix before passing to cache.del
      const cacheKeys = keys.map(k => k.replace(`v${CACHE_VERSION}:cache:`, ''))
      await Promise.all(cacheKeys.map(k => cache.del(k)))
    }
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateTag(tag: string): Promise<void> {
    const redis = this.getRedisClient()
    if (!redis) {
      await cache.reset()
      return
    }

    const keys = await redis.smembers(`tag:${tag}`)
    if (keys.length > 0) {
      await Promise.all(keys.map(k => cache.del(k)))
      await redis.del(`tag:${tag}`)
    }
  }

  /**
   * Warm cache with multiple values
   */
  async warmCache<T>(items: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    await Promise.all(
      items.map(item => cache.set(item.key, item.value, item.ttl || DEFAULT_TTL))
    )
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    hits: number
    misses: number
    keys: number
    memory?: number
  }> {
    const redis = this.getRedisClient()
    if (!redis) {
      return { hits: 0, misses: 0, keys: 0 }
    }

    const info = await redis.info('stats')
    const keyspace = await redis.info('keyspace')
    
    // Parse Redis info
    const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0')
    const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0')
    const keys = parseInt(keyspace.match(/keys=(\d+)/)?.[1] || '0')
    const memory = parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0')

    return { hits, misses, keys, memory }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    await cache.reset()
  }

  // Private helpers

  private getRedisClient(): Redis | null {
    if (redisClients.cache) {
      return redisClients.cache as any
    }
    
    // Try to get from cache store
    const store = (cache as any).store
    if (store && store.getClient) {
      return store.getClient()
    }
    
    return null
  }

  private async getTTL(key: string): Promise<number> {
    const redis = this.getRedisClient()
    if (!redis) return -1
    
    return redis.ttl(`v${CACHE_VERSION}:cache:${key}`)
  }

  private async refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<void> {
    // Don't await, let it run in background
    fetcher()
      .then(data => cache.set(key, data, ttl))
      .catch(err => console.error('Background refresh failed:', err))
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance()

// Domain-specific cache helpers
export const CacheKeys = {
  // Meeting related
  meeting: (id: string) => `meeting:${id}`,
  meetingList: (orgId: string, page: number = 1) => `meetings:${orgId}:page:${page}`,
  meetingTranscript: (id: string) => `transcript:${id}`,
  meetingInsights: (id: string) => `insights:${id}`,
  meetingExport: (id: string, format: string) => `export:${id}:${format}`,
  
  // User related
  userProfile: (id: string) => `user:${id}`,
  userMeetings: (id: string, page: number = 1) => `user:${id}:meetings:${page}`,
  userPermissions: (id: string) => `user:${id}:permissions`,
  userSettings: (id: string) => `user:${id}:settings`,
  
  // Organization related
  organization: (id: string) => `org:${id}`,
  orgStats: (id: string) => `org:${id}:stats`,
  orgMembers: (id: string) => `org:${id}:members`,
  orgBranding: (id: string) => `org:${id}:branding`,
  orgUsage: (id: string, period: string) => `org:${id}:usage:${period}`,
  
  // Search related
  searchResults: (query: string, orgId: string) => `search:${orgId}:${query}`,
  
  // API related
  apiResponse: (endpoint: string, params: string) => `api:${endpoint}:${params}`,
  rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
} as const

// Cache invalidation helpers
export async function invalidateMeetingCache(meetingId: string): Promise<void> {
  await Promise.all([
    cacheManager.delete(CacheKeys.meeting(meetingId)),
    cacheManager.delete(CacheKeys.meetingTranscript(meetingId)),
    cacheManager.delete(CacheKeys.meetingInsights(meetingId)),
    cacheManager.invalidatePattern(`export:${meetingId}:*`),
  ])
}

export async function invalidateUserCache(userId: string): Promise<void> {
  await cacheManager.invalidatePattern(`user:${userId}:*`)
}

export async function invalidateOrgCache(orgId: string): Promise<void> {
  await cacheManager.invalidatePattern(`org:${orgId}:*`)
  await cacheManager.invalidatePattern(`meetings:${orgId}:*`)
}

// Export convenience functions
export const getCache = cacheManager.get.bind(cacheManager)
export const setCache = cacheManager.set.bind(cacheManager)
export const deleteCache = cacheManager.delete.bind(cacheManager)
export const clearCache = cacheManager.clear.bind(cacheManager)