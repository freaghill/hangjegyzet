'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Mic, 
  TrendingUp, 
  TrendingDown,
  MessageSquare,
  Clock,
  Users,
  BarChart3,
  Activity,
  Award,
  AlertTriangle,
  Zap,
  Volume2
} from 'lucide-react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { cn } from '@/lib/utils'

interface SpeakerAnalyticsProps {
  meetingId?: string
  organizationId?: string
  speakerEmail?: string
  timeRange?: 'meeting' | 'week' | 'month' | 'all'
}

interface SpeakerMetrics {
  email: string
  name?: string
  avatar?: string
  overallStats: {
    totalSpeakingTime: number
    averageSpeakingTime: number
    meetingCount: number
    participationRate: number
    sentimentScore: number
    engagementScore: number
  }
  speakingPatterns: {
    pace: number // words per minute
    pauseFrequency: number
    fillerWords: number
    clarityScore: number
    volumeVariation: number
  }
  interactionMetrics: {
    interruptions: number
    questionsAsked: number
    responsiveness: number
    turnTaking: number
    dominanceScore: number
  }
  performanceMetrics: {
    leadership: number
    collaboration: number
    clarity: number
    impact: number
    preparation: number
  }
  trends: {
    speakingTime: Array<{ date: string; value: number }>
    engagement: Array<{ date: string; value: number }>
    sentiment: Array<{ date: string; value: number }>
  }
  comparisons: {
    vsTeamAverage: {
      speakingTime: number
      engagement: number
      sentiment: number
    }
    ranking: {
      speakingTime: number
      engagement: number
      overall: number
    }
  }
  insights: Array<{
    type: 'strength' | 'improvement' | 'observation'
    message: string
    metric?: string
    value?: number
  }>
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function SpeakerAnalytics({
  meetingId,
  organizationId,
  speakerEmail,
  timeRange = 'month'
}: SpeakerAnalyticsProps) {
  const [speakers, setSpeakers] = useState<SpeakerMetrics[]>([])
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSpeakerAnalytics()
  }, [meetingId, organizationId, speakerEmail, timeRange])

  const fetchSpeakerAnalytics = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (meetingId) params.append('meetingId', meetingId)
      if (organizationId) params.append('organizationId', organizationId)
      if (speakerEmail) params.append('speakerEmail', speakerEmail)
      params.append('timeRange', timeRange)

      const response = await fetch(`/api/ai/speakers?${params}`)
      if (!response.ok) throw new Error('Failed to fetch speaker analytics')

      const data = await response.json()
      setSpeakers(data.speakers || [])
      
      if (data.speakers && data.speakers.length > 0) {
        setSelectedSpeaker(data.speakers[0])
      }
    } catch (error) {
      console.error('Error fetching speaker analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-32 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!selectedSpeaker) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Nincs elérhető beszélő elemzés</p>
        </CardContent>
      </Card>
    )
  }

  const getPerformanceColor = (value: number) => {
    if (value >= 80) return 'text-green-600'
    if (value >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'strength':
        return <Award className="h-4 w-4 text-green-600" />
      case 'improvement':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />
      default:
        return <Activity className="h-4 w-4 text-blue-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Speaker Selector */}
      {speakers.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {speakers.map((speaker) => (
            <Button
              key={speaker.email}
              variant={selectedSpeaker?.email === speaker.email ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSpeaker(speaker)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Avatar className="h-6 w-6">
                <div className="bg-gray-200 w-full h-full flex items-center justify-center text-xs">
                  {(speaker.name || speaker.email).charAt(0).toUpperCase()}
                </div>
              </Avatar>
              {speaker.name || speaker.email}
            </Button>
          ))}
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Beszédidő
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {selectedSpeaker.overallStats.averageSpeakingTime}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Átlagos részesedés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Részvétel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {selectedSpeaker.overallStats.participationRate}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {selectedSpeaker.overallStats.meetingCount} meeting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Aktivitás
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {selectedSpeaker.overallStats.engagementScore}
              </span>
              <span className="text-sm text-gray-500">/100</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Engagement pontszám
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Hangulat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-2xl font-bold",
                selectedSpeaker.overallStats.sentimentScore > 60 ? 'text-green-600' :
                selectedSpeaker.overallStats.sentimentScore > 40 ? 'text-yellow-600' :
                'text-red-600'
              )}>
                {selectedSpeaker.overallStats.sentimentScore > 60 ? 'Pozitív' :
                 selectedSpeaker.overallStats.sentimentScore > 40 ? 'Semleges' :
                 'Negatív'}
              </span>
            </div>
            <Progress 
              value={selectedSpeaker.overallStats.sentimentScore} 
              className="h-1 mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Teljesítmény</TabsTrigger>
          <TabsTrigger value="patterns">Minták</TabsTrigger>
          <TabsTrigger value="interactions">Interakciók</TabsTrigger>
          <TabsTrigger value="trends">Trendek</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          {/* Performance Radar */}
          <Card>
            <CardHeader>
              <CardTitle>Teljesítmény Profil</CardTitle>
              <CardDescription>
                Kulcs kompetenciák értékelése
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={[
                  { skill: 'Vezetés', value: selectedSpeaker.performanceMetrics.leadership },
                  { skill: 'Együttműködés', value: selectedSpeaker.performanceMetrics.collaboration },
                  { skill: 'Tisztaság', value: selectedSpeaker.performanceMetrics.clarity },
                  { skill: 'Hatás', value: selectedSpeaker.performanceMetrics.impact },
                  { skill: 'Felkészültség', value: selectedSpeaker.performanceMetrics.preparation }
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar 
                    name="Pontszám" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Kulcs Megfigyelések</CardTitle>
              <CardDescription>
                AI által azonosított erősségek és fejlesztési területek
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedSpeaker.insights.map((insight, idx) => (
                  <div key={idx} className={cn(
                    "p-3 rounded-lg border",
                    insight.type === 'strength' ? 'bg-green-50 border-green-200' :
                    insight.type === 'improvement' ? 'bg-amber-50 border-amber-200' :
                    'bg-blue-50 border-blue-200'
                  )}>
                    <div className="flex items-start gap-2">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <p className="text-sm">{insight.message}</p>
                        {insight.metric && insight.value && (
                          <p className="text-xs text-gray-600 mt-1">
                            {insight.metric}: {insight.value}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          {/* Speaking Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Beszéd Minták</CardTitle>
              <CardDescription>
                Beszédstílus és kommunikációs jellemzők
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Beszédtempó</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedSpeaker.speakingPatterns.pace}</span>
                    <span className="text-sm text-gray-500">szó/perc</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Hangerő variáció</span>
                  </div>
                  <Progress value={selectedSpeaker.speakingPatterns.volumeVariation} className="w-32" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Töltelékszavak</span>
                  </div>
                  <Badge variant={
                    selectedSpeaker.speakingPatterns.fillerWords < 5 ? 'default' :
                    selectedSpeaker.speakingPatterns.fillerWords < 10 ? 'secondary' :
                    'destructive'
                  }>
                    {selectedSpeaker.speakingPatterns.fillerWords}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Tisztaság pontszám</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedSpeaker.speakingPatterns.clarityScore} className="w-32" />
                    <span className="text-sm text-gray-500">{selectedSpeaker.speakingPatterns.clarityScore}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pattern Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Kommunikációs Stílus</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Kijelentések', value: 45 },
                      { name: 'Kérdések', value: 25 },
                      { name: 'Válaszok', value: 20 },
                      { name: 'Javaslatok', value: 10 }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {CHART_COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {['Kijelentések', 'Kérdések', 'Válaszok', 'Javaslatok'].map((type, idx) => (
                  <div key={type} className="flex items-center gap-2 text-sm">
                    <div className={`w-3 h-3 rounded`} style={{ backgroundColor: CHART_COLORS[idx] }} />
                    <span>{type}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          {/* Interaction Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Interakciós Metrikák</CardTitle>
              <CardDescription>
                Együttműködési és kommunikációs mutatók
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Megszakítások</span>
                    <span className="text-sm font-medium">
                      {selectedSpeaker.interactionMetrics.interruptions} alkalom
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(selectedSpeaker.interactionMetrics.interruptions * 10, 100)} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Kérdések száma</span>
                    <span className="text-sm font-medium">
                      {selectedSpeaker.interactionMetrics.questionsAsked}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(selectedSpeaker.interactionMetrics.questionsAsked * 5, 100)} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Válaszkészség</span>
                    <span className="text-sm font-medium">
                      {selectedSpeaker.interactionMetrics.responsiveness}%
                    </span>
                  </div>
                  <Progress 
                    value={selectedSpeaker.interactionMetrics.responsiveness} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Szóátadás</span>
                    <span className="text-sm font-medium">
                      {selectedSpeaker.interactionMetrics.turnTaking}%
                    </span>
                  </div>
                  <Progress 
                    value={selectedSpeaker.interactionMetrics.turnTaking} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Csapat Összehasonlítás</CardTitle>
              <CardDescription>
                Teljesítmény a csapat átlagához képest
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  {
                    metric: 'Beszédidő',
                    saját: selectedSpeaker.overallStats.averageSpeakingTime,
                    csapat: selectedSpeaker.comparisons.vsTeamAverage.speakingTime
                  },
                  {
                    metric: 'Aktivitás',
                    saját: selectedSpeaker.overallStats.engagementScore,
                    csapat: selectedSpeaker.comparisons.vsTeamAverage.engagement
                  },
                  {
                    metric: 'Hangulat',
                    saját: selectedSpeaker.overallStats.sentimentScore,
                    csapat: selectedSpeaker.comparisons.vsTeamAverage.sentiment
                  }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="saját" fill="#3b82f6" />
                  <Bar dataKey="csapat" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Teljesítmény Trendek</CardTitle>
              <CardDescription>
                Időbeli változások és fejlődés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={selectedSpeaker.trends.speakingTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    name="Beszédidő %" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Engagement & Sentiment Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Aktivitás és Hangulat</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={selectedSpeaker.trends.engagement.map((item, idx) => ({
                  ...item,
                  sentiment: selectedSpeaker.trends.sentiment[idx]?.value
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10b981" 
                    name="Aktivitás" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sentiment" 
                    stroke="#f59e0b" 
                    name="Hangulat" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}