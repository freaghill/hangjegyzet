'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Award,
  Briefcase,
  BarChart3,
  Activity,
  Calendar
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { AnalyticsService } from '@/lib/analytics/analytics-service'
import { BusinessMetrics } from '@/lib/analytics/types'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'

interface BusinessAnalyticsProps {
  days: number
}

export function BusinessAnalytics({ days }: BusinessAnalyticsProps) {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [days])

  const loadMetrics = async () => {
    setIsLoading(true)
    try {
      const analyticsService = new AnalyticsService()
      const data = await analyticsService.getBusinessMetrics(days)
      setMetrics(data)
    } catch (error) {
      console.error('Error loading business metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
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

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Calculate growth rates
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  // Prepare chart data
  const revenueData = metrics.revenue.monthly.map(item => ({
    month: format(new Date(item.month), 'MMM', { locale: hu }),
    revenue: item.total,
    subscriptions: item.subscriptions,
    oneTime: item.oneTime
  }))

  const conversionData = [
    { name: 'Látogatók', value: metrics.conversion.visitors },
    { name: 'Regisztráltak', value: metrics.conversion.signups },
    { name: 'Fizetők', value: metrics.conversion.paidUsers }
  ]

  const retentionData = Object.entries(metrics.retention).map(([period, rate]) => ({
    period: period === 'day1' ? '1 nap' :
            period === 'day7' ? '7 nap' :
            period === 'day30' ? '30 nap' :
            period === 'day90' ? '90 nap' : period,
    rate: rate * 100
  }))

  const featureUsageData = Object.entries(metrics.featureUsage).map(([feature, usage]) => ({
    feature: feature === 'transcription' ? 'Átírás' :
            feature === 'export' ? 'Exportálás' :
            feature === 'sharing' ? 'Megosztás' :
            feature === 'teams' ? 'Csapatok' :
            feature === 'search' ? 'Keresés' : feature,
    usage: usage
  }))

  const userSegmentData = Object.entries(metrics.userSegments).map(([segment, count]) => ({
    name: segment === 'free' ? 'Ingyenes' :
          segment === 'basic' ? 'Alap' :
          segment === 'pro' ? 'Pro' :
          segment === 'enterprise' ? 'Vállalati' : segment,
    value: count
  }))

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Havi bevétel</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.revenue.current)}</div>
            <p className="text-xs text-muted-foreground">
              {calculateGrowth(metrics.revenue.current, metrics.revenue.previous) > 0 ? '+' : ''}
              {calculateGrowth(metrics.revenue.current, metrics.revenue.previous).toFixed(1)}% előző hónaphoz képest
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fizető felhasználók</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.payingUsers.current}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.payingUsers.new} új az elmúlt {days} napban
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.arpu)}</div>
            <p className="text-xs text-muted-foreground">
              Átlagos bevétel felhasználónként
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lemorzsolódás</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.churnRate * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Havi lemorzsolódási ráta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LTV</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.ltv)}</div>
            <p className="text-xs text-muted-foreground">
              Ügyfél életciklus értéke
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CAC</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.cac)}</div>
            <p className="text-xs text-muted-foreground">
              Ügyfélszerzési költség
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.mrr)}</div>
            <p className="text-xs text-muted-foreground">
              Havi ismétlődő bevétel
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Konverzió</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((metrics.conversion.paidUsers / metrics.conversion.visitors) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Látogatóból fizető
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Bevétel alakulása</CardTitle>
            <CardDescription>
              Havi bevétel megoszlása
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="subscriptions" 
                  stackId="1"
                  stroke="#3b82f6" 
                  fill="#3b82f6"
                  name="Előfizetések"
                />
                <Area 
                  type="monotone" 
                  dataKey="oneTime" 
                  stackId="1"
                  stroke="#10b981" 
                  fill="#10b981"
                  name="Egyszeri"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Konverziós tölcsér</CardTitle>
            <CardDescription>
              Látogatók átalakulása fizetővé
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={conversionData} 
                layout="horizontal"
                margin={{ left: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6">
                  {conversionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Segments */}
        <Card>
          <CardHeader>
            <CardTitle>Felhasználói szegmensek</CardTitle>
            <CardDescription>
              Felhasználók megoszlása csomag szerint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userSegmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userSegmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Retention Cohort */}
        <Card>
          <CardHeader>
            <CardTitle>Megtartási ráta</CardTitle>
            <CardDescription>
              Felhasználók visszatérési aránya
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Feature Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Funkció használat</CardTitle>
            <CardDescription>
              Legnépszerűbb funkciók
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={featureUsageData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="feature" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar 
                  name="Használat" 
                  dataKey="usage" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  fillOpacity={0.6} 
                />
                <Tooltip formatter={(value: number) => `${value}%`} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Growth Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Növekedési mutatók</CardTitle>
            <CardDescription>
              Kulcs üzleti metrikák trendje
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Napi növekedés</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-600">
                    {metrics.growthRate.daily.toFixed(1)}%
                  </span>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Heti növekedés</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-blue-600">
                    {metrics.growthRate.weekly.toFixed(1)}%
                  </span>
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Havi növekedés</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-purple-600">
                    {metrics.growthRate.monthly.toFixed(1)}%
                  </span>
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">
                  A jelenlegi növekedési ütem alapján a felhasználóbázis 
                  <span className="font-bold"> {Math.round(365 / (metrics.growthRate.daily || 1))} nap</span> alatt 
                  duplázódik meg.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}