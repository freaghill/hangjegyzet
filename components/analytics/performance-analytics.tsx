'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { 
  Zap, 
  Clock, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Server,
  Database,
  Activity
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { AnalyticsService } from '@/lib/analytics/analytics-service'
import { PerformanceMetrics } from '@/lib/analytics/types'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'

interface PerformanceAnalyticsProps {
  hours: number
}

export function PerformanceAnalytics({ hours }: PerformanceAnalyticsProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [hours])

  const loadMetrics = async () => {
    setIsLoading(true)
    try {
      const analyticsService = new AnalyticsService()
      const data = await analyticsService.getPerformanceMetrics(hours)
      setMetrics(data)
    } catch (error) {
      console.error('Error loading performance metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  // Calculate trends
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend < -5) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return `${days}n ${hours}ó`
  }

  // Prepare chart data
  const responseTimeData = metrics.responseTime.hourly.map(metric => ({
    time: format(new Date(metric.hour), 'HH:mm', { locale: hu }),
    avg: metric.avg_ms,
    p95: metric.p95_ms,
    p99: metric.p99_ms
  }))

  const errorRateData = metrics.errorRate.hourly.map(metric => ({
    time: format(new Date(metric.hour), 'HH:mm', { locale: hu }),
    rate: metric.error_rate * 100
  }))

  const throughputData = metrics.throughput.hourly.map(metric => ({
    time: format(new Date(metric.hour), 'HH:mm', { locale: hu }),
    requests: metric.requests_per_minute
  }))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Átlagos válaszidő</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.responseTime.average}ms</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {getTrendIcon(calculateTrend(
                metrics.responseTime.average,
                metrics.responseTime.previousAverage
              ))}
              <span>
                {Math.abs(calculateTrend(
                  metrics.responseTime.average,
                  metrics.responseTime.previousAverage
                )).toFixed(1)}% változás
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hibaarány</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.errorRate.current * 100).toFixed(2)}%</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {metrics.errorRate.current > 0.05 && (
                <span className="text-red-500">Magas hibaarány!</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Áteresztőképesség</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.throughput.current}</div>
            <p className="text-xs text-muted-foreground">
              kérés/perc
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Üzemidő</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.uptime.percentage.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              {formatUptime(metrics.uptime.totalSeconds)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU használat</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.resourceUsage.cpu.current}%</div>
            <Progress value={metrics.resourceUsage.cpu.current} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memória használat</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.resourceUsage.memory.current}%</div>
            <Progress value={metrics.resourceUsage.memory.current} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Válaszidő trendje</CardTitle>
            <CardDescription>
              Átlagos, 95. és 99. percentilis válaszidők
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avg" 
                  stroke="#3b82f6" 
                  name="Átlag"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="p95" 
                  stroke="#f59e0b" 
                  name="P95"
                  strokeDasharray="5 5"
                />
                <Line 
                  type="monotone" 
                  dataKey="p99" 
                  stroke="#ef4444" 
                  name="P99"
                  strokeDasharray="3 3"
                />
                <ReferenceLine 
                  y={1000} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3"
                  label="SLA határ"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Error Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Hibaarány</CardTitle>
            <CardDescription>
              Hibás kérések százalékos aránya
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={errorRateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#ef4444" 
                  fill="#ef4444"
                  fillOpacity={0.3}
                  name="Hibaarány"
                />
                <ReferenceLine 
                  y={5} 
                  stroke="#f59e0b" 
                  strokeDasharray="3 3"
                  label="Figyelmeztetési határ"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Throughput Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Áteresztőképesség</CardTitle>
            <CardDescription>
              Percenkénti kérések száma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'Kérés/perc', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="requests" fill="#10b981" name="Kérések" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service Status */}
        <Card>
          <CardHeader>
            <CardTitle>Szolgáltatás státusz</CardTitle>
            <CardDescription>
              Komponensek elérhetősége
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.serviceStatus).map(([service, status]) => (
                <div key={service} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      status.healthy ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="font-medium">
                      {service === 'database' ? 'Adatbázis' :
                       service === 'storage' ? 'Tárhely' :
                       service === 'transcription' ? 'Átírás' :
                       service === 'email' ? 'Email' : service}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {status.responseTime}ms
                    </span>
                    {status.healthy ? (
                      <span className="text-sm text-green-600">Működik</span>
                    ) : (
                      <span className="text-sm text-red-600">Hiba</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}