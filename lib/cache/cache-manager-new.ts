import { caching, MemoryCache } from 'cache-manager';
import { redisStore } from 'cache-manager-ioredis';
import Redis from 'ioredis';

// Create Redis instance
const redisInstance = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  keyPrefix: 'cache:',
});

// Create cache instance
export const cache = await caching(
  process.env.NODE_ENV === 'production' 
    ? redisStore({
        redisInstance,
        ttl: 600, // 10 minutes default
      })
    : 'memory',
  {
    max: 100, // Max items in memory cache
    ttl: 600 * 1000, // 10 minutes in milliseconds for memory cache
  }
);

// Helper functions for type safety
export async function getCache<T>(key: string): Promise<T | undefined> {
  return await cache.get<T>(key);
}

export async function setCache<T>(
  key: string, 
  value: T, 
  ttl?: number
): Promise<void> {
  await cache.set(key, value, ttl);
}

export async function deleteCache(key: string): Promise<void> {
  await cache.del(key);
}

export async function clearCache(): Promise<void> {
  await cache.reset();
}

// Wrap function with caching
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number = 600
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    
    // Try to get from cache
    const cached = await getCache<ReturnType<T>>(key);
    if (cached !== undefined) {
      return cached;
    }
    
    // Execute function
    const result = await fn(...args);
    
    // Store in cache
    await setCache(key, result, ttl);
    
    return result;
  }) as T;
}

// Cache decorators for common use cases
export const CacheKeys = {
  meeting: (id: string) => `meeting:${id}`,
  userMeetings: (userId: string) => `user:${userId}:meetings`,
  orgStats: (orgId: string) => `org:${orgId}:stats`,
  transcription: (meetingId: string) => `transcription:${meetingId}`,
  aiInsights: (meetingId: string) => `ai:insights:${meetingId}`,
  searchResults: (query: string, orgId: string) => `search:${orgId}:${query}`,
} as const;

// Invalidation helpers
export async function invalidateUserCache(userId: string): Promise<void> {
  const pattern = `user:${userId}:*`;
  if (process.env.NODE_ENV === 'production') {
    const keys = await redisInstance.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redisInstance.del(...keys);
    }
  } else {
    // For memory cache, we need to clear everything related
    await cache.reset(); // Simple approach for dev
  }
}

export async function invalidateMeetingCache(meetingId: string): Promise<void> {
  await Promise.all([
    deleteCache(CacheKeys.meeting(meetingId)),
    deleteCache(CacheKeys.transcription(meetingId)),
    deleteCache(CacheKeys.aiInsights(meetingId)),
  ]);
}

export async function invalidateOrgCache(orgId: string): Promise<void> {
  await deleteCache(CacheKeys.orgStats(orgId));
  // In production, clear all org-related keys
  if (process.env.NODE_ENV === 'production') {
    const keys = await redisInstance.keys(`cache:org:${orgId}:*`);
    if (keys.length > 0) {
      await redisInstance.del(...keys);
    }
  }
}