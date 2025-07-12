import { CacheManager, CacheKeys, invalidateMeetingCache } from '@/lib/cache'
import { caching } from 'cache-manager'

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
    sadd: jest.fn(),
    smembers: jest.fn().mockResolvedValue([]),
    ttl: jest.fn().mockResolvedValue(300),
    info: jest.fn().mockResolvedValue('keyspace_hits:100\nkeyspace_misses:10\nused_memory:1048576'),
  }))
})

// Mock cache-manager
jest.mock('cache-manager', () => ({
  caching: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
    wrap: jest.fn(),
    store: {
      getClient: jest.fn(),
    },
  })),
}))

describe('CacheManager', () => {
  let cacheManager: CacheManager
  let mockCache: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    cacheManager = CacheManager.getInstance()
    mockCache = (caching as jest.Mock).mock.results[0]?.value
  })
  
  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const cachedData = { id: 1, name: 'Test' }
      mockCache.get.mockResolvedValue(cachedData)
      
      const fetcher = jest.fn()
      const result = await cacheManager.getOrSet('test-key', fetcher)
      
      expect(result).toEqual(cachedData)
      expect(fetcher).not.toHaveBeenCalled()
      expect(mockCache.get).toHaveBeenCalledWith('test-key')
    })
    
    it('should fetch and cache data if not cached', async () => {
      const freshData = { id: 1, name: 'Fresh' }
      mockCache.get.mockResolvedValue(undefined)
      
      const fetcher = jest.fn().mockResolvedValue(freshData)
      const result = await cacheManager.getOrSet('test-key', fetcher, { ttl: 600 })
      
      expect(result).toEqual(freshData)
      expect(fetcher).toHaveBeenCalled()
      expect(mockCache.set).toHaveBeenCalledWith('test-key', freshData, 600)
    })
    
    it('should handle cache errors gracefully', async () => {
      const freshData = { id: 1, name: 'Fallback' }
      mockCache.get.mockRejectedValue(new Error('Redis error'))
      
      const fetcher = jest.fn().mockResolvedValue(freshData)
      const result = await cacheManager.getOrSet('test-key', fetcher)
      
      expect(result).toEqual(freshData)
      expect(fetcher).toHaveBeenCalled()
    })
    
    it('should refresh cache in background when threshold reached', async () => {
      const cachedData = { id: 1, name: 'Stale' }
      const freshData = { id: 1, name: 'Fresh' }
      
      mockCache.get.mockResolvedValue(cachedData)
      const mockRedis = {
        ttl: jest.fn().mockResolvedValue(200), // Less than threshold
      }
      ;(cacheManager as any).getRedisClient = jest.fn().mockReturnValue(mockRedis)
      
      const fetcher = jest.fn().mockResolvedValue(freshData)
      
      const result = await cacheManager.getOrSet(
        'test-key',
        fetcher,
        { ttl: 3600, refreshThreshold: 300 }
      )
      
      expect(result).toEqual(cachedData) // Return cached immediately
      
      // Wait for background refresh
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(fetcher).toHaveBeenCalled()
    })
  })
  
  describe('invalidation', () => {
    it('should invalidate by key', async () => {
      await cacheManager.delete('test-key')
      expect(mockCache.del).toHaveBeenCalledWith('test-key')
    })
    
    it('should invalidate by pattern', async () => {
      const mockRedis = {
        keys: jest.fn().mockResolvedValue([
          'v1:cache:user:123:profile',
          'v1:cache:user:123:settings',
        ]),
      }
      ;(cacheManager as any).getRedisClient = jest.fn().mockReturnValue(mockRedis)
      
      await cacheManager.invalidatePattern('user:123:*')
      
      expect(mockRedis.keys).toHaveBeenCalledWith('v1:cache:user:123:*')
      expect(mockCache.del).toHaveBeenCalledWith('user:123:profile')
      expect(mockCache.del).toHaveBeenCalledWith('user:123:settings')
    })
    
    it('should invalidate by tag', async () => {
      const mockRedis = {
        smembers: jest.fn().mockResolvedValue(['meeting:123', 'meeting:124']),
        del: jest.fn(),
      }
      ;(cacheManager as any).getRedisClient = jest.fn().mockReturnValue(mockRedis)
      
      await cacheManager.invalidateTag('meeting')
      
      expect(mockRedis.smembers).toHaveBeenCalledWith('tag:meeting')
      expect(mockCache.del).toHaveBeenCalledWith('meeting:123')
      expect(mockCache.del).toHaveBeenCalledWith('meeting:124')
      expect(mockRedis.del).toHaveBeenCalledWith('tag:meeting')
    })
  })
  
  describe('statistics', () => {
    it('should return cache statistics', async () => {
      const mockRedis = {
        info: jest.fn()
          .mockResolvedValueOnce('keyspace_hits:150\nkeyspace_misses:50')
          .mockResolvedValueOnce('db0:keys=100,expires=50'),
      }
      ;(cacheManager as any).getRedisClient = jest.fn().mockReturnValue(mockRedis)
      
      const stats = await cacheManager.getStats()
      
      expect(stats).toEqual({
        hits: 150,
        misses: 50,
        keys: 100,
        memory: 0,
      })
    })
  })
  
  describe('cache warming', () => {
    it('should warm cache with multiple values', async () => {
      const items = [
        { key: 'key1', value: 'value1', ttl: 600 },
        { key: 'key2', value: 'value2', ttl: 1200 },
      ]
      
      await cacheManager.warmCache(items)
      
      expect(mockCache.set).toHaveBeenCalledWith('key1', 'value1', 600)
      expect(mockCache.set).toHaveBeenCalledWith('key2', 'value2', 1200)
    })
  })
})

describe('CacheKeys', () => {
  it('should generate correct cache keys', () => {
    expect(CacheKeys.meeting('123')).toBe('meeting:123')
    expect(CacheKeys.userProfile('456')).toBe('user:456')
    expect(CacheKeys.orgStats('789')).toBe('org:789:stats')
    expect(CacheKeys.searchResults('query', 'org1')).toBe('search:org1:query')
    expect(CacheKeys.rateLimit('127.0.0.1', '/api/test')).toBe('ratelimit:127.0.0.1:/api/test')
  })
})

describe('Cache Invalidation Helpers', () => {
  let cacheManager: CacheManager
  
  beforeEach(() => {
    cacheManager = CacheManager.getInstance()
    jest.spyOn(cacheManager, 'delete').mockResolvedValue()
    jest.spyOn(cacheManager, 'invalidatePattern').mockResolvedValue()
  })
  
  it('should invalidate all meeting-related caches', async () => {
    await invalidateMeetingCache('meet-123')
    
    expect(cacheManager.delete).toHaveBeenCalledWith('meeting:meet-123')
    expect(cacheManager.delete).toHaveBeenCalledWith('transcript:meet-123')
    expect(cacheManager.delete).toHaveBeenCalledWith('insights:meet-123')
    expect(cacheManager.invalidatePattern).toHaveBeenCalledWith('export:meet-123:*')
  })
})