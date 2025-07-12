'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Users,
  Zap,
  Lightbulb,
  Activity,
  BarChart3,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RealTimeInsight {
  id: string
  type: 'suggestion' | 'warning' | 'observation' | 'action'
  title: string
  description: string
  timestamp: Date
  priority: 'high' | 'medium' | 'low'
  metadata?: {
    speaker?: string
    topic?: string
    confidence?: number
  }
}

interface MeetingMetrics {
  engagementScore: number
  participationBalance: number
  topicCoverage: number
  paceScore: number
  sentimentScore: number
}

interface SpeakerMetrics {
  email: string
  name?: string
  speakingTime: number
  interruptions: number
  sentiment: 'positive' | 'neutral' | 'negative'
  engagement: number
}

interface MeetingInsightsPanelProps {
  meetingId: string
  isLive?: boolean
  onInsightAction?: (insight: RealTimeInsight) => void
}

export function MeetingInsightsPanel({
  meetingId,
  isLive = false,
  onInsightAction
}: MeetingInsightsPanelProps) {
  const [insights, setInsights] = useState<RealTimeInsight[]>([])
  const [metrics, setMetrics] = useState<MeetingMetrics | null>(null)
  const [speakers, setSpeakers] = useState<SpeakerMetrics[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [activeInsightId, setActiveInsightId] = useState<string | null>(null)

  // Fetch initial data
  useEffect(() => {
    fetchInitialInsights()
  }, [meetingId])

  // Setup real-time connection for live meetings
  useEffect(() => {
    if (!isLive) return

    const eventSource = new EventSource(`/api/ai/insights?meetingId=${meetingId}&stream=true`)

    eventSource.onopen = () => {
      setIsConnected(true)
    }

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'insight') {
        addInsight(data.insight)
      } else if (data.type === 'metrics') {
        setMetrics(data.metrics)
      } else if (data.type === 'speakers') {
        setSpeakers(data.speakers)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
    }

    return () => {
      eventSource.close()
    }
  }, [meetingId, isLive])

  const fetchInitialInsights = async () => {
    try {
      const response = await fetch(`/api/ai/insights?meetingId=${meetingId}`)
      if (!response.ok) throw new Error('Failed to fetch insights')
      
      const data = await response.json()
      setInsights(data.insights || [])
      setMetrics(data.metrics || null)
      setSpeakers(data.speakers || [])
    } catch (error) {
      console.error('Error fetching insights:', error)
    }
  }

  const addInsight = (insight: RealTimeInsight) => {
    setInsights(prev => [insight, ...prev].slice(0, 50)) // Keep last 50 insights
    
    // Highlight new high-priority insights
    if (insight.priority === 'high') {
      setActiveInsightId(insight.id)
      setTimeout(() => setActiveInsightId(null), 5000)
    }
  }

  const handleInsightAction = (insight: RealTimeInsight) => {
    onInsightAction?.(insight)
  }

  const getInsightIcon = (type: RealTimeInsight['type']) => {
    switch (type) {
      case 'suggestion':
        return <Lightbulb className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'observation':
        return <Brain className="h-4 w-4" />
      case 'action':
        return <Target className="h-4 w-4" />
    }
  }

  const getInsightColor = (type: RealTimeInsight['type']) => {
    switch (type) {
      case 'suggestion':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'warning':
        return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'observation':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'action':
        return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const getPriorityBadge = (priority: RealTimeInsight['priority']) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">Fontos</Badge>
      case 'medium':
        return <Badge variant="default" className="text-xs">Közepes</Badge>
      case 'low':
        return <Badge variant="secondary" className="text-xs">Alacsony</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      {isLive && (
        <div className="flex items-center gap-2 text-sm">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
          )} />
          <span className="text-gray-600">
            {isConnected ? 'Élő elemzés aktív' : 'Kapcsolat megszakadt'}
          </span>
        </div>
      )}

      {/* Meeting Metrics */}
      {metrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Meeting Metrikák
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricBar
              label="Részvétel"
              value={metrics.engagementScore}
              icon={<Users className="h-3 w-3" />}
            />
            <MetricBar
              label="Egyensúly"
              value={metrics.participationBalance}
              icon={<BarChart3 className="h-3 w-3" />}
            />
            <MetricBar
              label="Témák"
              value={metrics.topicCoverage}
              icon={<CheckCircle className="h-3 w-3" />}
            />
            <MetricBar
              label="Tempó"
              value={metrics.paceScore}
              icon={<Clock className="h-3 w-3" />}
            />
            <MetricBar
              label="Hangulat"
              value={metrics.sentimentScore}
              icon={<MessageSquare className="h-3 w-3" />}
            />
          </CardContent>
        </Card>
      )}

      {/* Speaker Analytics */}
      {speakers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Résztvevők
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {speakers.map((speaker, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      speaker.sentiment === 'positive' ? 'bg-green-500' :
                      speaker.sentiment === 'negative' ? 'bg-red-500' :
                      'bg-gray-400'
                    )} />
                    <span className="font-medium">{speaker.name || speaker.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {Math.round(speaker.speakingTime)}%
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {speaker.engagement}% aktív
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Insights */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Valós Idejű Elemzések
          </CardTitle>
          <CardDescription className="text-xs">
            AI által generált javaslatok és megfigyelések
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-3">
              {insights.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    Az elemzések hamarosan megjelennek...
                  </p>
                </div>
              ) : (
                insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer",
                      getInsightColor(insight.type),
                      activeInsightId === insight.id && "ring-2 ring-offset-2 ring-blue-500"
                    )}
                    onClick={() => handleInsightAction(insight)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {insight.title}
                          </h4>
                          {getPriorityBadge(insight.priority)}
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          {insight.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>
                            {new Date(insight.timestamp).toLocaleTimeString('hu-HU', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {insight.metadata?.speaker && (
                            <span>• {insight.metadata.speaker}</span>
                          )}
                          {insight.metadata?.confidence && (
                            <span>• {insight.metadata.confidence}% biztos</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

interface MetricBarProps {
  label: string
  value: number
  icon: React.ReactNode
}

function MetricBar({ label, value, icon }: MetricBarProps) {
  const getColor = (value: number) => {
    if (value >= 80) return 'bg-green-500'
    if (value >= 60) return 'bg-yellow-500'
    if (value >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          {icon}
          <span className="text-gray-600">{label}</span>
        </div>
        <span className="font-medium">{value}%</span>
      </div>
      <Progress 
        value={value} 
        className="h-1.5"
        indicatorClassName={getColor(value)}
      />
    </div>
  )
}