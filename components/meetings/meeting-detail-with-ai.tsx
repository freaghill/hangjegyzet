'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PreMeetingDashboard } from '@/components/ai/pre-meeting-dashboard'
import { MeetingInsightsPanel } from '@/components/ai/meeting-insights-panel'
import { 
  Brain,
  Calendar,
  Clock,
  Users,
  FileText,
  Activity,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Info,
  CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface MeetingDetailWithAIProps {
  meeting: any
  showPreMeetingBrief?: boolean
  showLiveInsights?: boolean
}

export function MeetingDetailWithAI({
  meeting,
  showPreMeetingBrief = true,
  showLiveInsights = false
}: MeetingDetailWithAIProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showInsightsPanel, setShowInsightsPanel] = useState(false)
  
  const isScheduled = meeting.status === 'scheduled'
  const isLive = meeting.status === 'active'
  const isCompleted = meeting.status === 'completed'
  
  // Extract participants from various sources
  const participants = meeting.calendar_events?.[0]?.attendees?.map((a: any) => a.email) ||
                      meeting.speakers?.map((s: any) => s.email || s.name) ||
                      []

  return (
    <div className="space-y-6">
      {/* AI Intelligence Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Brain className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              AI Intelligence
              {meeting.intelligence_score && (
                <Badge variant="secondary" className="text-xs">
                  Score: {meeting.intelligence_score}/100
                </Badge>
              )}
            </h3>
            <p className="text-sm text-gray-600">
              {isScheduled && 'Előzetes elemzés és felkészülési segédlet'}
              {isLive && 'Valós idejű elemzés és javaslatok'}
              {isCompleted && 'Teljes meeting elemzés és betekintések'}
            </p>
          </div>
        </div>
        <Link href={`/meetings/${meeting.id}/intelligence`}>
          <Button variant="outline" size="sm">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Dashboard
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Pre-meeting Brief for Scheduled Meetings */}
      {isScheduled && showPreMeetingBrief && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Előzetes Meeting Brief
            </CardTitle>
            <CardDescription>
              AI által generált felkészülési segédlet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PreMeetingDashboard
              meetingId={meeting.id}
              organizationId={meeting.organization_id}
              participants={participants}
              meetingType={meeting.meeting_type}
              scheduledTime={meeting.scheduled_time ? new Date(meeting.scheduled_time) : undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* Live Insights Panel */}
      {isLive && showLiveInsights && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {/* Main meeting content would go here */}
            <Card>
              <CardHeader>
                <CardTitle>Élő Meeting</CardTitle>
                <CardDescription>
                  A meeting jelenleg folyamatban van
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    Az élő átírat és elemzés a meeting közben frissül
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
          
          <div className={cn(
            "lg:col-span-1",
            !showInsightsPanel && "hidden lg:block"
          )}>
            <div className="sticky top-4">
              <MeetingInsightsPanel
                meetingId={meeting.id}
                isLive={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Completed Meeting Analysis */}
      {isCompleted && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Áttekintés</TabsTrigger>
            <TabsTrigger value="insights">AI Elemzés</TabsTrigger>
            <TabsTrigger value="metrics">Metrikák</TabsTrigger>
            <TabsTrigger value="recommendations">Javaslatok</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Időtartam
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {Math.round(meeting.duration_seconds / 60)} perc
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Résztvevők
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {meeting.speakers?.length || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Akciók
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {meeting.action_items?.length || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {meeting.intelligence_score || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* AI Generated Summary */}
            {meeting.summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    AI Összefoglaló
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{meeting.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Key Topics */}
            {meeting.metadata?.topics && meeting.metadata.topics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Főbb témák</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {meeting.metadata.topics.map((topic: string, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <MeetingInsightsPanel
              meetingId={meeting.id}
              isLive={false}
            />
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            {/* Speaking Time Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Beszédidő megoszlás</CardTitle>
              </CardHeader>
              <CardContent>
                {meeting.speakers && meeting.speakers.length > 0 ? (
                  <div className="space-y-3">
                    {meeting.speakers.map((speaker: any) => {
                      const percentage = (speaker.duration / meeting.duration_seconds) * 100
                      return (
                        <div key={speaker.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{speaker.name}</span>
                            <span className="text-gray-500">{Math.round(percentage)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Nincs beszélő adat
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Meeting Health Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Meeting egészség</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Részvétel</span>
                    <Badge variant="default">85%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Egyensúly</span>
                    <Badge variant="secondary">72%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tempó</span>
                    <Badge variant="default">90%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Produktivitás</span>
                    <Badge variant="default">88%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  AI Javaslatok
                </CardTitle>
                <CardDescription>
                  Személyre szabott javaslatok a jövőbeli meetingekhez
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Időzítés:</strong> A résztvevők aktivitása alapján a legjobb időpont 
                      hasonló meetingekre: Kedd 10:00 - 11:00
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <Users className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Résztvevők:</strong> Fontolja meg további stakeholderek bevonását 
                      a döntéshozatali folyamat felgyorsításához
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Időtartam:</strong> A meeting 15%-kal túlfutott. Javasolt időkeret: 
                      45 perc a hatékonyság növelése érdekében
                    </AlertDescription>
                  </Alert>

                  {meeting.metadata?.nextSteps && meeting.metadata.nextSteps.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Javasolt következő lépések:</h4>
                      <ul className="space-y-1">
                        {meeting.metadata.nextSteps.map((step: string, idx: number) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Mobile Insights Toggle */}
      {isLive && showLiveInsights && (
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden fixed bottom-4 right-4 z-50"
          onClick={() => setShowInsightsPanel(!showInsightsPanel)}
        >
          <Brain className="mr-2 h-4 w-4" />
          {showInsightsPanel ? 'Elrejt' : 'AI Elemzés'}
        </Button>
      )}
    </div>
  )
}