import { createClient } from '@/lib/supabase/client'
import { 
  AnalyticsEvent, 
  PerformanceMetric, 
  BusinessMetric,
  UsageStats,
  PerformanceStats,
  BusinessStats
} from './types'

export class AnalyticsService {
  private supabase

  constructor() {
    this.supabase = createClient()
  }

  // Event Tracking
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('analytics_events')
        .insert(event)
      
      if (error) throw error
    } catch (error) {
      console.error('Failed to track event:', error)
    }
  }

  // Get usage statistics
  async getUsageStats(organizationId: string, timeRange: 'day' | 'week' | 'month' = 'month'): Promise<UsageStats | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_usage_stats', {
          org_id: organizationId,
          time_range: timeRange
        })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to get usage stats:', error)
      return null
    }
  }

  // Get performance statistics
  async getPerformanceStats(organizationId: string, timeRange: 'day' | 'week' | 'month' = 'month'): Promise<PerformanceStats | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_performance_stats', {
          org_id: organizationId,
          time_range: timeRange
        })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to get performance stats:', error)
      return null
    }
  }

  // Get business statistics
  async getBusinessStats(organizationId: string, timeRange: 'day' | 'week' | 'month' = 'month'): Promise<BusinessStats | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_business_stats', {
          org_id: organizationId,
          time_range: timeRange
        })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to get business stats:', error)
      return null
    }
  }
}