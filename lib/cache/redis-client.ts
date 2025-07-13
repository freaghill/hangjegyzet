import Redis from 'ioredis'
import { LRUCache } from 'lru-cache'

// Redis client singleton
let redis: Redis | null = null

// In-memory cache for development
const memoryCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes default TTL
})

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not configured, using in-memory cache')
    return null
  }

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY'
        if (err.message.includes(targetError)) {
          return true
        }
        return false
      },
    })

    redis.on('error', (err) => {
      console.error('Redis Client Error:', err)
    })

    redis.on('connect', () => {
      console.log('Redis Client Connected')
    })
  }

  return redis
}

// Unified cache interface
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient()
    
    if (!client) {
      return memoryCache.get(key) || null
    }

    try {
      const value = await client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const client = getRedisClient()
    
    if (!client) {
      memoryCache.set(key, value, { ttl: (ttlSeconds || 300) * 1000 })
      return
    }

    try {
      const serialized = JSON.stringify(value)
      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, serialized)
      } else {
        await client.set(key, serialized)
      }
    } catch (error) {
      console.error('Cache set error:', error)
    }
  },

  async del(key: string | string[]): Promise<void> {
    const client = getRedisClient()
    
    if (!client) {
      if (Array.isArray(key)) {
        key.forEach(k => memoryCache.delete(k))
      } else {
        memoryCache.delete(key)
      }
      return
    }

    try {
      await client.del(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  },

  async flush(): Promise<void> {
    const client = getRedisClient()
    
    if (!client) {
      memoryCache.clear()
      return
    }

    try {
      await client.flushdb()
    } catch (error) {
      console.error('Cache flush error:', error)
    }
  },

  // Pattern-based deletion
  async delPattern(pattern: string): Promise<void> {
    const client = getRedisClient()
    
    if (!client) {
      // For memory cache, delete all keys matching pattern
      for (const key of memoryCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          memoryCache.delete(key)
        }
      }
      return
    }

    try {
      const keys = await client.keys(pattern)
      if (keys.length > 0) {
        await client.del(keys)
      }
    } catch (error) {
      console.error('Cache pattern delete error:', error)
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    const client = getRedisClient()
    
    if (!client) {
      return memoryCache.has(key)
    }

    try {
      const exists = await client.exists(key)
      return exists === 1
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  },

  // Get remaining TTL
  async ttl(key: string): Promise<number> {
    const client = getRedisClient()
    
    if (!client) {
      const item = memoryCache.get(key)
      if (!item) return -1
      const ttl = memoryCache.getRemainingTTL(key)
      return Math.floor(ttl / 1000)
    }

    try {
      return await client.ttl(key)
    } catch (error) {
      console.error('Cache TTL error:', error)
      return -1
    }
  },
}

// Cache key generators
export const cacheKeys = {
  // User-specific keys
  userProfile: (userId: string) => `user:profile:${userId}`,
  userTeams: (userId: string) => `user:teams:${userId}`,
  userMeetings: (userId: string, page: number = 1) => `user:meetings:${userId}:page:${page}`,
  
  // Team-specific keys
  teamData: (teamId: string) => `team:data:${teamId}`,
  teamMembers: (teamId: string) => `team:members:${teamId}`,
  teamMeetings: (teamId: string, page: number = 1) => `team:meetings:${teamId}:page:${page}`,
  
  // Meeting-specific keys
  meetingData: (meetingId: string) => `meeting:data:${meetingId}`,
  meetingTranscript: (meetingId: string) => `meeting:transcript:${meetingId}`,
  meetingAnalytics: (meetingId: string) => `meeting:analytics:${meetingId}`,
  
  // Search keys
  searchResults: (query: string, filters: string) => `search:${query}:${filters}`,
  searchSuggestions: (prefix: string) => `search:suggestions:${prefix}`,
  
  // Analytics keys
  analyticsUsage: (teamId: string, period: string) => `analytics:usage:${teamId}:${period}`,
  analyticsPerformance: (period: string) => `analytics:performance:${period}`,
  analyticsBusiness: (teamId: string, period: string) => `analytics:business:${teamId}:${period}`,
  
  // System keys
  systemConfig: () => 'system:config',
  featureFlags: () => 'system:feature-flags',
}

// Cache invalidation helpers
export const cacheInvalidation = {
  // Invalidate all user-related cache
  async invalidateUser(userId: string): Promise<void> {
    await cache.delPattern(`user:*:${userId}:*`)
  },

  // Invalidate all team-related cache
  async invalidateTeam(teamId: string): Promise<void> {
    await cache.delPattern(`team:*:${teamId}:*`)
  },

  // Invalidate meeting and related caches
  async invalidateMeeting(meetingId: string, teamId?: string, userId?: string): Promise<void> {
    await cache.del([
      cacheKeys.meetingData(meetingId),
      cacheKeys.meetingTranscript(meetingId),
      cacheKeys.meetingAnalytics(meetingId),
    ])
    
    if (teamId) {
      await cache.delPattern(`team:meetings:${teamId}:*`)
    }
    
    if (userId) {
      await cache.delPattern(`user:meetings:${userId}:*`)
    }
  },

  // Invalidate search cache
  async invalidateSearch(): Promise<void> {
    await cache.delPattern('search:*')
  },

  // Invalidate analytics cache
  async invalidateAnalytics(teamId?: string): Promise<void> {
    if (teamId) {
      await cache.delPattern(`analytics:*:${teamId}:*`)
    } else {
      await cache.delPattern('analytics:*')
    }
  },
}