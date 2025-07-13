'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  AlertTriangle, 
  Activity, 
  TrendingUp, 
  Users, 
  Server,
  Database,
  MemoryStick,
  Cpu,
  DollarSign,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Scale,
  Target
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from 'recharts'
import MonitoringDashboard from '@/components/admin/monitoring-dashboard'

interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    loadAverage: number[]
  }
  memory: {
    total: number
    used: number
    free: number
    percentage: number
  }
  database: {
    activeConnections: number
    poolSize: number
    avgQueryTime: number
    slowQueries: number
  }
  redis: {
    connected: boolean
    hitRate: number
    memory: number
    keys: number
  }
  uptime: number
  timestamp: string
}

interface UsageMetrics {
  overview: {
    totalTranscriptions: number
    activeOrganizations: number
    totalMinutesTranscribed: number
    averageDuration: number
    monthlyActiveUsers: number
  }
  revenue: {
    mrr: number
    arr: number
    averageRevenuePerUser: number
    churnRate: number
  }
  modeDistribution: {
    fast: number
    balanced: number
    precision: number
  }
  topOrganizations: Array<{
    id: string
    name: string
    usage: number
    subscription_tier: string
  }>
  growth: {
    transcriptionsGrowth: number
    userGrowth: number
    revenueGrowth: number
  }
}

interface Alert {
  id: string
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  organizationName?: string
  createdAt: string
  acknowledged: boolean
  resolved: boolean
}

const COLORS = {
  fast: '#10b981',
  balanced: '#3b82f6',
  precision: '#f59e0b',
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6'
}

export default function MonitoringDashboard() {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertStats, setAlertStats] = useState<any>(null)
  const [timeSeriesData, setTimeSeriesData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds
  const [exportType, setExportType] = useState('usage')
  const [exportFormat, setExportFormat] = useState('csv')

  useEffect(() => {
    loadAllData()
    
    if (autoRefresh) {
      const interval = setInterval(loadAllData, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const loadAllData = async () => {
    if (!loading) setRefreshing(true)
    
    try {
      // Load all data in parallel
      const [system, usage, alertsData, timeSeries] = await Promise.all([
        fetch('/api/admin/monitoring/system').then(res => res.json()),
        fetch('/api/admin/monitoring/usage').then(res => res.json()),
        fetch('/api/admin/monitoring/alerts').then(res => res.json()),
        fetch('/api/admin/monitoring/timeseries?days=30').then(res => res.json())
      ])

      setSystemMetrics(system)
      setUsageMetrics(usage)
      setAlerts(alertsData.alerts || [])
      setAlertStats(alertsData.statistics || null)
      setTimeSeriesData(timeSeries)
    } catch (error) {
      console.error('Error loading monitoring data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve') => {
    try {
      const response = await fetch('/api/admin/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, action })
      })

      if (response.ok) {
        loadAllData() // Reload to get updated alerts
      }
    } catch (error) {
      console.error('Error updating alert:', error)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/admin/monitoring/export?type=${exportType}&format=${exportFormat}`
      )

      if (response.ok) {
        if (exportFormat === 'csv') {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${exportType}_export_${new Date().toISOString().slice(0, 10)}.csv`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        } else {
          const data = await response.json()
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = data.filename
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading monitoring data...</p>
        </div>
      </div>
    )
  }

  const modeDistributionData = usageMetrics ? [
    { name: 'Fast', value: usageMetrics.modeDistribution.fast, color: COLORS.fast },
    { name: 'Balanced', value: usageMetrics.modeDistribution.balanced, color: COLORS.balanced },
    { name: 'Precision', value: usageMetrics.modeDistribution.precision, color: COLORS.precision }
  ] : []

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-gray-600 mt-1">Real-time system metrics and usage analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Auto-refresh:</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            {autoRefresh && (
              <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30s</SelectItem>
                  <SelectItem value="60">1m</SelectItem>
                  <SelectItem value="300">5m</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <Button
            onClick={loadAllData}
            disabled={refreshing}
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Transcriptions</p>
                    <p className="text-2xl font-bold">{usageMetrics?.overview.totalTranscriptions.toLocaleString()}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Organizations</p>
                    <p className="text-2xl font-bold">{usageMetrics?.overview.activeOrganizations}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">MRR</p>
                    <p className="text-2xl font-bold">${usageMetrics?.revenue.mrr.toLocaleString()}</p>
                    <p className="text-sm text-green-600">
                      +{usageMetrics?.growth.revenueGrowth.toFixed(1)}%
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                    <p className="text-2xl font-bold text-red-600">{alertStats?.active || 0}</p>
                    <p className="text-sm text-gray-600">
                      {alertStats?.critical || 0} critical
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Usage Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Trends (30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData?.usageTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="fast" stackId="1" stroke={COLORS.fast} fill={COLORS.fast} />
                      <Area type="monotone" dataKey="balanced" stackId="1" stroke={COLORS.balanced} fill={COLORS.balanced} />
                      <Area type="monotone" dataKey="precision" stackId="1" stroke={COLORS.precision} fill={COLORS.precision} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Mode Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Mode Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modeDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {modeDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {modeDistributionData.map((mode) => (
                    <div key={mode.name} className="text-center">
                      <p className="text-sm text-gray-600">{mode.name}</p>
                      <p className="text-lg font-bold" style={{ color: mode.color }}>
                        {mode.value.toLocaleString()} min
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Organizations */}
          <Card>
            <CardHeader>
              <CardTitle>Top Organizations by Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {usageMetrics?.topOrganizations.map((org) => (
                  <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <Badge variant="secondary" className="mt-1">{org.subscription_tier}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{org.usage.toLocaleString()} min</p>
                      <p className="text-sm text-gray-600">this month</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-4">
          <MonitoringDashboard />
        </TabsContent>

        {/* Usage Analytics Tab */}
        <TabsContent value="usage" className="space-y-4">
          {/* Revenue Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">MRR</p>
                <p className="text-2xl font-bold">${usageMetrics?.revenue.mrr.toLocaleString()}</p>
                <p className={`text-sm ${usageMetrics?.growth.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {usageMetrics?.growth.revenueGrowth >= 0 ? '+' : ''}{usageMetrics?.growth.revenueGrowth.toFixed(1)}% vs last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">ARR</p>
                <p className="text-2xl font-bold">${usageMetrics?.revenue.arr.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">ARPU</p>
                <p className="text-2xl font-bold">${usageMetrics?.revenue.averageRevenuePerUser.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">Churn Rate</p>
                <p className="text-2xl font-bold">{usageMetrics?.revenue.churnRate.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends (12 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeriesData?.revenueMetrics || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="mrr" fill="#3b82f6" name="MRR" />
                    <Bar dataKey="newMRR" fill="#10b981" name="New MRR" />
                    <Bar dataKey="expansionMRR" fill="#f59e0b" name="Expansion MRR" />
                    <Bar dataKey="churnedMRR" fill="#ef4444" name="Churned MRR" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Organization Growth */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData?.organizationGrowth || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="activeOrgs" stroke="#3b82f6" name="Active Organizations" />
                    <Line type="monotone" dataKey="newOrgs" stroke="#10b981" name="New Organizations" />
                    <Line type="monotone" dataKey="churnedOrgs" stroke="#ef4444" name="Churned Organizations" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {/* Alert Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold">{alertStats?.active || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{alertStats?.critical || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">High</p>
                <p className="text-2xl font-bold text-orange-600">{alertStats?.high || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-green-600">{alertStats?.resolvedToday || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                <p className="text-2xl font-bold">{alertStats?.averageResolutionTime || 0}m</p>
              </CardContent>
            </Card>
          </div>

          {/* Alert List */}
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No active alerts</p>
                  </div>
                ) : (
                  alerts.filter(a => !a.resolved).map((alert) => (
                    <Alert key={alert.id} className={`border-l-4 ${
                      alert.severity === 'critical' ? 'border-red-500' :
                      alert.severity === 'high' ? 'border-orange-500' :
                      alert.severity === 'medium' ? 'border-yellow-500' :
                      'border-blue-500'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle className="text-base">{alert.title}</AlertTitle>
                            <Badge variant={
                              alert.severity === 'critical' ? 'destructive' :
                              alert.severity === 'high' ? 'default' :
                              'secondary'
                            }>
                              {alert.severity}
                            </Badge>
                          </div>
                          <AlertDescription>
                            {alert.description}
                            {alert.organizationName && (
                              <span className="block mt-1 text-sm">
                                Organization: <strong>{alert.organizationName}</strong>
                              </span>
                            )}
                            <span className="block mt-1 text-xs text-gray-500">
                              <Clock className="inline h-3 w-3 mr-1" />
                              {new Date(alert.createdAt).toLocaleString()}
                            </span>
                          </AlertDescription>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {!alert.acknowledged && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                            >
                              Acknowledge
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAlertAction(alert.id, 'resolve')}
                          >
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </Alert>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>
                Export monitoring data for analysis or reporting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Data Type</label>
                  <Select value={exportType} onValueChange={setExportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usage">Usage Data</SelectItem>
                      <SelectItem value="alerts">Alerts</SelectItem>
                      <SelectItem value="performance">Performance Metrics</SelectItem>
                      <SelectItem value="organizations">Organizations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Format</label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleExport} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export {exportType} as {exportFormat.toUpperCase()}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}