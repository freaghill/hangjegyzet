'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  Calendar,
  BarChart3,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { hu } from 'date-fns/locale'

interface PredictiveAnalyticsProps {
  organizationId: string
  timeRange?: 'week' | 'month' | 'quarter' | 'year'
}

interface PredictionData {
  meetingPredictions: {
    nextWeek: number
    accuracy: number
    trend: 'up' | 'down' | 'stable'
    byType: Array<{
      type: string
      count: number
      probability: number
    }>
  }
  durationPredictions: {
    average: number
    byType: Record<string, number>
    overrunRisk: Array<{
      meetingType: string
      risk: number
      factors: string[]
    }>
  }
  participantPredictions: {
    topParticipants: Array<{
      email: string
      name?: string
      meetingCount: number
      engagementScore: number
    }>
    teamDynamics: {
      collaboration: number
      balance: number
      productivity: number
    }
  }
  topicPredictions: Array<{
    topic: string
    frequency: number
    trend: 'increasing' | 'decreasing' | 'stable'
    nextOccurrence: string
  }>
  riskPredictions: Array<{
    type: 'overrun' | 'low_engagement' | 'imbalance' | 'fatigue'
    severity: 'high' | 'medium' | 'low'
    description: string
    mitigation: string
  }>
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1']

export function PredictiveAnalytics({ 
  organizationId, 
  timeRange = 'month' 
}: PredictiveAnalyticsProps) {
  const [predictions, setPredictions] = useState<PredictionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<'meetings' | 'duration' | 'participants' | 'topics'>('meetings')

  useEffect(() => {
    fetchPredictions()
  }, [organizationId, timeRange])

  const fetchPredictions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/ai/predictions?organizationId=${organizationId}&timeRange=${timeRange}`)
      
      if (!response.ok) throw new Error('Failed to fetch predictions')
      
      const data = await response.json()
      setPredictions(data)
    } catch (error) {
      console.error('Error fetching predictions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <PredictiveAnalyticsSkeleton />
  }

  if (!predictions) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Nincs elegendő adat az előrejelzésekhez</p>
        </CardContent>
      </Card>
    )
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getRiskIcon = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />
      default:
        return <CheckCircle className="h-4 w-4 text-green-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Következő Hét
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{predictions.meetingPredictions.nextWeek}</span>
              <span className="text-sm text-gray-500">meeting</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {getTrendIcon(predictions.meetingPredictions.trend)}
              <span className="text-xs text-gray-600">
                {predictions.meetingPredictions.accuracy}% pontosság
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Átlag Időtartam
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{predictions.durationPredictions.average}</span>
              <span className="text-sm text-gray-500">perc</span>
            </div>
            <Badge variant="outline" className="mt-2 text-xs">
              Várható érték
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Csapat Dinamika
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {predictions.participantPredictions.teamDynamics.productivity}%
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              Produktivitás index
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Kockázatok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {predictions.riskPredictions.filter(r => r.severity === 'high').length}
              </span>
              <span className="text-sm text-gray-500">magas</span>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              Azonnali figyelmet igényel
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Áttekintés</TabsTrigger>
          <TabsTrigger value="meetings">Meetingek</TabsTrigger>
          <TabsTrigger value="participants">Résztvevők</TabsTrigger>
          <TabsTrigger value="risks">Kockázatok</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Meeting Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Meeting Típusok Előrejelzése</CardTitle>
              <CardDescription>
                Várható meeting típusok megoszlása a következő héten
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={predictions.meetingPredictions.byType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {predictions.meetingPredictions.byType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Topic Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Téma Trendek</CardTitle>
              <CardDescription>
                Legnépszerűbb témák és előrejelzett előfordulásuk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.topicPredictions.slice(0, 5).map((topic, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Target className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium text-sm">{topic.topic}</p>
                        <p className="text-xs text-gray-500">
                          Következő: {topic.nextOccurrence}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        topic.trend === 'increasing' ? 'default' :
                        topic.trend === 'decreasing' ? 'secondary' :
                        'outline'
                      } className="text-xs">
                        {topic.frequency} alkalom
                      </Badge>
                      {topic.trend === 'increasing' && <TrendingUp className="h-3 w-3 text-green-600" />}
                      {topic.trend === 'decreasing' && <TrendingDown className="h-3 w-3 text-red-600" />}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          {/* Duration Predictions by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Időtartam Előrejelzések</CardTitle>
              <CardDescription>
                Várható meeting időtartamok típus szerint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(predictions.durationPredictions.byType).map(([type, duration]) => ({
                  type,
                  duration
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="duration" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Overrun Risk Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Túlfutás Kockázat</CardTitle>
              <CardDescription>
                Meeting típusok túlfutási valószínűsége
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.durationPredictions.overrunRisk.map((risk, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{risk.meetingType}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              risk.risk > 70 ? 'bg-red-500' :
                              risk.risk > 40 ? 'bg-amber-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${risk.risk}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-10">{risk.risk}%</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Tényezők: {risk.factors.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants" className="space-y-4">
          {/* Team Dynamics Radar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Csapat Dinamika</CardTitle>
              <CardDescription>
                Együttműködési és produktivitási mutatók
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={[
                  {
                    metric: 'Együttműködés',
                    value: predictions.participantPredictions.teamDynamics.collaboration
                  },
                  {
                    metric: 'Egyensúly',
                    value: predictions.participantPredictions.teamDynamics.balance
                  },
                  {
                    metric: 'Produktivitás',
                    value: predictions.participantPredictions.teamDynamics.productivity
                  }
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Érték" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Participants */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aktív Résztvevők</CardTitle>
              <CardDescription>
                Legaktívabb résztvevők és részvételi előrejelzés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {predictions.participantPredictions.topParticipants.map((participant, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">
                        {participant.name || participant.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {participant.meetingCount} meeting várható
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {participant.engagementScore}% részvétel
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          {/* Risk Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kockázati Mátrix</CardTitle>
              <CardDescription>
                Azonosított kockázatok és javasolt intézkedések
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.riskPredictions.map((risk, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border ${
                    risk.severity === 'high' ? 'border-red-200 bg-red-50' :
                    risk.severity === 'medium' ? 'border-amber-200 bg-amber-50' :
                    'border-green-200 bg-green-50'
                  }`}>
                    <div className="flex items-start gap-3">
                      {getRiskIcon(risk.severity)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">
                            {risk.type === 'overrun' && 'Túlfutás kockázat'}
                            {risk.type === 'low_engagement' && 'Alacsony részvétel'}
                            {risk.type === 'imbalance' && 'Egyensúlyhiány'}
                            {risk.type === 'fatigue' && 'Meeting fáradtság'}
                          </h4>
                          <Badge variant={
                            risk.severity === 'high' ? 'destructive' :
                            risk.severity === 'medium' ? 'default' :
                            'secondary'
                          } className="text-xs">
                            {risk.severity === 'high' ? 'Magas' :
                             risk.severity === 'medium' ? 'Közepes' :
                             'Alacsony'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                        <div className="p-2 bg-white bg-opacity-50 rounded text-xs">
                          <strong>Javasolt intézkedés:</strong> {risk.mitigation}
                        </div>
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

function PredictiveAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}