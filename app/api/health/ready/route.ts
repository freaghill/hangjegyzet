import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRedisHealth, redisClients } from '@/lib/cache/redis-sentinel'

// Readiness probe - checks if the app is ready to serve traffic
export async function GET() {
  const checks = {
    database: false,
    redis: false,
    storage: false,
  }
  
  // Check database
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1)
      .single()
    
    checks.database = !error
  } catch (error) {
    checks.database = false
  }
  
  // Check Redis
  try {
    const health = await checkRedisHealth(redisClients.cache)
    checks.redis = health.healthy
  } catch (error) {
    checks.redis = false
  }
  
  // Check storage
  try {
    const supabase = await createClient()
    const { error } = await supabase.storage.listBuckets()
    checks.storage = !error
  } catch (error) {
    checks.storage = false
  }
  
  const isReady = Object.values(checks).every(check => check === true)
  
  return NextResponse.json(
    {
      ready: isReady,
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: isReady ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  )
}