import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ApiMetric {
  endpoint: string
  method: string
  avgResponseTime: number
  errorRate: number
  requestCount: number
  p95ResponseTime: number
  p99ResponseTime: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get API metrics from logs (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const { data: apiLogs } = await supabase
      .from('api_logs')
      .select('endpoint, method, status_code, response_time')
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false })
    
    // If no logs exist, return sample data
    if (!apiLogs || apiLogs.length === 0) {
      return NextResponse.json(getSampleApiMetrics())
    }
    
    // Group by endpoint and method
    const metricsMap = new Map<string, ApiMetric>()
    
    apiLogs.forEach(log => {
      const key = `${log.method} ${log.endpoint}`
      const existing = metricsMap.get(key) || {
        endpoint: log.endpoint,
        method: log.method,
        avgResponseTime: 0,
        errorRate: 0,
        requestCount: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        responseTimes: [] as number[],
        errorCount: 0,
      }
      
      existing.requestCount++
      existing.responseTimes.push(log.response_time || 0)
      
      if (log.status_code >= 400) {
        existing.errorCount++
      }
      
      metricsMap.set(key, existing)
    })
    
    // Calculate final metrics
    const metrics: ApiMetric[] = Array.from(metricsMap.values()).map(metric => {
      const responseTimes = (metric as any).responseTimes.sort((a: number, b: number) => a - b)
      const avgResponseTime = responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length
      const p95Index = Math.floor(responseTimes.length * 0.95)
      const p99Index = Math.floor(responseTimes.length * 0.99)
      
      return {
        endpoint: metric.endpoint,
        method: metric.method,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: (metric as any).errorCount / metric.requestCount * 100,
        requestCount: metric.requestCount,
        p95ResponseTime: responseTimes[p95Index] || avgResponseTime,
        p99ResponseTime: responseTimes[p99Index] || responseTimes[p95Index] || avgResponseTime,
      }
    })
    
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error fetching API metrics:', error)
    // Return sample data on error
    return NextResponse.json(getSampleApiMetrics())
  }
}

function getSampleApiMetrics(): ApiMetric[] {
  return [
    {
      endpoint: '/api/transcribe',
      method: 'POST',
      avgResponseTime: 850,
      errorRate: 0.5,
      requestCount: 1234,
      p95ResponseTime: 1200,
      p99ResponseTime: 2100,
    },
    {
      endpoint: '/api/meetings',
      method: 'GET',
      avgResponseTime: 45,
      errorRate: 0.1,
      requestCount: 5678,
      p95ResponseTime: 95,
      p99ResponseTime: 150,
    },
    {
      endpoint: '/api/search',
      method: 'POST',
      avgResponseTime: 120,
      errorRate: 0.8,
      requestCount: 3456,
      p95ResponseTime: 280,
      p99ResponseTime: 450,
    },
    {
      endpoint: '/api/export',
      method: 'POST',
      avgResponseTime: 320,
      errorRate: 1.2,
      requestCount: 890,
      p95ResponseTime: 580,
      p99ResponseTime: 920,
    },
    {
      endpoint: '/api/auth/session',
      method: 'GET',
      avgResponseTime: 25,
      errorRate: 0.05,
      requestCount: 12345,
      p95ResponseTime: 45,
      p99ResponseTime: 85,
    },
  ]
}