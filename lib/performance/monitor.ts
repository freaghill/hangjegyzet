import { log } from '@/lib/logger'
import { logMetric } from '@/lib/logger/formatters'

// Performance monitoring utilities

export interface PerformanceMetrics {
  operation: string
  duration: number
  success: boolean
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map()
  private thresholds: Map<string, number> = new Map()

  constructor() {
    // Set default thresholds (in ms)
    this.thresholds.set('database_query', 100)
    this.thresholds.set('api_call', 500)
    this.thresholds.set('cache_operation', 10)
    this.thresholds.set('file_operation', 1000)
    this.thresholds.set('ai_processing', 5000)
  }

  // Start timing an operation
  startTimer(operation: string): () => void {
    const start = process.hrtime.bigint()
    
    return () => {
      const end = process.hrtime.bigint()
      const duration = Number(end - start) / 1_000_000 // Convert to milliseconds
      this.recordMetric(operation, duration, true)
      return duration
    }
  }

  // Record a metric
  recordMetric(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetrics = {
      operation,
      duration,
      success,
      metadata,
    }

    // Store metric
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, [])
    }
    this.metrics.get(operation)!.push(metric)

    // Log if slow
    const threshold = this.getThreshold(operation)
    if (duration > threshold) {
      log.warn(`Slow operation detected: ${operation}`, {
        duration,
        threshold,
        metadata,
      })
    }

    // Log metric
    logMetric(`operation_duration_${operation}`, duration, 'ms', metadata)
  }

  // Get threshold for operation
  private getThreshold(operation: string): number {
    // Check specific threshold
    if (this.thresholds.has(operation)) {
      return this.thresholds.get(operation)!
    }

    // Check category threshold
    for (const [category, threshold] of this.thresholds) {
      if (operation.includes(category)) {
        return threshold
      }
    }

    // Default threshold
    return 1000
  }

  // Get statistics for an operation
  getStats(operation: string): {
    count: number
    avgDuration: number
    minDuration: number
    maxDuration: number
    p50: number
    p95: number
    p99: number
    successRate: number
  } | null {
    const metrics = this.metrics.get(operation)
    if (!metrics || metrics.length === 0) {
      return null
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b)
    const successful = metrics.filter(m => m.success).length

    return {
      count: metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50: this.percentile(durations, 0.5),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99),
      successRate: (successful / metrics.length) * 100,
    }
  }

  // Calculate percentile
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1
    return sorted[Math.max(0, index)]
  }

  // Get all stats
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, any> = {}
    
    for (const operation of this.metrics.keys()) {
      stats[operation] = this.getStats(operation)
    }
    
    return stats
  }

  // Clear metrics
  clear(): void {
    this.metrics.clear()
  }

  // Export metrics for analysis
  exportMetrics(): Record<string, PerformanceMetrics[]> {
    return Object.fromEntries(this.metrics)
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Decorator for timing methods
export function measurePerformance(operation?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const operationName = operation || `${target.constructor.name}.${propertyKey}`

    descriptor.value = async function (...args: any[]) {
      const timer = performanceMonitor.startTimer(operationName)
      
      try {
        const result = await originalMethod.apply(this, args)
        timer()
        return result
      } catch (error) {
        const duration = timer()
        performanceMonitor.recordMetric(operationName, duration, false, {
          error: (error as Error).message,
        })
        throw error
      }
    }

    return descriptor
  }
}

// Utility to measure async operations
export async function measure<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const timer = performanceMonitor.startTimer(operation)
  
  try {
    const result = await fn()
    const duration = timer()
    performanceMonitor.recordMetric(operation, duration, true, metadata)
    return result
  } catch (error) {
    const duration = timer()
    performanceMonitor.recordMetric(operation, duration, false, {
      ...metadata,
      error: (error as Error).message,
    })
    throw error
  }
}

// Memory monitoring
export function getMemoryUsage(): {
  rss: number
  heapTotal: number
  heapUsed: number
  external: number
  arrayBuffers: number
} {
  const usage = process.memoryUsage()
  
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
    arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024),
  }
}

// CPU monitoring
let lastCpuUsage = process.cpuUsage()
let lastTime = Date.now()

export function getCpuUsage(): {
  user: number
  system: number
  total: number
  percentage: number
} {
  const currentCpuUsage = process.cpuUsage(lastCpuUsage)
  const currentTime = Date.now()
  const timeDiff = currentTime - lastTime

  const userPercent = (currentCpuUsage.user / 1000 / timeDiff) * 100
  const systemPercent = (currentCpuUsage.system / 1000 / timeDiff) * 100

  lastCpuUsage = process.cpuUsage()
  lastTime = currentTime

  return {
    user: Math.round(userPercent * 100) / 100,
    system: Math.round(systemPercent * 100) / 100,
    total: Math.round((userPercent + systemPercent) * 100) / 100,
    percentage: Math.round((userPercent + systemPercent) * 100) / 100,
  }
}

// Resource monitoring interval
let monitoringInterval: NodeJS.Timeout | null = null

export function startResourceMonitoring(intervalMs: number = 60000): void {
  if (monitoringInterval) {
    return
  }

  monitoringInterval = setInterval(() => {
    const memory = getMemoryUsage()
    const cpu = getCpuUsage()

    log.debug('Resource usage', {
      memory,
      cpu,
      timestamp: new Date().toISOString(),
    })

    // Alert on high usage
    if (memory.heapUsed > memory.heapTotal * 0.9) {
      log.warn('High memory usage detected', { memory })
    }

    if (cpu.percentage > 80) {
      log.warn('High CPU usage detected', { cpu })
    }
  }, intervalMs)
}

export function stopResourceMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval)
    monitoringInterval = null
  }
}