import Redis from 'ioredis'

// Redis Sentinel configuration for high availability
export function createRedisClient(): Redis {
  // Check if Sentinel is configured
  if (process.env.REDIS_SENTINELS) {
    const sentinels = process.env.REDIS_SENTINELS.split(',').map(sentinel => {
      const [host, port] = sentinel.split(':')
      return { host, port: parseInt(port) || 26379 }
    })
    
    return new Redis({
      sentinels,
      name: process.env.REDIS_MASTER_NAME || 'mymaster',
      password: process.env.REDIS_PASSWORD,
      sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD,
      
      // Retry strategy for resilience
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      
      // Connection options
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      
      // Sentinel specific options
      sentinelRetryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000)
        return delay
      },
      
      // Enable read from replicas for better performance
      enableReadyCheck: true,
      role: 'master', // Can be 'slave' for read replicas
    })
  }
  
  // Fallback to standard Redis connection
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
    
    enableOfflineQueue: true,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
  })
}

// Health check for Redis connection
export async function checkRedisHealth(client: Redis): Promise<{
  healthy: boolean
  latency?: number
  info?: any
}> {
  try {
    const start = Date.now()
    await client.ping()
    const latency = Date.now() - start
    
    // Get Redis info for monitoring
    const info = await client.info()
    const stats = parseRedisInfo(info)
    
    return {
      healthy: true,
      latency,
      info: {
        version: stats.redis_version,
        connected_clients: stats.connected_clients,
        used_memory_human: stats.used_memory_human,
        role: stats.role,
        connected_slaves: stats.connected_slaves,
      }
    }
  } catch (error) {
    return { healthy: false }
  }
}

// Parse Redis INFO command output
function parseRedisInfo(info: string): Record<string, any> {
  const lines = info.split('\r\n')
  const result: Record<string, any> = {}
  
  for (const line of lines) {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':')
      if (key && value) {
        result[key] = value
      }
    }
  }
  
  return result
}

// Create Redis clients for different purposes
export const redisClients = {
  cache: createRedisClient(),
  queue: createRedisClient(), // Separate client for BullMQ
  pubsub: createRedisClient(), // Separate client for pub/sub
  sessions: createRedisClient(), // Separate client for sessions
}

// Monitor Redis health
let healthCheckInterval: NodeJS.Timeout | null = null

export function startRedisHealthMonitoring(intervalMs: number = 30000) {
  healthCheckInterval = setInterval(async () => {
    const results = await Promise.all([
      checkRedisHealth(redisClients.cache),
      checkRedisHealth(redisClients.queue),
    ])
    
    const unhealthy = results.filter(r => !r.healthy)
    if (unhealthy.length > 0) {
      console.error(`Redis health check failed for ${unhealthy.length} clients`)
      // Send alert to monitoring service
    }
    
    // Log high latency
    const highLatency = results.filter(r => r.latency && r.latency > 100)
    if (highLatency.length > 0) {
      console.warn('High Redis latency detected:', highLatency)
    }
  }, intervalMs)
}

export function stopRedisHealthMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }
}

// Graceful shutdown
export async function closeRedisConnections() {
  await Promise.all([
    redisClients.cache.quit(),
    redisClients.queue.quit(),
    redisClients.pubsub.quit(),
    redisClients.sessions.quit(),
  ])
}

// Start monitoring in production
if (process.env.NODE_ENV === 'production') {
  startRedisHealthMonitoring()
}