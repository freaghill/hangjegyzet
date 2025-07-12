import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PreMeetingDashboard } from '@/components/ai/pre-meeting-dashboard'
import { MeetingInsightsPanel } from '@/components/ai/meeting-insights-panel'
import { SpeakerAnalytics } from '@/components/ai/speaker-analytics'
import { 
  Brain, 
  ArrowLeft, 
  FileText, 
  Users, 
  Clock,
  Activity,
  Download,
  Share2,
  Calendar
} from 'lucide-react'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'

interface Props {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return {
    title: 'Meeting Intelligence | HangJegyzet',
    description: 'AI elemzések és betekintések a meetingről',
  }
}

export default async function MeetingIntelligencePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get meeting details
  const { data: meeting, error } = await supabase
    .from('meetings')
    .select(`
      *,
      organization:organizations(name)
    `)
    .eq('id', id)
    .single()

  if (error || !meeting) {
    notFound()
  }

  // Check user has access to this meeting
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profile?.organization_id !== meeting.organization_id) {
    notFound()
  }

  // Extract participant emails from transcript
  const participants = meeting.transcript?.speakers?.map((s: any) => s.email || s.name) || []
  const isCompleted = meeting.status === 'completed'
  const isScheduled = meeting.status === 'scheduled'
  const isLive = meeting.status === 'active'

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/meetings/${meeting.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Vissza
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6" />
              {meeting.title || 'Meeting'} - AI Intelligence
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(meeting.created_at), 'yyyy. MMMM d.', { locale: hu })}
              </span>
              {meeting.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.round(meeting.duration / 60)} perc
                </span>
              )}
              <Badge variant={
                isCompleted ? 'default' :
                isLive ? 'secondary' :
                'outline'
              }>
                {isCompleted ? 'Befejezett' :
                 isLive ? 'Folyamatban' :
                 'Ütemezett'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Megosztás
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportálás
          </Button>
        </div>
      </div>

      {/* Content based on meeting status */}
      {isScheduled && (
        <Card>
          <CardHeader>
            <CardTitle>Előzetes Meeting Brief</CardTitle>
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

      {(isLive || isCompleted) && (
        <Tabs defaultValue={isLive ? "live" : "analytics"} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            {isLive && (
              <TabsTrigger value="live" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Élő Elemzés
              </TabsTrigger>
            )}
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Elemzések
            </TabsTrigger>
            <TabsTrigger value="speakers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Beszélők
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Összefoglaló
            </TabsTrigger>
          </TabsList>

          {isLive && (
            <TabsContent value="live" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Élő Átírat</CardTitle>
                      <CardDescription>
                        Valós idejű transzkripció és elemzés
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Real-time transcript would go here */}
                      <div className="h-96 bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-500 text-center mt-8">
                          Az élő átírat itt jelenik meg...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <MeetingInsightsPanel
                    meetingId={meeting.id}
                    isLive={true}
                  />
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {/* Meeting Highlights */}
                <Card>
                  <CardHeader>
                    <CardTitle>Kulcs Pontok</CardTitle>
                    <CardDescription>
                      AI által azonosított fontos pillanatok
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {meeting.highlights && meeting.highlights.length > 0 ? (
                      <div className="space-y-3">
                        {meeting.highlights.map((highlight: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                            <p className="text-sm font-medium">{highlight.text}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                              <span>{highlight.speaker}</span>
                              <span>•</span>
                              <span>{format(new Date(highlight.timestamp), 'HH:mm:ss')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        Nincs kiemelés ehhez a meetinghez
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Action Items */}
                <Card>
                  <CardHeader>
                    <CardTitle>Akciók</CardTitle>
                    <CardDescription>
                      Azonosított feladatok és felelősök
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {meeting.action_items && meeting.action_items.length > 0 ? (
                      <div className="space-y-3">
                        {meeting.action_items.map((item: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-lg border">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium">{item.task}</p>
                                {item.assignee && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    Felelős: {item.assignee}
                                  </p>
                                )}
                              </div>
                              {item.deadline && (
                                <Badge variant="outline" className="text-xs">
                                  {format(new Date(item.deadline), 'MMM d.')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        Nincs azonosított akció
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <MeetingInsightsPanel
                  meetingId={meeting.id}
                  isLive={false}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="speakers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Beszélő Elemzés</CardTitle>
                <CardDescription>
                  Résztvevők kommunikációs stílusa és teljesítménye
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SpeakerAnalytics
                  meetingId={meeting.id}
                  timeRange="meeting"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Meeting Összefoglaló</CardTitle>
                <CardDescription>
                  AI által generált átfogó összefoglaló
                </CardDescription>
              </CardHeader>
              <CardContent>
                {meeting.summary ? (
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{meeting.summary}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Az összefoglaló generálása folyamatban...
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Meeting Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Résztvevők</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{participants.length}</p>
                  <p className="text-xs text-gray-500">személy</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Beszédidő</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {meeting.duration ? Math.round(meeting.duration / 60) : 0}
                  </p>
                  <p className="text-xs text-gray-500">perc</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Akciók</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {meeting.action_items?.length || 0}
                  </p>
                  <p className="text-xs text-gray-500">feladat</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}