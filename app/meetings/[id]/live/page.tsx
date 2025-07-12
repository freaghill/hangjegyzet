'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LiveMeetingView } from '@/components/realtime/live-meeting-view'
import { CopilotDashboard } from '@/components/realtime/copilot-dashboard'
import { MobileCompanion } from '@/components/realtime/mobile-companion'
import { MeetingControls } from '@/components/realtime/meeting-controls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Video,
  LayoutGrid,
  Smartphone,
  Monitor,
  Settings,
  X,
  AlertCircle,
  Loader2,
  Users,
  Clock,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Meeting {
  id: string
  title: string
  status: string
  started_at?: string
  organization_id: string
  participants?: any[]
}

export default function LiveMeetingPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop')
  const [layout, setLayout] = useState<'grid' | 'focus'>('grid')
  const [showSettings, setShowSettings] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [enableCoaching, setEnableCoaching] = useState(true)
  const [enableAlerts, setEnableAlerts] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setView('mobile')
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load meeting data
  useEffect(() => {
    const loadMeeting = async () => {
      try {
        const { data: meeting, error } = await supabase
          .from('meetings')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) throw error
        
        if (!meeting) {
          throw new Error('Meeting nem található')
        }

        // Check if user has permission
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('Bejelentkezés szükséges')
        }

        setMeeting(meeting)
        
        // Start meeting if not already started
        if (meeting.status !== 'active') {
          const { error: updateError } = await supabase
            .from('meetings')
            .update({ 
              status: 'active',
              started_at: new Date().toISOString()
            })
            .eq('id', meeting.id)
            
          if (updateError) {
            console.error('Error starting meeting:', updateError)
          }
        }
      } catch (err) {
        console.error('Error loading meeting:', err)
        setError(err instanceof Error ? err.message : 'Hiba történt a meeting betöltése során')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadMeeting()
    }
  }, [params.id, supabase])

  const handleStartRecording = async () => {
    setIsRecording(true)
    toast.success('Rögzítés elindítva')
  }

  const handleStopRecording = async () => {
    setIsRecording(false)
    toast.success('Rögzítés leállítva')
  }

  const handlePauseResume = () => {
    setIsPaused(!isPaused)
    toast.success(isPaused ? 'Folytatás' : 'Szüneteltetve')
  }

  const handleEndMeeting = async () => {
    try {
      const { error } = await supabase
        .from('meetings')
        .update({ 
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', params.id)
        
      if (error) throw error
      
      toast.success('Meeting befejezve')
      router.push(`/meetings/${params.id}`)
    } catch (err) {
      console.error('Error ending meeting:', err)
      toast.error('Hiba történt a meeting befejezése során')
    }
  }

  const handleExport = async (format: string) => {
    toast.success(`Exportálás ${format} formátumban...`)
  }

  const handleHighlight = (text: string, timestamp: number) => {
    console.log('Highlight:', text, timestamp)
    toast.success('Kiemelés mentve')
  }

  const handleActionItem = (text: string, assignee?: string) => {
    console.log('Action item:', text, assignee)
    toast.success('Teendő hozzáadva')
  }

  const handleDecision = (text: string) => {
    console.log('Decision:', text)
    toast.success('Döntés rögzítve')
  }

  const handleSuggestionAction = (suggestion: any) => {
    console.log('Suggestion action:', suggestion)
    toast.info(suggestion.title)
  }

  const handleQuickAction = (action: string, data?: any) => {
    console.log('Quick action:', action, data)
    
    switch (action) {
      case 'bookmark':
        toast.success('Könyvjelző hozzáadva')
        break
      case 'action':
        toast.success('Teendő megjelölve')
        break
      case 'decision':
        toast.success('Döntés megjelölve')
        break
      case 'note':
        toast.success('Jegyzet hozzáadva')
        break
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Meeting betöltése...</p>
        </div>
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Hiba történt</h2>
              <p className="text-muted-foreground mb-4">{error || 'Meeting nem található'}</p>
              <Button onClick={() => router.push('/meetings')}>
                Vissza a meetingekhez
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">{meeting.title}</h1>
              <Badge variant={isRecording ? "destructive" : "secondary"}>
                {isRecording ? 'Rögzítés' : 'Várakozás'}
              </Badge>
              {isPaused && (
                <Badge variant="outline">Szüneteltetve</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!isMobile && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setView(view === 'desktop' ? 'mobile' : 'desktop')}
                  >
                    {view === 'desktop' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLayout(layout === 'grid' ? 'focus' : 'grid')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/meetings/${params.id}`)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {view === 'mobile' || isMobile ? (
          <MobileCompanion
            meetingId={meeting.id}
            enableVibration={enableCoaching}
            enableDiscreteMode={false}
            enableLowDataMode={false}
            onQuickAction={handleQuickAction}
            className="h-[calc(100vh-60px)]"
          />
        ) : (
          <div className="container mx-auto p-4">
            {layout === 'grid' ? (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-8">
                  <LiveMeetingView
                    meetingId={meeting.id}
                    enableVideo={true}
                    enableAutoScroll={true}
                    onHighlight={handleHighlight}
                    onActionItem={handleActionItem}
                    onDecision={handleDecision}
                  />
                </div>
                <div className="xl:col-span-4">
                  <MeetingControls
                    meetingId={meeting.id}
                    isRecording={isRecording}
                    isPaused={isPaused}
                    onStartRecording={handleStartRecording}
                    onStopRecording={handleStopRecording}
                    onPauseResume={handlePauseResume}
                    onEndMeeting={handleEndMeeting}
                    onExport={handleExport}
                    enableAlerts={enableAlerts}
                    enableCoaching={enableCoaching}
                    onAlertsChange={setEnableAlerts}
                    onCoachingChange={setEnableCoaching}
                  />
                </div>
              </div>
            ) : (
              <Tabs defaultValue="meeting" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="meeting">Meeting</TabsTrigger>
                  <TabsTrigger value="copilot">AI Copilot</TabsTrigger>
                  <TabsTrigger value="controls">Vezérlők</TabsTrigger>
                </TabsList>
                
                <TabsContent value="meeting" className="mt-4">
                  <LiveMeetingView
                    meetingId={meeting.id}
                    enableVideo={true}
                    enableAutoScroll={true}
                    onHighlight={handleHighlight}
                    onActionItem={handleActionItem}
                    onDecision={handleDecision}
                  />
                </TabsContent>
                
                <TabsContent value="copilot" className="mt-4">
                  <CopilotDashboard
                    meetingId={meeting.id}
                    onSuggestionAction={handleSuggestionAction}
                  />
                </TabsContent>
                
                <TabsContent value="controls" className="mt-4">
                  <MeetingControls
                    meetingId={meeting.id}
                    isRecording={isRecording}
                    isPaused={isPaused}
                    onStartRecording={handleStartRecording}
                    onStopRecording={handleStopRecording}
                    onPauseResume={handlePauseResume}
                    onEndMeeting={handleEndMeeting}
                    onExport={handleExport}
                    enableAlerts={enableAlerts}
                    enableCoaching={enableCoaching}
                    onAlertsChange={setEnableAlerts}
                    onCoachingChange={setEnableCoaching}
                  />
                </TabsContent>
              </Tabs>
            )}
            
            {enableCoaching && layout === 'grid' && (
              <div className="mt-4">
                <CopilotDashboard
                  meetingId={meeting.id}
                  onSuggestionAction={handleSuggestionAction}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Live Meeting beállítások</DialogTitle>
            <DialogDescription>
              Testreszabhatja a valós idejű meeting élményt
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">AI Coach</p>
                <p className="text-sm text-muted-foreground">
                  Valós idejű javaslatok és figyelmeztetések
                </p>
              </div>
              <Button
                variant={enableCoaching ? "default" : "outline"}
                size="sm"
                onClick={() => setEnableCoaching(!enableCoaching)}
              >
                {enableCoaching ? 'Bekapcsolva' : 'Kikapcsolva'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Intelligens értesítések</p>
                <p className="text-sm text-muted-foreground">
                  Fontos pillanatok kiemelése
                </p>
              </div>
              <Button
                variant={enableAlerts ? "default" : "outline"}
                size="sm"
                onClick={() => setEnableAlerts(!enableAlerts)}
              >
                {enableAlerts ? 'Bekapcsolva' : 'Kikapcsolva'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}