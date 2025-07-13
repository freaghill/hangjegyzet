import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueueService } from '@/lib/queue/queue.service'
import { QUEUE_NAMES } from '@/lib/queue/config'
import { 
  register, 
  queueSize, 
  databaseConnections, 
  organizationCount, 
  monthlyActiveUsers 
} from '@/lib/monitoring/metrics'

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

// Metrics are now exported from @/lib/monitoring/metrics