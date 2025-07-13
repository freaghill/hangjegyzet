'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Activity,
  BarChart3,
  Clock,
  Zap,
  Target,
  Search,
  Globe
} from 'lucide-react'
import { UsageAnalytics } from '@/components/analytics/usage-analytics'
import { PerformanceAnalytics } from '@/components/analytics/performance-analytics'
import { BusinessAnalytics } from '@/components/analytics/business-analytics'
import { RealtimeMetrics } from '@/components/analytics/realtime-metrics'
import { usePermission } from '@/lib/teams/team-context'
import { toast } from 'sonner'

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d')
  const [isLoading, setIsLoading] = useState(true)
  const hasPermission = usePermission('analytics.view')

  useEffect(() => {
    // Check if user has admin role
    const checkPermission = async () => {
      setIsLoading(false)
      if (!hasPermission) {
        toast.error('Nincs jogosultsága az analitika megtekintéséhez')
      }
    }
    checkPermission()
  }, [hasPermission])

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Hozzáférés megtagadva
        </h2>
        <p className="text-gray-600">
          Az analitika megtekintéséhez adminisztrátori jogosultság szükséges.
        </p>
      </div>
    )
  }

  const getTimeRangeDays = () => {
    switch (timeRange) {
      case '24h': return 1
      case '7d': return 7
      case '30d': return 30
      case '90d': return 90
      default: return 7
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analitika</h1>
          <p className="text-gray-600 mt-1">
            Részletes betekintés a rendszer használatába és teljesítményébe
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Elmúlt 24 óra</SelectItem>
            <SelectItem value="7d">Elmúlt 7 nap</SelectItem>
            <SelectItem value="30d">Elmúlt 30 nap</SelectItem>
            <SelectItem value="90d">Elmúlt 90 nap</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Realtime Metrics */}
      <RealtimeMetrics />

      {/* Analytics Tabs */}
      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Használat
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Teljesítmény
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Üzleti
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usage">
          <UsageAnalytics days={getTimeRangeDays()} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceAnalytics hours={timeRange === '24h' ? 24 : getTimeRangeDays() * 24} />
        </TabsContent>

        <TabsContent value="business">
          <BusinessAnalytics days={getTimeRangeDays()} />
        </TabsContent>
      </Tabs>
    </div>
  )
}