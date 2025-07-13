import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upstashRedis } from '@/lib/redis'
import os from 'os'

export async function GET(request: NextRequest) {
  try {
    // Get system metrics
    const cpuUsage = getCpuUsage()
    const memoryUsage = getMemoryUsage()
    const diskUsage = await getDiskUsage()
    
    // Get network metrics (placeholder)
    const networkIn = Math.random() * 100
    const networkOut = Math.random() * 80
    
    // Get database metrics
    const dbMetrics = await getDatabaseMetrics()
    
    // Get cache metrics
    const cacheMetrics = await getCacheMetrics()
    
    return NextResponse.json({
      cpu: cpuUsage,
      memory: memoryUsage,
      disk: diskUsage,
      network: {
        in: networkIn,
        out: networkOut,
      },
      database: dbMetrics,
      cache: cacheMetrics,
    })
  } catch (error) {
    console.error('Error fetching system metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system metrics' },
      { status: 500 }
    )
  }
}

function getCpuUsage(): number {
  const cpus = os.cpus()
  let totalIdle = 0
  let totalTick = 0
  
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times]
    }
    totalIdle += cpu.times.idle
  })
  
  const idle = totalIdle / cpus.length
  const total = totalTick / cpus.length
  const usage = 100 - ~~(100 * idle / total)
  
  return Math.min(Math.max(usage, 0), 100)
}

function getMemoryUsage(): number {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  return (usedMem / totalMem) * 100
}

async function getDiskUsage(): Promise<number> {
  // This is a simplified version - in production you'd use a proper disk usage library
  // For now, return a simulated value
  return Math.random() * 30 + 40 // 40-70%
}

async function getDatabaseMetrics() {
  const supabase = await createClient()
  const startTime = Date.now()
  
  try {
    // Simple health check query
    await supabase.from('users').select('id').limit(1)
    const responseTime = Date.now() - startTime
    
    // Get connection count (simulated for now)
    const connections = Math.floor(Math.random() * 20) + 5
    
    // Get query count from recent period (placeholder)
    const queryCount = Math.floor(Math.random() * 1000) + 500
    
    return {
      connections,
      responseTime,
      queryCount,
    }
  } catch (error) {
    return {
      connections: 0,
      responseTime: -1,
      queryCount: 0,
    }
  }
}

async function getCacheMetrics() {
  try {
    // Get Redis info if available
    if (upstashRedis) {
      // These would be actual Redis commands in production
      const hitRate = Math.random() * 0.3 + 0.65 // 65-95%
      const size = Math.floor(Math.random() * 50) + 10 // MB
      const evictions = Math.floor(Math.random() * 100)
      
      return {
        hitRate,
        size,
        evictions,
      }
    }
    
    return {
      hitRate: 0,
      size: 0,
      evictions: 0,
    }
  } catch (error) {
    return {
      hitRate: 0,
      size: 0,
      evictions: 0,
    }
  }
}