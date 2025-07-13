'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, CheckCircle, Clock, Database, Cpu, HardDrive, Activity } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface SystemMetrics {
  cpu: number
  memory: number
  disk: number
  network: {
    in: number
    out: number
  }
  database: {
    connections: number
    responseTime: number
    queryCount: number
  }
  cache: {
    hitRate: number
    size: number
    evictions: number
  }
}

interface ApiMetrics {
  endpoint: string
  method: string
  avgResponseTime: number
  errorRate: number
  requestCount: number
  p95ResponseTime: number
  p99ResponseTime: number
}

interface QueueMetrics {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  avgProcessingTime: number
}

export default function TechnicalMonitoringPage() {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [apiMetrics, setApiMetrics] = useState<ApiMetrics[]>([])
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadMetrics()
    
    if (autoRefresh) {
      const interval = setInterval(loadMetrics, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadMetrics = async () => {
    try {
      setIsLoading(true)
      
      // Load all metrics in parallel
      const [system, api, queue] = await Promise.all([
        fetch('/api/monitoring/system').then(r => r.json()),
        fetch('/api/monitoring/api').then(r => r.json()),
        fetch('/api/monitoring/queue').then(r => r.json()),
      ])

      setSystemMetrics(system)
      setApiMetrics(api)
      setQueueMetrics(queue)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-500'
    if (value <= thresholds.warning) return 'text-yellow-500'
    return 'text-red-500'
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Technikai Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Rendszer teljesítmény és állapot valós időben
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50' : ''}
          >
            {autoRefresh ? 'Auto frissítés BE' : 'Auto frissítés KI'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadMetrics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Frissítés
          </Button>
          <p className="text-sm text-gray-500">
            Frissítve: {lastUpdated.toLocaleTimeString('hu-HU')}
          </p>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU használat</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics?.cpu.toFixed(1)}%
            </div>
            <div className={`text-xs ${getStatusColor(systemMetrics?.cpu || 0, { good: 70, warning: 85 })}`}>
              {systemMetrics?.cpu < 70 ? 'Normális' : systemMetrics?.cpu < 85 ? 'Magas' : 'Kritikus'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memória</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics?.memory.toFixed(1)}%
            </div>
            <div className={`text-xs ${getStatusColor(systemMetrics?.memory || 0, { good: 80, warning: 90 })}`}>
              {formatBytes((systemMetrics?.memory || 0) * 1024 * 1024 * 100)} / 16 GB
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adatbázis</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics?.database.responseTime}ms
            </div>
            <div className="text-xs text-muted-foreground">
              {systemMetrics?.database.connections} kapcsolat
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((systemMetrics?.cache.hitRate || 0) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Találati arány
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="api" className="space-y-4">
        <TabsList>
          <TabsTrigger value="api">API Teljesítmény</TabsTrigger>
          <TabsTrigger value="queue">Várakozási sorok</TabsTrigger>
          <TabsTrigger value="errors">Hibák</TabsTrigger>
          <TabsTrigger value="alerts">Riasztások</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Végpontok</CardTitle>
              <CardDescription>
                Válaszidők és hibaarányok végpontonként
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={metric.method === 'GET' ? 'default' : 'secondary'}>
                          {metric.method}
                        </Badge>
                        <span className="font-mono text-sm">{metric.endpoint}</span>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-gray-600">
                        <span>Átlag: {metric.avgResponseTime}ms</span>
                        <span>P95: {metric.p95ResponseTime}ms</span>
                        <span>P99: {metric.p99ResponseTime}ms</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{metric.requestCount}</div>
                      <div className={`text-sm ${metric.errorRate > 1 ? 'text-red-500' : 'text-green-500'}`}>
                        {metric.errorRate.toFixed(2)}% hiba
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Response Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Válaszidők trendje</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  { time: '00:00', avg: 45, p95: 120, p99: 250 },
                  { time: '04:00', avg: 38, p95: 95, p99: 180 },
                  { time: '08:00', avg: 62, p95: 150, p99: 320 },
                  { time: '12:00', avg: 85, p95: 200, p99: 450 },
                  { time: '16:00', avg: 72, p95: 180, p99: 380 },
                  { time: '20:00', avg: 58, p95: 140, p99: 290 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="avg" stroke="#8884d8" name="Átlag" />
                  <Line type="monotone" dataKey="p95" stroke="#82ca9d" name="P95" />
                  <Line type="monotone" dataKey="p99" stroke="#ffc658" name="P99" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Várakozási sorok állapota</CardTitle>
              <CardDescription>
                Aktív feladatok és feldolgozási statisztikák
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {queueMetrics.map((queue, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-lg">{queue.name}</h3>
                      <Badge variant={queue.failed > 0 ? 'destructive' : 'default'}>
                        {queue.active} aktív
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{queue.waiting}</div>
                        <div className="text-sm text-gray-600">Várakozó</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-500">{queue.active}</div>
                        <div className="text-sm text-gray-600">Aktív</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-500">{queue.completed}</div>
                        <div className="text-sm text-gray-600">Kész</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-500">{queue.failed}</div>
                        <div className="text-sm text-gray-600">Sikertelen</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-sm text-gray-600">
                      Átlagos feldolgozási idő: {queue.avgProcessingTime}s
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hibák áttekintése</CardTitle>
              <CardDescription>
                Legutóbbi hibák és gyakoriságuk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { error: 'Rate limit exceeded', count: 45, lastOccurred: '2 perce' },
                  { error: 'Database connection timeout', count: 3, lastOccurred: '15 perce' },
                  { error: 'File upload size limit', count: 12, lastOccurred: '1 órája' },
                  { error: 'Invalid authentication token', count: 28, lastOccurred: '5 perce' },
                ].map((error, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <div>
                        <div className="font-medium">{error.error}</div>
                        <div className="text-sm text-gray-600">
                          Utoljára: {error.lastOccurred}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{error.count}</div>
                      <div className="text-sm text-gray-600">előfordulás</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aktív riasztások</CardTitle>
              <CardDescription>
                Figyelmet igénylő problémák
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { 
                    level: 'critical',
                    title: 'Magas CPU használat',
                    description: 'CPU használat 90% felett 10 perce',
                    time: '10 perce'
                  },
                  {
                    level: 'warning',
                    title: 'Lassú adatbázis válaszidők',
                    description: 'Átlagos válaszidő 500ms felett',
                    time: '25 perce'
                  },
                  {
                    level: 'info',
                    title: 'Megnövekedett API forgalom',
                    description: '150% normál forgalom észlelve',
                    time: '5 perce'
                  },
                ].map((alert, index) => (
                  <div key={index} className={`p-4 border rounded-lg ${
                    alert.level === 'critical' ? 'border-red-500 bg-red-50' :
                    alert.level === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`h-5 w-5 mt-0.5 ${
                          alert.level === 'critical' ? 'text-red-500' :
                          alert.level === 'warning' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div>
                          <h4 className="font-semibold">{alert.title}</h4>
                          <p className="text-sm text-gray-700 mt-1">
                            {alert.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {alert.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}