import { captureException, captureMessage } from './sentry'
import { trackBusinessMetric, trackPerformance, trackError } from './vercel-analytics'
import { createClient } from '@/lib/supabase/server'

// Metric types
export interface Metric {
  name: string
  value: number
  unit?: string
  tags?: Record<string, string>
  timestamp?: Date
}

export interface BusinessKPI {
  name: string
  value: number
  change?: number // Percentage change
  trend?: 'up' | 'down' | 'stable'
  period?: string
}

// Main monitoring service
export class MonitoringService {
  // System metrics collection
  static async collectSystemMetrics(): Promise<void> {
    try {
      // Memory usage
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const memory = process.memoryUsage()
        this.recordMetric({
          name: 'system.memory.heap_used',
          value: memory.heapUsed / 1024 / 1024, // MB
          unit: 'megabyte',
          tags: { type: 'heap' },
        })
      }

      // Database connection pool
      await this.checkDatabaseHealth()

      // API response times
      await this.collectApiMetrics()

      // Queue metrics
      await this.collectQueueMetrics()
    } catch (error) {
      captureException(error as Error, {
        action: 'collect_system_metrics',
      })
    }
  }

  // Business KPIs collection
  static async collectBusinessKPIs(): Promise<BusinessKPI[]> {
    const supabase = await createClient()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    const kpis: BusinessKPI[] = []

    try {
      // Monthly Active Users (MAU)
      const { count: currentMAU } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_active_at', thirtyDaysAgo.toISOString())

      const { count: previousMAU } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_active_at', sixtyDaysAgo.toISOString())
        .lt('last_active_at', thirtyDaysAgo.toISOString())

      kpis.push({
        name: 'Monthly Active Users',
        value: currentMAU || 0,
        change: this.calculateChange(currentMAU || 0, previousMAU || 0),
        trend: this.getTrend(currentMAU || 0, previousMAU || 0),
        period: 'month',
      })

      // Total Meetings
      const { count: totalMeetings } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })

      const { count: newMeetingsThisMonth } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString())

      kpis.push({
        name: 'Total Meetings',
        value: totalMeetings || 0,
        change: this.calculateChange(newMeetingsThisMonth || 0, 0),
        trend: 'up',
        period: 'all_time',
      })

      // Monthly Recurring Revenue (MRR)
      const { data: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('amount, interval')
        .eq('status', 'active')

      const mrr = activeSubscriptions?.reduce((sum, sub) => {
        const monthlyAmount = sub.interval === 'year' 
          ? sub.amount / 12 
          : sub.amount
        return sum + monthlyAmount
      }, 0) || 0

      kpis.push({
        name: 'Monthly Recurring Revenue',
        value: mrr,
        change: 0, // Would need historical data
        trend: 'stable',
        period: 'month',
      })

      // Average Session Duration
      const { data: sessions } = await supabase
        .from('user_sessions')
        .select('duration_seconds')
        .gte('created_at', thirtyDaysAgo.toISOString())

      const avgDuration = sessions?.length 
        ? sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length
        : 0

      kpis.push({
        name: 'Avg Session Duration',
        value: Math.round(avgDuration / 60), // Convert to minutes
        unit: 'minutes',
        trend: 'stable',
        period: 'month',
      })

      // Conversion Rate
      const { count: totalSignups } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString())

      const { count: paidUsers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('created_at', thirtyDaysAgo.toISOString())

      const conversionRate = totalSignups ? (paidUsers || 0) / totalSignups * 100 : 0

      kpis.push({
        name: 'Conversion Rate',
        value: parseFloat(conversionRate.toFixed(2)),
        unit: '%',
        trend: 'stable',
        period: 'month',
      })

      // Track KPIs to analytics
      kpis.forEach(kpi => {
        trackBusinessMetric('kpi_measured', {
          kpi_name: kpi.name,
          value: kpi.value,
          change: kpi.change,
          trend: kpi.trend,
        })
      })

    } catch (error) {
      captureException(error as Error, {
        action: 'collect_business_kpis',
      })
    }

    return kpis
  }

  // API metrics collection
  private static async collectApiMetrics(): Promise<void> {
    const supabase = await createClient()
    
    try {
      // Get recent API logs
      const { data: apiLogs } = await supabase
        .from('api_logs')
        .select('endpoint, method, status_code, response_time')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes

      if (apiLogs) {
        // Group by endpoint
        const endpointMetrics = apiLogs.reduce((acc, log) => {
          const key = `${log.method} ${log.endpoint}`
          if (!acc[key]) {
            acc[key] = {
              count: 0,
              totalTime: 0,
              errors: 0,
            }
          }
          
          acc[key].count++
          acc[key].totalTime += log.response_time || 0
          if (log.status_code >= 400) acc[key].errors++
          
          return acc
        }, {} as Record<string, any>)

        // Record metrics
        Object.entries(endpointMetrics).forEach(([endpoint, metrics]) => {
          const avgResponseTime = metrics.totalTime / metrics.count
          const errorRate = (metrics.errors / metrics.count) * 100

          trackPerformance('api_response_time', avgResponseTime, {
            endpoint,
            unit: 'milliseconds',
          })

          if (errorRate > 0) {
            trackError('api_error_rate', {
              endpoint,
              error_rate: errorRate,
              severity: errorRate > 10 ? 'high' : 'low',
            })
          }
        })
      }
    } catch (error) {
      console.error('Failed to collect API metrics:', error)
    }
  }

  // Queue metrics collection
  private static async collectQueueMetrics(): Promise<void> {
    try {
      // This would integrate with your queue system (Bull, etc.)
      // For now, using placeholder metrics
      
      const queueMetrics = {
        transcription: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
        },
        email: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
        },
      }

      Object.entries(queueMetrics).forEach(([queue, metrics]) => {
        this.recordMetric({
          name: 'queue.size',
          value: metrics.waiting,
          tags: { queue, state: 'waiting' },
        })

        this.recordMetric({
          name: 'queue.active',
          value: metrics.active,
          tags: { queue },
        })

        if (metrics.failed > 0) {
          trackError('queue_failures', {
            queue,
            count: metrics.failed,
            severity: 'medium',
          })
        }
      })
    } catch (error) {
      console.error('Failed to collect queue metrics:', error)
    }
  }

  // Database health check
  private static async checkDatabaseHealth(): Promise<void> {
    const supabase = await createClient()
    const startTime = Date.now()

    try {
      // Simple health check query
      await supabase.from('users').select('id').limit(1)
      
      const responseTime = Date.now() - startTime
      
      this.recordMetric({
        name: 'database.response_time',
        value: responseTime,
        unit: 'milliseconds',
      })

      if (responseTime > 1000) {
        trackError('slow_database_response', {
          response_time: responseTime,
          severity: 'medium',
        })
      }
    } catch (error) {
      trackError('database_health_check_failed', {
        error: error.message,
        severity: 'high',
      })
    }
  }

  // Record metric
  private static recordMetric(metric: Metric): void {
    // Send to monitoring backend
    trackPerformance(metric.name, metric.value, {
      unit: metric.unit,
      ...metric.tags,
    })
  }

  // Utility functions
  private static calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  private static getTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    const change = this.calculateChange(current, previous)
    if (change > 5) return 'up'
    if (change < -5) return 'down'
    return 'stable'
  }

  // Alert thresholds
  static checkAlertThresholds(metrics: BusinessKPI[]): void {
    // Define thresholds
    const thresholds = {
      'Monthly Active Users': { min: 100, critical: 50 },
      'Conversion Rate': { min: 2, critical: 1 },
      'Avg Session Duration': { min: 5, critical: 2 },
    }

    metrics.forEach(metric => {
      const threshold = thresholds[metric.name]
      if (!threshold) return

      if (metric.value < threshold.critical) {
        captureMessage(`Critical: ${metric.name} is ${metric.value}`, 'error', {
          metadata: { metric },
        })
      } else if (metric.value < threshold.min) {
        captureMessage(`Warning: ${metric.name} is ${metric.value}`, 'warning', {
          metadata: { metric },
        })
      }
    })
  }
}

// Export scheduled job for metrics collection
export async function collectMetrics() {
  console.log('Starting metrics collection...')
  
  // Collect system metrics
  await MonitoringService.collectSystemMetrics()
  
  // Collect business KPIs
  const kpis = await MonitoringService.collectBusinessKPIs()
  
  // Check alert thresholds
  MonitoringService.checkAlertThresholds(kpis)
  
  console.log('Metrics collection completed')
}