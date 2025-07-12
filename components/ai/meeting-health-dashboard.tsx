'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Heart,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Target,
  Gauge,
  Sparkles
} from 'lucide-react'
import {
  ResponsiveContainer,
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
  RadialBarChart,
  RadialBar,
  PolarAngleAxis
} from 'recharts'
import { cn } from '@/lib/utils'

interface MeetingHealthDashboardProps {
  organizationId: string
  timeRange?: 'week' | 'month' | 'quarter' | 'year'
}

interface HealthMetrics {
  overallHealth: {
    score: number
    trend: 'improving' | 'declining' | 'stable'
    changePercent: number
  }
  keyMetrics: {
    efficiency: {
      score: number
      trend: 'up' | 'down' | 'stable'
      description: string
    }
    engagement: {
      score: number
      trend: 'up' | 'down' | 'stable'
      description: string
    }
    balance: {
      score: number
      trend: 'up' | 'down' | 'stable'
      description: string
    }
    productivity: {
      score: number
      trend: 'up' | 'down' | 'stable'
      description: string
    }
  }
  meetingStats: {
    totalMeetings: number
    averageDuration: number
    overrunPercentage: number
    cancelledMeetings: number
    recurringMeetings: number
  }
  participantStats: {
    averageAttendees: number
    participationRate: number
    uniqueParticipants: number
    meetingFatigue: number
  }
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    category: 'efficiency' | 'engagement' | 'balance' | 'productivity'
    title: string
    description: string
    impact: string
    action: string
  }>
  trends: {
    health: Array<{ date: string; score: number }>
    metrics: Array<{
      date: string
      efficiency: number
      engagement: number
      balance: number
      productivity: number
    }>
  }
  benchmarks: {
    industry: {
      health: number
      efficiency: number
      engagement: number
    }
    topPerformers: {
      health: number
      efficiency: number
      engagement: number
    }
  }
}

export function MeetingHealthDashboard({ 
  organizationId, 
  timeRange = 'month' 
}: MeetingHealthDashboardProps) {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'efficiency' | 'engagement' | 'balance' | 'productivity'>('all')

  useEffect(() => {
    fetchHealthMetrics()
  }, [organizationId, timeRange])

  const fetchHealthMetrics = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/ai/analytics?organizationId=${organizationId}&timeRange=${timeRange}`)
      
      if (!response.ok) throw new Error('Failed to fetch health metrics')
      
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error('Error fetching health metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <MeetingHealthDashboardSkeleton />
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Nincs adat</AlertTitle>
        <AlertDescription>
          Nem található elegendő meeting adat az elemzéshez
        </AlertDescription>
      </Alert>
    )
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthBadge = (score: number) => {
    if (score >= 80) return { variant: 'default' as const, text: 'Kiváló' }
    if (score >= 60) return { variant: 'secondary' as const, text: 'Jó' }
    if (score >= 40) return { variant: 'outline' as const, text: 'Fejlesztendő' }
    return { variant: 'destructive' as const, text: 'Kritikus' }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable' | 'improving' | 'declining') => {
    if (trend === 'up' || trend === 'improving') {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    }
    if (trend === 'down' || trend === 'declining') {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    }
    return <Activity className="h-4 w-4 text-gray-600" />
  }

  const metricDetails = {
    efficiency: {
      icon: <Clock className="h-5 w-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    engagement: {
      icon: <Users className="h-5 w-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    balance: {
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    productivity: {
      icon: <Target className="h-5 w-5" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Meeting Egészség
              </CardTitle>
              <CardDescription>
                Szervezeti meeting kultúra átfogó értékelése
              </CardDescription>
            </div>
            <Badge {...getHealthBadge(metrics.overallHealth.score)}>
              {getHealthBadge(metrics.overallHealth.score).text}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-3">
              <span className={cn("text-5xl font-bold", getHealthColor(metrics.overallHealth.score))}>
                {metrics.overallHealth.score}
              </span>
              <span className="text-gray-500">/100</span>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon(metrics.overallHealth.trend)}
              <span className={cn(
                "text-sm font-medium",
                metrics.overallHealth.changePercent > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {metrics.overallHealth.changePercent > 0 ? '+' : ''}{metrics.overallHealth.changePercent}%
              </span>
            </div>
          </div>
          
          {/* Health Gauge */}
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="60%" 
                outerRadius="90%" 
                startAngle={180} 
                endAngle={0}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  fill={
                    metrics.overallHealth.score >= 80 ? '#10b981' :
                    metrics.overallHealth.score >= 60 ? '#f59e0b' :
                    '#ef4444'
                  }
                  data={[{ value: metrics.overallHealth.score }]}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(metrics.keyMetrics).map(([key, metric]) => {
          const detail = metricDetails[key as keyof typeof metricDetails]
          return (
            <Card key={key} className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedMetric === key && "ring-2 ring-offset-2 ring-blue-500"
            )} onClick={() => setSelectedMetric(key as any)}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className={detail.color}>{detail.icon}</div>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{metric.score}</span>
                  {getTrendIcon(metric.trend)}
                </div>
                <Progress value={metric.score} className="h-2 mb-2" />
                <p className="text-xs text-gray-600">{metric.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Meeting Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meeting Statisztikák
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Összes meeting</span>
                <span className="font-medium">{metrics.meetingStats.totalMeetings}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Átlag időtartam</span>
                <span className="font-medium">{metrics.meetingStats.averageDuration} perc</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Túlfutás arány</span>
                <Badge variant={metrics.meetingStats.overrunPercentage > 20 ? 'destructive' : 'secondary'}>
                  {metrics.meetingStats.overrunPercentage}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Lemondott meetingek</span>
                <span className="font-medium">{metrics.meetingStats.cancelledMeetings}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ismétlődő meetingek</span>
                <span className="font-medium">{metrics.meetingStats.recurringMeetings}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Résztvevői Statisztikák
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Átlag résztvevők</span>
                <span className="font-medium">{metrics.participantStats.averageAttendees}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Részvételi arány</span>
                <Badge variant="default">{metrics.participantStats.participationRate}%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Egyedi résztvevők</span>
                <span className="font-medium">{metrics.participantStats.uniqueParticipants}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Meeting fáradtság</span>
                <Badge variant={metrics.participantStats.meetingFatigue > 60 ? 'destructive' : 'secondary'}>
                  {metrics.participantStats.meetingFatigue}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Egészség Trendek</CardTitle>
          <CardDescription>
            Meeting egészség változása időben
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.trends.health}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Javaslatok
          </CardTitle>
          <CardDescription>
            Személyre szabott javaslatok a meeting kultúra javítására
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.recommendations.map((rec, idx) => {
              const detail = metricDetails[rec.category]
              return (
                <div key={idx} className={cn(
                  "p-4 rounded-lg border",
                  detail.bgColor,
                  detail.borderColor
                )}>
                  <div className="flex items-start gap-3">
                    <div className={detail.color}>{detail.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{rec.title}</h4>
                        <Badge variant={
                          rec.priority === 'high' ? 'destructive' :
                          rec.priority === 'medium' ? 'default' :
                          'secondary'
                        } className="text-xs">
                          {rec.priority === 'high' ? 'Sürgős' :
                           rec.priority === 'medium' ? 'Fontos' :
                           'Ajánlott'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="font-medium">Hatás:</span>
                        <span>{rec.impact}</span>
                      </div>
                      <Button size="sm" variant="outline" className="mt-3">
                        {rec.action}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Benchmarking */}
      <Card>
        <CardHeader>
          <CardTitle>Benchmark Összehasonlítás</CardTitle>
          <CardDescription>
            Teljesítmény az iparági átlaghoz és a legjobb gyakorlatokhoz képest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              {
                metric: 'Egészség',
                saját: metrics.overallHealth.score,
                iparág: metrics.benchmarks.industry.health,
                top: metrics.benchmarks.topPerformers.health
              },
              {
                metric: 'Hatékonyság',
                saját: metrics.keyMetrics.efficiency.score,
                iparág: metrics.benchmarks.industry.efficiency,
                top: metrics.benchmarks.topPerformers.efficiency
              },
              {
                metric: 'Részvétel',
                saját: metrics.keyMetrics.engagement.score,
                iparág: metrics.benchmarks.industry.engagement,
                top: metrics.benchmarks.topPerformers.engagement
              }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="saját" fill="#3b82f6" />
              <Bar dataKey="iparág" fill="#10b981" />
              <Bar dataKey="top" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function MeetingHealthDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}