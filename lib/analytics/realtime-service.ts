import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { RealtimeMetrics } from './types'

export class RealtimeAnalyticsService {
  private supabase
  private subscribers: Map<string, (metrics: RealtimeMetrics) => void> = new Map()
  private channel: any = null
  private updateInterval: NodeJS.Timeout | null = null

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  subscribe(id: string, callback: (metrics: RealtimeMetrics) => void) {
    this.subscribers.set(id, callback)
    
    // Start real-time updates if this is the first subscriber
    if (this.subscribers.size === 1) {
      this.startRealtimeUpdates()
    }
    
    // Send initial metrics
    this.fetchAndBroadcastMetrics()
  }

  unsubscribe(id: string) {
    this.subscribers.delete(id)
    
    // Stop updates if no more subscribers
    if (this.subscribers.size === 0) {
      this.stopRealtimeUpdates()
    }
  }

  private async startRealtimeUpdates() {
    // Subscribe to database changes for real-time metrics
    this.channel = this.supabase
      .channel('realtime-analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings'
        },
        () => {
          this.fetchAndBroadcastMetrics()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transcriptions'
        },
        () => {
          this.fetchAndBroadcastMetrics()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        () => {
          this.fetchAndBroadcastMetrics()
        }
      )
      .subscribe()

    // Also update metrics every 5 seconds for system metrics
    this.updateInterval = setInterval(() => {
      this.fetchAndBroadcastMetrics()
    }, 5000)
  }

  private stopRealtimeUpdates() {
    if (this.channel) {
      this.supabase.removeChannel(this.channel)
      this.channel = null
    }
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  private async fetchAndBroadcastMetrics() {
    try {
      const metrics = await this.fetchRealtimeMetrics()
      
      // Broadcast to all subscribers
      this.subscribers.forEach(callback => {
        callback(metrics)
      })
    } catch (error) {
      console.error('Error fetching realtime metrics:', error)
    }
  }

  private async fetchRealtimeMetrics(): Promise<RealtimeMetrics> {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

    // Get active users (active in last 5 minutes)
    const { data: activeUsersData } = await this.supabase
      .from('users')
      .select('id')
      .gte('last_active', fiveMinutesAgo.toISOString())

    // Get active transcriptions
    const { data: activeTranscriptions } = await this.supabase
      .from('transcriptions')
      .select('id')
      .eq('status', 'processing')

    // Get queued jobs (meetings waiting for transcription)
    const { data: queuedJobs } = await this.supabase
      .from('meetings')
      .select('id')
      .eq('status', 'uploaded')

    // Calculate system load (mock for now, would connect to actual monitoring)
    const systemLoad = this.calculateSystemLoad()

    return {
      activeUsers: activeUsersData?.length || 0,
      activeTranscriptions: activeTranscriptions?.length || 0,
      queuedJobs: queuedJobs?.length || 0,
      systemLoad
    }
  }

  private calculateSystemLoad(): number {
    // In a real implementation, this would connect to system monitoring
    // For now, return a mock value that varies
    const base = 30
    const variation = Math.sin(Date.now() / 10000) * 20
    return Math.max(0, Math.min(100, base + variation))
  }

  // Analytics event tracking
  async trackEvent(event: {
    category: string
    action: string
    label?: string
    value?: number
    userId?: string
    metadata?: any
  }) {
    try {
      await this.supabase.from('analytics_events').insert({
        category: event.category,
        action: event.action,
        label: event.label,
        value: event.value,
        user_id: event.userId,
        metadata: event.metadata,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error tracking analytics event:', error)
    }
  }

  // Performance metric tracking
  async trackPerformance(metric: {
    name: string
    value: number
    unit: string
    tags?: Record<string, string>
  }) {
    try {
      await this.supabase.from('performance_metrics').insert({
        metric_name: metric.name,
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error tracking performance metric:', error)
    }
  }

  // Business metric tracking
  async trackBusinessMetric(metric: {
    type: string
    value: number
    metadata?: any
  }) {
    try {
      await this.supabase.from('business_metrics').insert({
        metric_type: metric.type,
        value: metric.value,
        metadata: metric.metadata,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error tracking business metric:', error)
    }
  }
}