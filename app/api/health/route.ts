import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upstashRedis } from '@/lib/redis'

export async function GET(request: NextRequest) {
  const checks = {
    api: true,
    database: false,
    cache: false,
    storage: false,
  }
  
  try {
    // Check database
    const supabase = await createClient()
    const { error: dbError } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    checks.database = !dbError
    
    // Check cache (Redis)
    if (upstashRedis) {
      try {
        await upstashRedis.ping()
        checks.cache = true
      } catch (error) {
        checks.cache = false
      }
    }
    
    // Check storage
    const { error: storageError } = await supabase
      .storage
      .from('meetings')
      .list('', { limit: 1 })
    
    checks.storage = !storageError
    
    // Overall health
    const allHealthy = Object.values(checks).every(status => status === true)
    
    return NextResponse.json({
      status: allHealthy ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    }, {
      status: allHealthy ? 200 : 503,
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      checks,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, {
      status: 503,
    })
  }
}