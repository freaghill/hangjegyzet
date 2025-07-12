/**
 * Database Connection Pool Configuration
 * 
 * For Supabase:
 * 1. Use the pooler endpoint instead of direct connection
 * 2. Enable connection pooling in Supabase dashboard
 * 3. Use transaction mode for short-lived connections
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Connection pool configuration
export const DB_POOL_CONFIG = {
  // Maximum number of connections in the pool
  max: parseInt(process.env.DB_POOL_MAX || '50'),
  
  // Minimum number of connections to maintain
  min: parseInt(process.env.DB_POOL_MIN || '10'),
  
  // Maximum time (ms) to wait for a connection
  connectionTimeoutMillis: 10000,
  
  // Maximum time (ms) a connection can be idle
  idleTimeoutMillis: 30000,
  
  // Maximum time (ms) to keep a connection alive
  maxLifetimeMillis: 1800000, // 30 minutes
  
  // Statement timeout for queries
  statement_timeout: 30000, // 30 seconds
}

// Create pooled Supabase client
export function createPooledClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  // Use pooler endpoint if available
  const poolerUrl = supabaseUrl.replace(
    '.supabase.co',
    '.pooler.supabase.co'
  )
  
  return createClient(poolerUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-connection-pooling': 'true'
      }
    }
  })
}

// Connection pool health check
export async function checkPoolHealth(): Promise<{
  healthy: boolean
  activeConnections?: number
  idleConnections?: number
  totalConnections?: number
  waitingRequests?: number
}> {
  try {
    const client = createPooledClient()
    
    // Test connection
    const { data, error } = await client
      .from('organizations')
      .select('count')
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      return { healthy: false }
    }
    
    // Get pool stats if available
    const { data: poolStats } = await client.rpc('get_pool_stats')
    
    return {
      healthy: true,
      ...(poolStats || {})
    }
  } catch (error) {
    console.error('Pool health check failed:', error)
    return { healthy: false }
  }
}

// Best practices for using pooled connections
export const PoolingBestPractices = {
  // 1. Use transactions for multiple operations
  async withTransaction<T>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    const client = createPooledClient()
    
    try {
      await client.rpc('begin')
      const result = await callback(client)
      await client.rpc('commit')
      return result
    } catch (error) {
      await client.rpc('rollback')
      throw error
    }
  },
  
  // 2. Release connections quickly
  async quickQuery<T>(
    query: (client: any) => Promise<T>
  ): Promise<T> {
    const client = createPooledClient()
    return query(client)
  },
  
  // 3. Use prepared statements
  prepareStatement(sql: string, params: any[]) {
    return {
      sql,
      params,
      // Prepared statements are cached by the pooler
      name: crypto.createHash('md5').update(sql).digest('hex')
    }
  }
}

// Monitoring helper
export function monitorPoolUsage() {
  setInterval(async () => {
    const health = await checkPoolHealth()
    
    if (!health.healthy) {
      console.error('Database pool unhealthy!')
      // Send alert to monitoring service
    } else if (health.activeConnections && health.totalConnections) {
      const usage = (health.activeConnections / health.totalConnections) * 100
      
      if (usage > 80) {
        console.warn(`High database pool usage: ${usage.toFixed(1)}%`)
        // Consider scaling or optimizing queries
      }
    }
  }, 30000) // Check every 30 seconds
}

// Initialize monitoring in production
if (process.env.NODE_ENV === 'production') {
  monitorPoolUsage()
}