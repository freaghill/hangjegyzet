import { createClient } from '@/lib/supabase/server'
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
      const { data: { user } } = await this.supabase.auth.getUser()
      
      await this.supabase.from('analytics_events').insert({
        user_id: event.userId || user?.id,
        team_id: event.teamId,
        event_type: event.eventType,
        event_name: event.eventName,
        properties: event.properties || {}
      })
    } catch (error) {
      console.error('Track event error:', error)
    }
  }

  async trackPerformance(metric: PerformanceMetric): Promise<void> {
    try {
      await this.supabase.from('performance_metrics').insert({
        metric_type: metric.metricType,
        metric_name: metric.metricName,
        value: metric.value,
        unit: metric.unit,
        metadata: metric.metadata || {}
      })
    } catch (error) {
      console.error('Track performance error:', error)
    }
  }

  async updateBusinessMetric(metric: BusinessMetric): Promise<void> {
    try {
      await this.supabase.from('business_metrics').upsert({
        metric_date: metric.metricDate.toISOString().split('T')[0],
        metric_type: metric.metricType,
        metric_name: metric.metricName,
        value: metric.value,
        metadata: metric.metadata || {}
      }, {
        onConflict: 'metric_date,metric_type,metric_name'
      })
    } catch (error) {
      console.error('Update business metric error:', error)
    }
  }

  // Usage Analytics
  async getUsageStats(days: number = 30): Promise<UsageStats> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    try {
      // Get user stats
      const { count: totalUsers } = await this.supabase
        .from('auth.users')
        .select('*', { count: 'exact', head: true })

      const { count: dailyActive } = await this.supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      const { count: weeklyActive } = await this.supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      const { count: monthlyActive } = await this.supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      // Get meeting stats
      const { data: meetings, count: totalMeetings } = await this.supabase
        .from('meetings')
        .select('duration_seconds, status', { count: 'exact' })

      const meetingStats = meetings?.reduce((acc, meeting) => {
        acc.totalDuration += meeting.duration_seconds || 0
        acc.byStatus[meeting.status] = (acc.byStatus[meeting.status] || 0) + 1
        return acc
      }, {
        totalDuration: 0,
        byStatus: {} as Record<string, number>
      })

      // Get transcription stats
      const { data: transcriptions } = await this.supabase
        .from('meetings')
        .select('transcript, metadata, language')
        .eq('status', 'completed')
        .not('transcript', 'is', null)

      const transcriptionStats = transcriptions?.reduce((acc, meeting) => {
        const wordCount = meeting.transcript?.text?.split(/\s+/).length || 0
        acc.totalWords += wordCount
        acc.byLanguage[meeting.language || 'unknown'] = (acc.byLanguage[meeting.language || 'unknown'] || 0) + 1
        const mode = meeting.metadata?.transcriptionMode || 'unknown'
        acc.byMode[mode] = (acc.byMode[mode] || 0) + 1
        return acc
      }, {
        totalWords: 0,
        byLanguage: {} as Record<string, number>,
        byMode: {} as Record<string, number>
      })

      // Get team stats
      const { count: totalTeams } = await this.supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })

      const { data: teamMembers } = await this.supabase
        .from('team_members')
        .select('team_id')

      const teamSizes = teamMembers?.reduce((acc, member) => {
        acc[member.team_id] = (acc[member.team_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const averageTeamSize = Object.values(teamSizes || {}).reduce((a, b) => a + b, 0) / (Object.keys(teamSizes || {}).length || 1)

      return {
        totalUsers: totalUsers || 0,
        activeUsers: {
          daily: dailyActive || 0,
          weekly: weeklyActive || 0,
          monthly: monthlyActive || 0
        },
        newUsers: {
          daily: 0, // TODO: Implement
          weekly: 0,
          monthly: 0
        },
        meetings: {
          total: totalMeetings || 0,
          totalDuration: meetingStats?.totalDuration || 0,
          averageDuration: (meetingStats?.totalDuration || 0) / (totalMeetings || 1),
          byStatus: meetingStats?.byStatus || {}
        },
        transcriptions: {
          total: transcriptions?.length || 0,
          totalWords: transcriptionStats?.totalWords || 0,
          byLanguage: transcriptionStats?.byLanguage || {},
          byMode: transcriptionStats?.byMode || {}
        },
        teams: {
          total: totalTeams || 0,
          averageSize: averageTeamSize,
          activeTeams: Object.keys(teamSizes || {}).length
        }
      }
    } catch (error) {
      console.error('Get usage stats error:', error)
      throw error
    }
  }

  // Performance Analytics
  async getPerformanceStats(hours: number = 24): Promise<PerformanceStats> {
    const startDate = new Date()
    startDate.setHours(startDate.getHours() - hours)

    try {
      const { data: metrics } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .gte('created_at', startDate.toISOString())

      const grouped = metrics?.reduce((acc, metric) => {
        if (!acc[metric.metric_type]) {
          acc[metric.metric_type] = []
        }
        acc[metric.metric_type].push(metric)
        return acc
      }, {} as Record<string, any[]>)

      // Calculate averages
      const calculateAverage = (metrics: any[], field: string) => {
        const values = metrics.filter(m => m.metric_name === field).map(m => m.value)
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
      }

      return {
        transcription: {
          averageTime: calculateAverage(grouped?.transcription || [], 'processing_time'),
          successRate: calculateAverage(grouped?.transcription || [], 'success_rate'),
          queueLength: calculateAverage(grouped?.transcription || [], 'queue_length'),
          processingSpeed: calculateAverage(grouped?.transcription || [], 'words_per_minute')
        },
        upload: {
          averageTime: calculateAverage(grouped?.upload || [], 'upload_time'),
          averageSize: calculateAverage(grouped?.upload || [], 'file_size'),
          successRate: calculateAverage(grouped?.upload || [], 'success_rate'),
          bandwidth: calculateAverage(grouped?.upload || [], 'bandwidth')
        },
        search: {
          averageLatency: calculateAverage(grouped?.search || [], 'latency'),
          queriesPerMinute: calculateAverage(grouped?.search || [], 'qpm'),
          cacheHitRate: calculateAverage(grouped?.search || [], 'cache_hit_rate')
        },
        api: {
          averageLatency: calculateAverage(grouped?.api_call || [], 'latency'),
          requestsPerMinute: calculateAverage(grouped?.api_call || [], 'rpm'),
          errorRate: calculateAverage(grouped?.api_call || [], 'error_rate'),
          uptime: 99.9 // TODO: Calculate from real data
        }
      }
    } catch (error) {
      console.error('Get performance stats error:', error)
      throw error
    }
  }

  // Business Analytics
  async getBusinessStats(days: number = 30): Promise<BusinessStats> {
    try {
      const { data: metrics } = await this.supabase
        .from('business_metrics')
        .select('*')
        .gte('metric_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

      const grouped = metrics?.reduce((acc, metric) => {
        if (!acc[metric.metric_type]) {
          acc[metric.metric_type] = {}
        }
        acc[metric.metric_type][metric.metric_name] = metric.value
        return acc
      }, {} as Record<string, Record<string, number>>)

      // Get usage data
      const { data: events } = await this.supabase
        .from('analytics_events')
        .select('event_name, created_at')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

      const featureUsage = events?.reduce((acc, event) => {
        acc[event.event_name] = (acc[event.event_name] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topFeatures = Object.entries(featureUsage || {})
        .map(([feature, usage]) => ({ feature, usage }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 10)

      // Get search data
      const { data: searches } = await this.supabase
        .from('search_queries')
        .select('query')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

      const searchCounts = searches?.reduce((acc, search) => {
        acc[search.query] = (acc[search.query] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topSearchQueries = Object.entries(searchCounts || {})
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      return {
        growth: {
          userGrowthRate: grouped?.growth?.user_growth || 0,
          meetingGrowthRate: grouped?.growth?.meeting_growth || 0,
          revenueGrowthRate: grouped?.growth?.revenue_growth
        },
        engagement: {
          dau: grouped?.engagement?.dau || 0,
          wau: grouped?.engagement?.wau || 0,
          mau: grouped?.engagement?.mau || 0,
          stickiness: (grouped?.engagement?.dau || 0) / (grouped?.engagement?.mau || 1),
          sessionDuration: grouped?.engagement?.session_duration || 0,
          sessionsPerUser: grouped?.engagement?.sessions_per_user || 0
        },
        retention: {
          day1: grouped?.retention?.day1 || 0,
          day7: grouped?.retention?.day7 || 0,
          day30: grouped?.retention?.day30 || 0,
          churnRate: grouped?.retention?.churn_rate || 0
        },
        conversion: {
          signupToFirstMeeting: grouped?.conversion?.signup_to_first_meeting || 0,
          freeToProConversion: grouped?.conversion?.free_to_pro,
          inviteAcceptanceRate: grouped?.conversion?.invite_acceptance || 0
        },
        usage: {
          topFeatures,
          topSearchQueries,
          peakUsageHours: [], // TODO: Calculate from event timestamps
          averageMeetingsPerUser: grouped?.usage?.avg_meetings_per_user || 0
        }
      }
    } catch (error) {
      console.error('Get business stats error:', error)
      throw error
    }
  }

  // Real-time metrics
  async getRealtimeMetrics(): Promise<{
    activeUsers: number
    activeTranscriptions: number
    queuedJobs: number
    systemLoad: number
  }> {
    try {
      // Get active users (last 5 minutes)
      const { count: activeUsers } = await this.supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())

      // Get active transcriptions
      const { count: activeTranscriptions } = await this.supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'processing')

      // TODO: Get queued jobs from BullMQ
      const queuedJobs = 0

      // TODO: Calculate system load
      const systemLoad = 0

      return {
        activeUsers: activeUsers || 0,
        activeTranscriptions: activeTranscriptions || 0,
        queuedJobs,
        systemLoad
      }
    } catch (error) {
      console.error('Get realtime metrics error:', error)
      throw error
    }
  }
}