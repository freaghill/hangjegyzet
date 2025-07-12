/**
 * Examples of using the new cache manager throughout the application
 */

import { cacheManager, CacheKeys, invalidateMeetingCache, multiCache } from './index'
import { createClient } from '@/lib/supabase/server'

/**
 * Example 1: Caching meeting data
 */
export async function getMeetingWithCache(meetingId: string) {
  return cacheManager.getOrSet(
    CacheKeys.meeting(meetingId),
    async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('meetings')
        .select('*, organization:organizations(*)')
        .eq('id', meetingId)
        .single()
      
      if (error) throw error
      return data
    },
    {
      ttl: 3600, // 1 hour
      tags: ['meeting', `org:${meetingId}`],
      refreshThreshold: 300, // Refresh if less than 5 minutes left
    }
  )
}

/**
 * Example 2: Caching expensive AI insights
 */
export async function getAIInsightsWithCache(meetingId: string) {
  return cacheManager.getOrSet(
    CacheKeys.meetingInsights(meetingId),
    async () => {
      // Expensive AI processing
      const insights = await generateAIInsights(meetingId)
      return insights
    },
    {
      ttl: 86400, // 24 hours - insights don't change
      tags: ['ai-insights', `meeting:${meetingId}`],
    }
  )
}

/**
 * Example 3: Using multi-tier cache for hot data
 */
export async function getOrganizationStats(orgId: string) {
  // Use multi-tier cache for frequently accessed data
  return multiCache.wrap(
    CacheKeys.orgStats(orgId),
    async () => {
      const supabase = await createClient()
      
      // Complex aggregation query
      const [meetings, users, usage] = await Promise.all([
        supabase.from('meetings').select('count').eq('organization_id', orgId),
        supabase.from('organization_members').select('count').eq('organization_id', orgId),
        supabase.rpc('get_organization_usage', { org_id: orgId }),
      ])
      
      return {
        totalMeetings: meetings.data?.[0]?.count || 0,
        totalUsers: users.data?.[0]?.count || 0,
        monthlyUsage: usage.data || {},
      }
    },
    600 // 10 minutes TTL
  )
}

/**
 * Example 4: Rate limiting with cache
 */
export async function checkRateLimit(ip: string, endpoint: string, limit: number = 10) {
  const key = CacheKeys.rateLimit(ip, endpoint)
  
  // Get current count
  const current = await cacheManager.get<number>(key) || 0
  
  if (current >= limit) {
    return { allowed: false, remaining: 0 }
  }
  
  // Increment and set TTL to 1 minute
  await cacheManager.set(key, current + 1, 60)
  
  return { allowed: true, remaining: limit - current - 1 }
}

/**
 * Example 5: Search results caching with invalidation
 */
export async function searchMeetingsWithCache(query: string, orgId: string) {
  return cacheManager.getOrSet(
    CacheKeys.searchResults(query, orgId),
    async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('organization_id', orgId)
        .textSearch('transcript', query)
        .limit(20)
      
      if (error) throw error
      return data
    },
    {
      ttl: 1800, // 30 minutes
      tags: [`search:${orgId}`, 'search-results'],
    }
  )
}

/**
 * Example 6: Cache warming for dashboard
 */
export async function warmDashboardCache(userId: string, orgId: string) {
  const items = [
    {
      key: CacheKeys.userProfile(userId),
      value: await fetchUserProfile(userId),
      ttl: 3600,
    },
    {
      key: CacheKeys.organization(orgId),
      value: await fetchOrganization(orgId),
      ttl: 3600,
    },
    {
      key: CacheKeys.orgStats(orgId),
      value: await fetchOrgStats(orgId),
      ttl: 600,
    },
  ]
  
  await cacheManager.warmCache(items)
}

/**
 * Example 7: Invalidation after updates
 */
export async function updateMeeting(meetingId: string, updates: any) {
  const supabase = await createClient()
  
  // Update in database
  const { error } = await supabase
    .from('meetings')
    .update(updates)
    .eq('id', meetingId)
  
  if (error) throw error
  
  // Invalidate all related caches
  await invalidateMeetingCache(meetingId)
  
  // Also invalidate search results for the organization
  const meeting = await getMeetingWithCache(meetingId)
  if (meeting?.organization_id) {
    await cacheManager.invalidateTag(`search:${meeting.organization_id}`)
  }
}

/**
 * Example 8: Using cache for expensive exports
 */
export async function getExportWithCache(meetingId: string, format: string) {
  const key = CacheKeys.meetingExport(meetingId, format)
  
  // Check if we have a recent export
  const cached = await cacheManager.get<{ url: string; generatedAt: string }>(key)
  
  if (cached) {
    const age = Date.now() - new Date(cached.generatedAt).getTime()
    if (age < 3600000) { // Less than 1 hour old
      return cached.url
    }
  }
  
  // Generate new export
  const url = await generateExport(meetingId, format)
  
  await cacheManager.set(
    key,
    { url, generatedAt: new Date().toISOString() },
    3600 // 1 hour
  )
  
  return url
}

// Dummy functions for examples
async function generateAIInsights(meetingId: string) {
  return { summary: 'AI generated summary', keyPoints: [] }
}

async function fetchUserProfile(userId: string) {
  return { id: userId, name: 'User' }
}

async function fetchOrganization(orgId: string) {
  return { id: orgId, name: 'Organization' }
}

async function fetchOrgStats(orgId: string) {
  return { meetings: 0, users: 0 }
}

async function generateExport(meetingId: string, format: string) {
  return `https://example.com/export/${meetingId}.${format}`
}