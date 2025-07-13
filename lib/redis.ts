import { Redis } from '@upstash/redis'
import { env } from '@/lib/config/environment'

// Create Redis client instance
export const redis = env.hasRedis() 
  ? new Redis({
      url: env.get('UPSTASH_REDIS_REST_URL'),
      token: env.get('UPSTASH_REDIS_REST_TOKEN'),
    })
  : null

// Helper functions for common Redis operations
export const redisHelpers = {
  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null
    try {
      return await redis.get<T>(key)
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  },

  async set(key: string, value: any, expirySeconds?: number): Promise<boolean> {
    if (!redis) return false
    try {
      if (expirySeconds) {
        await redis.setex(key, expirySeconds, value)
      } else {
        await redis.set(key, value)
      }
      return true
    } catch (error) {
      console.error('Redis set error:', error)
      return false
    }
  },

  async del(key: string): Promise<boolean> {
    if (!redis) return false
    try {
      await redis.del(key)
      return true
    } catch (error) {
      console.error('Redis del error:', error)
      return false
    }
  },

  async incr(key: string): Promise<number | null> {
    if (!redis) return null
    try {
      return await redis.incr(key)
    } catch (error) {
      console.error('Redis incr error:', error)
      return null
    }
  },

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!redis) return false
    try {
      await redis.expire(key, seconds)
      return true
    } catch (error) {
      console.error('Redis expire error:', error)
      return false
    }
  },

  async ttl(key: string): Promise<number | null> {
    if (!redis) return null
    try {
      return await redis.ttl(key)
    } catch (error) {
      console.error('Redis ttl error:', error)
      return null
    }
  }
}

// Export as upstashRedis for compatibility
export const upstashRedis = redis