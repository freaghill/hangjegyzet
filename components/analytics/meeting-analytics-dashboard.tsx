'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PolarGrid, PolarAngleAxis
} from 'recharts'
import { 
  TrendingUp, TrendingDown, Users, Clock, Target, Calendar,
  MessageSquare, Brain, BarChart3, Activity, AlertCircle,
  CheckCircle, XCircle, Sparkles
} from 'lucide-react'
import { format, formatDuration } from 'date-fns'
import { hu } from 'date-fns/locale'

interface MeetingAnalyticsDashboardProps {
  organizationId: string
  userRole: string
}

export function MeetingAnalyticsDashboard({ organizationId, userRole }: MeetingAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [isLoading, setIsLoading] = useState(true)
  const [analytics, setAnalytics] = useState<any>(null)

  useEffect(() => {
    loadAnalytics()
  }, [timeRange, organizationId])

  const loadAnalytics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/analytics/meetings?organizationId=${organizationId}&timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}ó ${minutes}p` : `${minutes}p`
  }

  const getChangeIndicator = (current: number, previous: number) => {
    if (!previous) return { value: 0, trend: 'neutral' }
    const change = ((current - previous) / previous) * 100
    return {
      value: Math.abs(change),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    }
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Nem sikerült betölteni az analitikát</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Elmúlt hét</SelectItem>
            <SelectItem value="month">Elmúlt hónap</SelectItem>
            <SelectItem value="quarter">Elmúlt negyedév</SelectItem>
            <SelectItem value="year">Elmúlt év</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Összes meeting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalMeetings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Átlag: {formatSeconds(analytics.overview.averageDuration)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Teljes időtartam</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.overview.totalDuration / 3600)}ó</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.overview.totalParticipants} résztvevő
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Akció pontok</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalActionItems}</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress 
                value={analytics.overview.actionItemCompletionRate} 
                className="h-2 flex-1"
              />
              <span className="text-xs font-medium">
                {Math.round(analytics.overview.actionItemCompletionRate)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Csapat pontszám</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.teamDynamics.collaborationScore}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Részvételi egyensúly: {analytics.teamDynamics.participationBalance}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="trends">Trendek</TabsTrigger>
          <TabsTrigger value="productivity">Produktivitás</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="keywords">Kulcsszavak</TabsTrigger>
          <TabsTrigger value="team">Csapat</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          {/* Meeting Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting trendek</CardTitle>
              <CardDescription>Meetingek száma és időtartama</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.trends.meetingsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(new Date(date), 'MMM d', { locale: hu })}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(date) => format(new Date(date), 'yyyy. MMMM d.', { locale: hu })}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    name="Meetingek száma"
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="duration" 
                    stroke="#10b981" 
                    name="Időtartam (mp)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Action Item Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Akció pont trendek</CardTitle>
              <CardDescription>Létrehozott és befejezett feladatok</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.trends.actionItemTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(new Date(date), 'MMM d', { locale: hu })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => format(new Date(date), 'yyyy. MMMM d.', { locale: hu })}
                  />
                  <Legend />
                  <Bar dataKey="created" fill="#3b82f6" name="Létrehozott" />
                  <Bar dataKey="completed" fill="#10b981" name="Befejezett" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-4">
          {/* Action Items by Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Prioritás szerinti megoszlás</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Sürgős', value: analytics.productivity.actionItemsByPriority.high },
                        { name: 'Közepes', value: analytics.productivity.actionItemsByPriority.medium },
                        { name: 'Alacsony', value: analytics.productivity.actionItemsByPriority.low }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#ef4444" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produktivitás metrikák</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Átlagos befejezési idő</span>
                  <Badge variant="outline">
                    {Math.round(analytics.productivity.averageCompletionTime)} nap
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Lejárt határidejű feladatok</span>
                  <Badge variant="destructive">
                    {analytics.productivity.overdueActionItems}
                  </Badge>
                </div>
                <div className="pt-4">
                  <h4 className="text-sm font-medium mb-2">Közelgő határidők</h4>
                  <div className="space-y-2">
                    {analytics.productivity.upcomingDeadlines.map((item: any, i: number) => (
                      <div key={i} className="text-xs space-y-1 p-2 bg-muted rounded">
                        <p className="font-medium">{item.text}</p>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{item.assignee}</span>
                          <span>{format(new Date(item.deadline), 'MMM d', { locale: hu })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Items by Assignee */}
          <Card>
            <CardHeader>
              <CardTitle>Feladatok felelősök szerint</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={analytics.productivity.actionItemsByAssignee.slice(0, 10)}
                  layout="horizontal"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="assignee" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" stackId="a" fill="#10b981" name="Befejezett" />
                  <Bar dataKey="overdue" stackId="a" fill="#ef4444" name="Lejárt" />
                  <Bar dataKey="total" fill="#3b82f6" name="Összes" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {/* Peak Meeting Times */}
          <Card>
            <CardHeader>
              <CardTitle>Népszerű meeting időpontok</CardTitle>
              <CardDescription>Mikor tartják a legtöbb meetinget</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {['H', 'K', 'Sz', 'Cs', 'P', 'Sz', 'V'].map((day, dayIndex) => (
                  <div key={dayIndex} className="text-center">
                    <p className="text-xs font-medium mb-2">{day}</p>
                    <div className="space-y-1">
                      {[...Array(24)].map((_, hour) => {
                        const peak = analytics.insights.peakMeetingTimes.find(
                          (p: any) => p.dayOfWeek === dayIndex && p.hour === hour
                        )
                        const intensity = peak ? Math.min(peak.count / 5, 1) : 0
                        return (
                          <div
                            key={hour}
                            className="h-3 rounded"
                            style={{
                              backgroundColor: intensity > 0 
                                ? `rgba(59, 130, 246, ${intensity})`
                                : '#f3f4f6'
                            }}
                            title={`${day} ${hour}:00 - ${peak?.count || 0} meeting`}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Most Active Speakers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Legaktívabb résztvevők</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.insights.mostActiveSpeakers.slice(0, 5).map((speaker: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium`}
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        >
                          {speaker.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{speaker.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {speaker.meetingCount} meeting
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatSeconds(speaker.speakingTime)}</p>
                        <p className="text-xs text-muted-foreground">beszédidő</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hangulat megoszlás</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pozitív', value: analytics.insights.sentimentDistribution.positive },
                        { name: 'Semleges', value: analytics.insights.sentimentDistribution.neutral },
                        { name: 'Negatív', value: analytics.insights.sentimentDistribution.negative },
                        { name: 'Vegyes', value: analytics.insights.sentimentDistribution.mixed }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#6b7280" />
                      <Cell fill="#ef4444" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-4">
          {/* Top Keywords */}
          <Card>
            <CardHeader>
              <CardTitle>Top kulcsszavak</CardTitle>
              <CardDescription>Leggyakrabban előforduló témák és kifejezések</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analytics.keywords.topKeywords.map((keyword: any, i: number) => (
                  <Badge 
                    key={i} 
                    variant="secondary"
                    className="text-sm py-1 px-3"
                    style={{ 
                      fontSize: `${Math.min(1.2, 0.8 + keyword.count / 50)}rem`,
                      opacity: Math.min(1, 0.5 + keyword.count / 100)
                    }}
                  >
                    {keyword.word} ({keyword.count})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Trending Topics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Felkapott témák</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.keywords.trendingTopics.map((topic: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="font-medium">{topic.topic}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{topic.mentions}</Badge>
                        <div className="flex items-center gap-1">
                          {topic.growth > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`text-sm font-medium ${
                            topic.growth > 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {Math.abs(topic.growth).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Döntési minták</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.keywords.decisionKeywords.map((decision: any, i: number) => (
                    <div key={i} className="p-2 bg-muted rounded">
                      <p className="text-sm">{decision.phrase}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {decision.frequency} alkalommal
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          {/* Speaking Time Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Beszédidő megoszlás</CardTitle>
              <CardDescription>Ki mennyit beszél a meetingeken</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.teamDynamics.speakingTimeDistribution.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="participant" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                  <Bar dataKey="percentage" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Team Collaboration Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Együttműködési pontszám</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-32">
                  <div className="relative">
                    <svg className="w-32 h-32">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="12"
                        strokeDasharray={`${analytics.teamDynamics.collaborationScore * 3.51} 351.86`}
                        strokeDashoffset="87.96"
                        transform="rotate(-90 64 64)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold">
                        {analytics.teamDynamics.collaborationScore}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Részvételi egyensúly</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <p className="text-4xl font-bold mb-2">
                      {analytics.teamDynamics.participationBalance}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {analytics.teamDynamics.participationBalance > 70 
                        ? 'Kiegyensúlyozott'
                        : analytics.teamDynamics.participationBalance > 50
                        ? 'Mérsékelt'
                        : 'Egyenlőtlen'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interakciók</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.teamDynamics.interactionMatrix.slice(0, 3).map((interaction: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {interaction.from} → {interaction.to}
                      </span>
                      <Badge variant="outline">{interaction.interactions}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}