import { redis, redisHelpers } from '@/lib/redis'
import { createClient } from '@/lib/supabase/server'
import { redisClients } from './redis-sentinel'

interface CacheConfig {
  ttl: number // Time to live in seconds
  prefix: string
  version?: number
}

export class CacheManager {
  private static instance: CacheManager
  private defaultTTL = 3600 // 1 hour
  private cacheVersion = 1

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  private getCacheKey(prefix: string, key: string, version?: number): string {
    const v = version || this.cacheVersion
    return `v${v}:${prefix}:${key}`
  }

  private getCacheTags(tags: string[]): string[] {
    return tags.map(tag => `tag:${tag}`)
  }

  /**
   * Get from cache with automatic fallback
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: Partial<CacheConfig> = {}
  ): Promise<T> {
    try {
      const cacheKey = this.getCacheKey(config.prefix || 'app', key, config.version)
      const ttl = config.ttl || this.defaultTTL

      // Try to get from cache first
      const cached = await redisHelpers.get<T>(cacheKey)
      if (cached !== null) {
        return cached
      }

      // Fetch fresh data
      const data = await fetcher()
      
      // Store in cache (non-blocking)
      redisHelpers.set(cacheKey, data, ttl).catch(err => 
        console.error('Cache set error:', err)
      )
      
      return data
    } catch (error) {
      // If Redis fails, fallback to fetcher
      console.error('Cache error, falling back to fetcher:', error)
      return fetcher()
    }
  }

  /**
   * Invalidate cache by key
   */
  async invalidate(key: string, prefix: string = 'app'): Promise<void> {
    const cacheKey = this.getCacheKey(prefix, key)
    await redisHelpers.del(cacheKey)
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!redis) return
    
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error('Cache invalidation error:', error)
    }
  }

  /**
   * Cache for meeting data
   */
  async getMeeting(meetingId: string): Promise<any> {
    return this.getOrSet(
      meetingId,
      async () => {
        const supabase = await createClient()
        const { data, error } = await supabase
          .from('meetings')
          .select('*')
          .eq('id', meetingId)
          .single()
        
        if (error) throw error
        return data
      },
      { prefix: 'meeting', ttl: 600 } // 10 minutes
    )
  }

  /**
   * Cache for meeting insights
   */
  async getMeetingInsights(meetingId: string): Promise<any> {
    return this.getOrSet(
      `${meetingId}:insights`,
      async () => {
        const supabase = await createClient()
        const { data, error } = await supabase
          .from('meeting_insights')
          .select('*')
          .eq('meeting_id', meetingId)
          .single()
        
        return data || null
      },
      { prefix: 'meeting', ttl: 3600 } // 1 hour
    )
  }

  /**
   * Cache for organization settings
   */
  async getOrganizationSettings(organizationId: string): Promise<any> {
    return this.getOrSet(
      organizationId,
      async () => {
        const supabase = await createClient()
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .single()
        
        if (error) throw error
        return data
      },
      { prefix: 'org', ttl: 1800 } // 30 minutes
    )
  }

  /**
   * Cache for user permissions
   */
  async getUserPermissions(userId: string, organizationId: string): Promise<any> {
    return this.getOrSet(
      `${userId}:${organizationId}`,
      async () => {
        const supabase = await createClient()
        const { data, error } = await supabase
          .from('organization_members')
          .select('role')
          .eq('user_id', userId)
          .eq('organization_id', organizationId)
          .single()
        
        return data?.role || null
      },
      { prefix: 'perm', ttl: 300 } // 5 minutes
    )
  }

  /**
   * Cache for search results
   */
  async getSearchResults(query: string, filters: any): Promise<any> {
    const cacheKey = `${query}:${JSON.stringify(filters)}`
    return this.getOrSet(
      cacheKey,
      async () => {
        // Perform search operation
        const supabase = await createClient()
        // ... search logic here
        return []
      },
      { prefix: 'search', ttl: 300 } // 5 minutes
    )
  }

  /**
   * Cache for API responses
   */
  async cacheAPIResponse(
    endpoint: string,
    params: any,
    fetcher: () => Promise<any>,
    ttl: number = 300
  ): Promise<any> {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`
    return this.getOrSet(
      cacheKey,
      fetcher,
      { prefix: 'api', ttl }
    )
  }

  /**
   * Invalidate all caches for a meeting
   */
  async invalidateMeetingCaches(meetingId: string): Promise<void> {
    await Promise.all([
      this.invalidate(meetingId, 'meeting'),
      this.invalidate(`${meetingId}:insights`, 'meeting'),
      this.invalidate(`${meetingId}:transcripts`, 'meeting'),
      this.invalidatePattern(`*search*${meetingId}*`)
    ])
  }

  /**
   * Invalidate all caches for an organization
   */
  async invalidateOrganizationCaches(organizationId: string): Promise<void> {
    await Promise.all([
      this.invalidate(organizationId, 'org'),
      this.invalidatePattern(`*perm*:${organizationId}`),
      this.invalidatePattern(`*api*org*${organizationId}*`)
    ])
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(organizationId: string): Promise<void> {
    try {
      // Pre-fetch organization settings
      await this.getOrganizationSettings(organizationId)
      
      // Pre-fetch recent meetings
      const supabase = await createClient()
      const { data: meetings } = await supabase
        .from('meetings')
        .select('id')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (meetings) {
        await Promise.all(
          meetings.map(meeting => this.getMeeting(meeting.id))
        )
      }
    } catch (error) {
      console.error('Cache warm up error:', error)
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    if (!redis) return null
    
    try {
      const info = await redis.info()
      return {
        connected: true,
        info
      }
    } catch (error) {
      return {
        connected: false,
        error: error.message
      }
    }
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance()