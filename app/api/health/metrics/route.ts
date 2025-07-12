import { NextRequest, NextResponse } from 'next/server'
import { Registry, Counter, Histogram, Gauge } from 'prom-client'
import { createClient } from '@/lib/supabase/server'
import { QueueService } from '@/lib/queue/queue.service'
import { QUEUE_NAMES } from '@/lib/queue/config'

// Create a Registry
const register = new Registry()

// Define metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
})

const activeTranscriptions = new Gauge({
  name: 'active_transcriptions',
  help: 'Number of active transcriptions',
})

const transcriptionDuration = new Histogram({
  name: 'transcription_duration_seconds',
  help: 'Duration of transcriptions in seconds',
  labelNames: ['mode'],
  buckets: [30, 60, 120, 300, 600],
})

const aiProcessingDuration = new Histogram({
  name: 'ai_processing_duration_seconds',
  help: 'Duration of AI processing in seconds',
  labelNames: ['type'],
  buckets: [1, 5, 10, 30, 60],
})

const queueSize = new Gauge({
  name: 'queue_size',
  help: 'Current size of job queues',
  labelNames: ['queue_name'],
})

const databaseConnections = new Gauge({
  name: 'database_connections',
  help: 'Number of database connections',
  labelNames: ['state'],
})

const cacheHitRate = new Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage',
})

const organizationCount = new Gauge({
  name: 'organization_count',
  help: 'Total number of organizations',
})

const monthlyActiveUsers = new Gauge({
  name: 'monthly_active_users',
  help: 'Monthly active users',
})

const totalMeetingMinutes = new Counter({
  name: 'total_meeting_minutes',
  help: 'Total meeting minutes processed',
  labelNames: ['organization_id'],
})

// Register metrics
register.registerMetric(httpRequestDuration)
register.registerMetric(activeTranscriptions)
register.registerMetric(transcriptionDuration)
register.registerMetric(aiProcessingDuration)
register.registerMetric(queueSize)
register.registerMetric(databaseConnections)
register.registerMetric(cacheHitRate)
register.registerMetric(organizationCount)
register.registerMetric(monthlyActiveUsers)
register.registerMetric(totalMeetingMinutes)

// Prometheus metrics endpoint
export async function GET(request: NextRequest) {
  try {
    // Update queue metrics
    const queues = [
      QUEUE_NAMES.TRANSCRIPTION,
      QUEUE_NAMES.AI_PROCESSING,
      QUEUE_NAMES.EXPORT,
      QUEUE_NAMES.EMAIL,
    ]
    
    for (const queueName of queues) {
      const metrics = await QueueService.getQueueMetrics(queueName)
      queueSize.set({ queue_name: queueName }, metrics.total)
    }
    
    // Update database metrics
    const supabase = await createClient()
    const { data: connStats } = await supabase.rpc('get_connection_stats')
    
    if (connStats) {
      const stats = connStats.reduce((acc: any, stat: any) => {
        acc[stat.metric] = stat.value
        return acc
      }, {})
      
      databaseConnections.set({ state: 'active' }, stats.active_connections || 0)
      databaseConnections.set({ state: 'idle' }, stats.idle_connections || 0)
      databaseConnections.set({ state: 'total' }, stats.total_connections || 0)
    }
    
    // Update business metrics
    const { data: orgCount } = await supabase
      .from('organizations')
      .select('count', { count: 'exact' })
      .single()
    
    if (orgCount) {
      organizationCount.set(orgCount.count || 0)
    }
    
    // Update MAU
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: mauCount } = await supabase
      .from('profiles')
      .select('count', { count: 'exact' })
      .gte('last_login', thirtyDaysAgo.toISOString())
      .single()
    
    if (mauCount) {
      monthlyActiveUsers.set(mauCount.count || 0)
    }
    
    // Return metrics in Prometheus format
    const metrics = await register.metrics()
    
    return new Response(metrics, {
      headers: {
        'Content-Type': register.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    )
  }
}

// Export metrics for use in other parts of the app
export const metrics = {
  httpRequestDuration,
  activeTranscriptions,
  transcriptionDuration,
  aiProcessingDuration,
  totalMeetingMinutes,
}