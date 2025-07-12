'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  Lightbulb,
  History,
  Target
} from 'lucide-react'
import { PreMeetingBrief } from '@/lib/ai/meeting-preparation'
import { toast } from 'sonner'

interface PreMeetingDashboardProps {
  meetingId: string
  organizationId: string
  participants: string[]
  meetingType?: string
  scheduledTime?: Date
}

export function PreMeetingDashboard({
  meetingId,
  organizationId,
  participants,
  meetingType,
  scheduledTime
}: PreMeetingDashboardProps) {
  const [brief, setBrief] = useState<PreMeetingBrief | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPreMeetingBrief()
  }, [meetingId])

  const fetchPreMeetingBrief = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/ai/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          organizationId,
          participants,
          meetingType
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch pre-meeting brief')
      }

      const data = await response.json()
      setBrief(data)
    } catch (err) {
      setError('Nem sikerült betölteni az előzetes összefoglalót')
      toast.error('Hiba történt az összefoglaló betöltésekor')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <PreMeetingDashboardSkeleton />
  }

  if (error || !brief) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Nem található előzetes összefoglaló'}
        </AlertDescription>
      </Alert>
    )
  }

  const getTimeUntilMeeting = () => {
    if (!scheduledTime) return null
    const now = new Date()
    const diff = scheduledTime.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days} nap múlva`
    } else if (hours > 0) {
      return `${hours} óra ${minutes} perc múlva`
    } else if (minutes > 0) {
      return `${minutes} perc múlva`
    } else {
      return 'Hamarosan kezdődik'
    }
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Meeting Összefoglaló
          </CardTitle>
          {scheduledTime && (
            <CardDescription>
              {getTimeUntilMeeting()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{brief.summary}</p>
          <div className="flex items-center gap-4 mt-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ~{brief.estimatedDuration} perc
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {participants.length} résztvevő
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Predicted Topics */}
      {brief.predictedTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Várható Témák
            </CardTitle>
            <CardDescription>
              AI által előrejelzett valószínű témák
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {brief.predictedTopics.map((topic, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">{topic.topic}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={topic.probability} className="w-24 h-2" />
                    <span className="text-xs text-gray-500 w-10 text-right">
                      {topic.probability}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unresolved Action Items */}
      {brief.unresolvedActionItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Nyitott Akciók
            </CardTitle>
            <CardDescription>
              Előző meetingekből származó lezáratlan feladatok
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {brief.unresolvedActionItems.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-amber-50 border-amber-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.task}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                        <span>Felelős: {item.assignee}</span>
                        <span>Meeting: {item.fromMeeting}</span>
                        {item.daysOverdue && item.daysOverdue > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {item.daysOverdue} napja lejárt
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Context */}
      {brief.previousContext.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Előző Találkozók
            </CardTitle>
            <CardDescription>
              Releváns kontextus korábbi meetingekből
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {brief.previousContext.map((context, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{context.date}</span>
                    <Badge variant="secondary" className="text-xs">
                      {context.meetingId.slice(0, 8)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{context.summary}</p>
                  {context.relevantPoints.length > 0 && (
                    <ul className="list-disc list-inside space-y-1">
                      {context.relevantPoints.map((point, pidx) => (
                        <li key={pidx} className="text-xs text-gray-500">{point}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggested Agenda */}
      {brief.suggestedAgenda.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Javasolt Napirend
            </CardTitle>
            <CardDescription>
              AI által javasolt napirendi pontok
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {brief.suggestedAgenda.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">
                    {idx + 1}
                  </span>
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Participant Insights */}
      {brief.participantProfiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Résztvevők
            </CardTitle>
            <CardDescription>
              Résztvevői profilok és előzmények
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {brief.participantProfiles.map((profile, idx) => (
                <div key={idx} className="p-3 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {profile.name || profile.email}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {profile.relationshipSummary}
                      </p>
                      {profile.lastMeetingDate && (
                        <p className="text-xs text-gray-500">
                          Utolsó találkozó: {profile.lastMeetingDate}
                        </p>
                      )}
                    </div>
                  </div>
                  {profile.commonTopics.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {profile.commonTopics.map((topic, tidx) => (
                        <Badge key={tidx} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preparation Tips */}
      {brief.preparationTips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              Felkészülési Tippek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brief.preparationTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PreMeetingDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}