import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRedisHealth, redisClients } from '@/lib/cache/redis-sentinel'
import { getQueue, QUEUE_NAMES } from '@/lib/queue/config'

// Basic health check - for load balancers
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const detailed = searchParams.get('detailed') === 'true'
  
  if (!detailed) {
    // Simple health check for load balancers
    return NextResponse.json({ 
      status: 'ok',
      timestamp: new Date().toISOString()
    })
  }
  
  // Detailed health check for monitoring
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
    checks: {} as Record<string, any>
  }
  
  // Check database
  try {
    const start = Date.now()
    const supabase = await createClient()
    const { error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1)
      .single()
    
    health.checks.database = {
      status: error ? 'unhealthy' : 'healthy',
      latency: Date.now() - start,
      error: error?.message
    }
  } catch (error) {
    health.checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    health.status = 'degraded'
  }
  
  // Check Redis
  try {
    const redisHealth = await checkRedisHealth(redisClients.cache)
    health.checks.redis = {
      status: redisHealth.healthy ? 'healthy' : 'unhealthy',
      latency: redisHealth.latency,
      info: redisHealth.info
    }
  } catch (error) {
    health.checks.redis = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    health.status = 'degraded'
  }
  
  // Check job queues
  try {
    const queueHealth = await Promise.all([
      checkQueueHealth(QUEUE_NAMES.TRANSCRIPTION),
      checkQueueHealth(QUEUE_NAMES.AI_PROCESSING),
    ])
    
    health.checks.queues = queueHealth.reduce((acc, q) => {
      acc[q.name] = q
      return acc
    }, {} as Record<string, any>)
  } catch (error) {
    health.checks.queues = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    health.status = 'degraded'
  }
  
  // Check external services
  health.checks.external = {
    openai: await checkExternalService('https://api.openai.com/v1/models'),
    anthropic: await checkExternalService('https://api.anthropic.com/v1/messages'),
    supabase_storage: await checkSupabaseStorage(),
  }
  
  // Overall status
  const unhealthyChecks = Object.values(health.checks).filter(
    (check: any) => check.status === 'unhealthy'
  ).length
  
  if (unhealthyChecks > 0) {
    health.status = unhealthyChecks > 1 ? 'unhealthy' : 'degraded'
  }
  
  return NextResponse.json(health, {
    status: health.status === 'ok' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}

async function checkQueueHealth(queueName: string) {
  try {
    const queue = getQueue(queueName as any)
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ])
    
    return {
      name: queueName,
      status: 'healthy',
      metrics: { waiting, active, completed, failed }
    }
  } catch (error) {
    return {
      name: queueName,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkExternalService(url: string) {
  try {
    const start = Date.now()
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    
    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      statusCode: response.status,
      latency: Date.now() - start
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkSupabaseStorage() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.storage.listBuckets()
    
    return {
      status: error ? 'unhealthy' : 'healthy',
      error: error?.message
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}