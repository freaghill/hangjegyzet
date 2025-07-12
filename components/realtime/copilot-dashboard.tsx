'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Brain,
  Heart,
  Zap,
  MessageSquare,
  Target,
  Award,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopilotDashboardProps {
  meetingId: string
  onSuggestionAction?: (suggestion: Suggestion) => void
  className?: string
}

interface Metrics {
  engagement: number
  sentiment: number
  energy: number
  clarity: number
  productivity: number
}

interface SpeakingTime {
  name: string
  time: number
  percentage: number
}

interface ActiveAlert {
  id: string
  type: 'warning' | 'info' | 'success' | 'error'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  timestamp: number
}

interface KeyMoment {
  id: string
  type: 'decision' | 'action' | 'conflict' | 'consensus' | 'question'
  description: string
  timestamp: number
  participants: string[]
}

interface Suggestion {
  id: string
  type: 'facilitation' | 'engagement' | 'time' | 'topic' | 'action'
  title: string
  description: string
  action?: string
  priority: 'low' | 'medium' | 'high'
}

export function CopilotDashboard({
  meetingId,
  onSuggestionAction,
  className
}: CopilotDashboardProps) {
  const [metrics, setMetrics] = useState<Metrics>({
    engagement: 75,
    sentiment: 82,
    energy: 68,
    clarity: 90,
    productivity: 77
  })
  
  const [speakingTimes, setSpeakingTimes] = useState<SpeakingTime[]>([
    { name: 'János', time: 450, percentage: 35 },
    { name: 'Mária', time: 380, percentage: 30 },
    { name: 'Péter', time: 320, percentage: 25 },
    { name: 'Anna', time: 130, percentage: 10 }
  ])
  
  const [alerts, setAlerts] = useState<ActiveAlert[]>([])
  const [keyMoments, setKeyMoments] = useState<KeyMoment[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [meetingHealth, setMeetingHealth] = useState(85)
  const [timelineData, setTimelineData] = useState<any[]>([])

  // Mock real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update metrics with some random variations
      setMetrics(prev => ({
        engagement: Math.max(0, Math.min(100, prev.engagement + (Math.random() - 0.5) * 10)),
        sentiment: Math.max(0, Math.min(100, prev.sentiment + (Math.random() - 0.5) * 8)),
        energy: Math.max(0, Math.min(100, prev.energy + (Math.random() - 0.5) * 12)),
        clarity: Math.max(0, Math.min(100, prev.clarity + (Math.random() - 0.5) * 5)),
        productivity: Math.max(0, Math.min(100, prev.productivity + (Math.random() - 0.5) * 7))
      }))
      
      // Update meeting health
      setMeetingHealth(prev => Math.max(0, Math.min(100, prev + (Math.random() - 0.5) * 5)))
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])

  // Generate timeline data
  useEffect(() => {
    const generateTimelineData = () => {
      const data = []
      for (let i = 0; i < 10; i++) {
        data.push({
          time: `${i * 5}:00`,
          engagement: 50 + Math.random() * 50,
          sentiment: 50 + Math.random() * 50,
          energy: 50 + Math.random() * 50
        })
      }
      setTimelineData(data)
    }
    
    generateTimelineData()
    const interval = setInterval(generateTimelineData, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Mock alerts
  useEffect(() => {
    const mockAlerts = [
      {
        id: '1',
        type: 'warning' as const,
        title: 'Alacsony részvétel észlelve',
        description: 'Anna az elmúlt 10 percben nem szólt hozzá',
        priority: 'medium' as const,
        timestamp: Date.now()
      },
      {
        id: '2',
        type: 'info' as const,
        title: 'Témaváltás javasolt',
        description: 'Az aktuális téma 15 perce tart',
        priority: 'low' as const,
        timestamp: Date.now()
      }
    ]
    setAlerts(mockAlerts)
  }, [])

  // Mock suggestions
  useEffect(() => {
    const mockSuggestions = [
      {
        id: '1',
        type: 'engagement' as const,
        title: 'Vonja be Annát',
        description: 'Anna még nem osztotta meg véleményét ebben a témában',
        action: 'Kérdezze meg',
        priority: 'medium' as const
      },
      {
        id: '2',
        type: 'time' as const,
        title: 'Időkezelés figyelmeztetés',
        description: 'A meeting 60%-a eltelt, de csak 40%-os a napirend előrehaladás',
        action: 'Gyorsítson',
        priority: 'high' as const
      }
    ]
    setSuggestions(mockSuggestions)
  }, [])

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'engagement':
        return <Users className="h-4 w-4" />
      case 'sentiment':
        return <Heart className="h-4 w-4" />
      case 'energy':
        return <Zap className="h-4 w-4" />
      case 'clarity':
        return <Brain className="h-4 w-4" />
      case 'productivity':
        return <Target className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getMetricColor = (value: number) => {
    if (value >= 80) return 'text-green-600 dark:text-green-400'
    if (value >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getHealthColor = (value: number) => {
    if (value >= 80) return '#10b981'
    if (value >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const pieColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']

  const radialData = [
    {
      name: 'Meeting Health',
      value: meetingHealth,
      fill: getHealthColor(meetingHealth)
    }
  ]

  return (
    <div className={cn("space-y-4", className)}>
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(metrics).map(([key, value]) => (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getMetricIcon(key)}
                  <span className="text-sm font-medium capitalize">
                    {key === 'engagement' ? 'Részvétel' :
                     key === 'sentiment' ? 'Hangulat' :
                     key === 'energy' ? 'Energia' :
                     key === 'clarity' ? 'Tisztaság' :
                     'Produktivitás'}
                  </span>
                </div>
                {value > 80 ? (
                  <ArrowUp className="h-3 w-3 text-green-600" />
                ) : value < 60 ? (
                  <ArrowDown className="h-3 w-3 text-red-600" />
                ) : null}
              </div>
              <div className="flex items-end gap-2">
                <span className={cn("text-2xl font-bold", getMetricColor(value))}>
                  {Math.round(value)}%
                </span>
              </div>
              <Progress 
                value={value} 
                className="h-1 mt-2"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Speaking Time Visualization */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Beszédidő megoszlás</CardTitle>
            <CardDescription>Ki mennyit beszélt</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={speakingTimes}
                    dataKey="percentage"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {speakingTimes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {speakingTimes.map((speaker, index) => (
                <div key={speaker.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: pieColors[index % pieColors.length] }}
                    />
                    <span className="text-sm">{speaker.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {Math.floor(speaker.time / 60)}:{(speaker.time % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline Metrics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Meeting dinamika</CardTitle>
            <CardDescription>Részvétel, hangulat és energia időbeli alakulása</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="engagement" 
                    stroke="#3b82f6" 
                    name="Részvétel"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sentiment" 
                    stroke="#10b981" 
                    name="Hangulat"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="energy" 
                    stroke="#f59e0b" 
                    name="Energia"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Aktív figyelmeztetések
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nincs aktív figyelmeztetés
                </p>
              ) : (
                alerts.map((alert) => (
                  <Alert key={alert.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className={cn(
                        "h-4 w-4 mt-0.5",
                        alert.priority === 'critical' && "text-red-600",
                        alert.priority === 'high' && "text-orange-600",
                        alert.priority === 'medium' && "text-yellow-600"
                      )} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.description}
                        </p>
                      </div>
                      <Badge 
                        variant={
                          alert.priority === 'critical' ? 'destructive' :
                          alert.priority === 'high' ? 'default' :
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {alert.priority === 'critical' ? 'Kritikus' :
                         alert.priority === 'high' ? 'Magas' :
                         alert.priority === 'medium' ? 'Közepes' :
                         'Alacsony'}
                      </Badge>
                    </div>
                  </Alert>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Javaslatok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{suggestion.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {suggestion.description}
                      </p>
                    </div>
                    {suggestion.action && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSuggestionAction?.(suggestion)}
                        className="shrink-0"
                      >
                        {suggestion.action}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Meeting Health Score */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" />
              Meeting egészség
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="60%" 
                  outerRadius="90%"
                  data={radialData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <p className="text-3xl font-bold" style={{ color: getHealthColor(meetingHealth) }}>
                  {meetingHealth}%
                </p>
                <p className="text-sm text-muted-foreground">Összesített</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Produktivitás</span>
                <span className="font-medium">{Math.round(metrics.productivity)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Részvétel</span>
                <span className="font-medium">{Math.round(metrics.engagement)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Tisztaság</span>
                <span className="font-medium">{Math.round(metrics.clarity)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Moments Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kulcs pillanatok</CardTitle>
          <CardDescription>Fontos döntések, teendők és fordulópontok</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">Mind</TabsTrigger>
              <TabsTrigger value="decisions">Döntések</TabsTrigger>
              <TabsTrigger value="actions">Teendők</TabsTrigger>
              <TabsTrigger value="conflicts">Konfliktusok</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <div className="space-y-3">
                <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Döntés: Projekt határidő módosítás</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        János, Mária • 10:45
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Teendő: Erőforrás allokáció felülvizsgálat</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Péter • 10:52
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}