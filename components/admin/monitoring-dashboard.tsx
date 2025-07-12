'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, CheckCircle, XCircle, Activity, Database, Server, HardDrive } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { hu } from 'date-fns/locale'

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  version: string
  checks: {
    database: ServiceCheck
    redis: ServiceCheck
    search: ServiceCheck
    transcription: ServiceCheck
    storage: ServiceCheck
    queues?: Record<string, QueueCheck>
    external?: {
      openai: ExternalServiceCheck
      anthropic: ExternalServiceCheck
      supabase_storage: ExternalServiceCheck
    }
  }
}

interface ServiceCheck {
  status: 'up' | 'down'
  message?: string
  responseTime?: number
  latency?: number
}

interface QueueCheck {
  status: 'healthy' | 'unhealthy'
  metrics?: {
    waiting: number
    active: number
    completed: number
    failed: number
  }
  error?: string
}

interface ExternalServiceCheck {
  status: 'healthy' | 'unhealthy'
  statusCode?: number
  latency?: number
  error?: string
}

export default function MonitoringDashboard() {
  const [health, setHealth] = useState<HealthCheck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchHealth = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/health?detailed=true')
      const data = await response.json()
      setHealth(data)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError('Nem sikerült betölteni az állapot információkat')
      console.error('Health check error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000) // 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
      case 'ok':
        return 'text-green-600'
      case 'degraded':
        return 'text-yellow-600'
      case 'unhealthy':
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
      case 'ok':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'unhealthy':
      case 'down':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) {
      return `${days} nap ${hours} óra`
    } else if (hours > 0) {
      return `${hours} óra ${minutes} perc`
    } else {
      return `${minutes} perc`
    }
  }

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchHealth} variant="outline" className="mt-4">
            Újratöltés
          </Button>
        </div>
      </div>
    )
  }

  if (!health) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rendszer Monitoring</h2>
          <p className="text-sm text-muted-foreground">
            Utolsó frissítés: {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: hu })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto-frissítés: {autoRefresh ? 'Be' : 'Ki'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealth}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Frissítés
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(health.status)}
            Általános Állapot
          </CardTitle>
          <CardDescription>
            Verzió: {health.version} | Üzemidő: {formatUptime(health.uptime)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge 
              variant={health.status === 'healthy' ? 'default' : health.status === 'degraded' ? 'secondary' : 'destructive'}
              className="text-lg px-4 py-1"
            >
              {health.status === 'healthy' ? 'Egészséges' : health.status === 'degraded' ? 'Csökkent teljesítmény' : 'Hibás'}
            </Badge>
            {health.timestamp && (
              <span className="text-sm text-muted-foreground">
                {new Date(health.timestamp).toLocaleString('hu-HU')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Core Services */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Database */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Adatbázis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(health.checks.database.status)}
                <span className={getStatusColor(health.checks.database.status)}>
                  {health.checks.database.status === 'up' ? 'Működik' : 'Nem elérhető'}
                </span>
              </div>
              {health.checks.database.responseTime && (
                <span className="text-sm text-muted-foreground">
                  {health.checks.database.responseTime}ms
                </span>
              )}
            </div>
            {health.checks.database.message && (
              <p className="text-sm text-red-600 mt-2">{health.checks.database.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Redis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="h-5 w-5" />
              Redis Cache
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(health.checks.redis.status)}
                <span className={getStatusColor(health.checks.redis.status)}>
                  {health.checks.redis.status === 'up' ? 'Működik' : 'Nem elérhető'}
                </span>
              </div>
              {health.checks.redis.responseTime && (
                <span className="text-sm text-muted-foreground">
                  {health.checks.redis.responseTime}ms
                </span>
              )}
            </div>
            {health.checks.redis.message && (
              <p className="text-sm text-red-600 mt-2">{health.checks.redis.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HardDrive className="h-5 w-5" />
              Tárhely
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(health.checks.storage.status)}
                <span className={getStatusColor(health.checks.storage.status)}>
                  {health.checks.storage.status === 'up' ? 'Működik' : 'Nem elérhető'}
                </span>
              </div>
              {health.checks.storage.responseTime && (
                <span className="text-sm text-muted-foreground">
                  {health.checks.storage.responseTime}ms
                </span>
              )}
            </div>
            {health.checks.storage.message && (
              <p className="text-sm text-red-600 mt-2">{health.checks.storage.message}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Queue Status */}
      {health.checks.queues && (
        <Card>
          <CardHeader>
            <CardTitle>Feldolgozási Sorok</CardTitle>
            <CardDescription>Háttérfolyamatok állapota</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(health.checks.queues).map(([queueName, queue]) => (
                <div key={queueName} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium capitalize">{queueName.replace('_', ' ')}</h4>
                    <Badge variant={queue.status === 'healthy' ? 'default' : 'destructive'}>
                      {queue.status === 'healthy' ? 'Működik' : 'Hiba'}
                    </Badge>
                  </div>
                  {queue.metrics && (
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Várakozó:</span>
                        <p className="font-medium">{queue.metrics.waiting}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Aktív:</span>
                        <p className="font-medium">{queue.metrics.active}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Befejezett:</span>
                        <p className="font-medium">{queue.metrics.completed}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sikertelen:</span>
                        <p className="font-medium text-red-600">{queue.metrics.failed}</p>
                      </div>
                    </div>
                  )}
                  {queue.error && (
                    <p className="text-sm text-red-600 mt-2">{queue.error}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* External Services */}
      {health.checks.external && (
        <Card>
          <CardHeader>
            <CardTitle>Külső Szolgáltatások</CardTitle>
            <CardDescription>AI és egyéb integrációk állapota</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(health.checks.external).map(([serviceName, service]) => (
                <div key={serviceName} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium capitalize">{serviceName.replace('_', ' ')}</h4>
                    {getStatusIcon(service.status)}
                  </div>
                  {service.latency && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Válaszidő: {service.latency}ms
                    </p>
                  )}
                  {service.error && (
                    <p className="text-sm text-red-600 mt-1">{service.error}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Link */}
      <Card>
        <CardHeader>
          <CardTitle>Prometheus Metrikák</CardTitle>
          <CardDescription>Részletes teljesítmény adatok</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/api/health/metrics" target="_blank" rel="noopener noreferrer">
              Metrikák megtekintése
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}