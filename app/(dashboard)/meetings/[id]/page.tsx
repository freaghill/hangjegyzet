'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Clock, Users, Target, Download, Copy, Play, Brain, TrendingUp, MessageSquare, Sparkles, FileText, Wand2, Share2, Calendar, Video, MapPin, StickyNote, CheckCircle, XCircle, AlertCircle, FileDown } from 'lucide-react'
import { ShareMeetingDialog } from '@/components/meetings/share-meeting-dialog'
import { MeetingHighlights } from '@/components/meetings/meeting-highlights'
import { ShareManager } from '@/components/meetings/share-manager'
import { CollaborativeAnnotations } from '@/components/meetings/collaborative-annotations'
import { CRMLinker } from '@/components/meetings/crm-linker'
import { AudioPlayer } from '@/components/meetings/audio-player'
import { TranscriptViewer } from '@/components/meetings/transcript-viewer'
import { ExportDialog } from '@/components/meetings/export-dialog'

interface Meeting {
  id: string
  title: string
  created_at: string
  duration_seconds: number
  status: string
  file_path?: string
  transcript: {
    text: string
    original_text?: string
    segments?: Array<{
      id: string
      speaker?: string
      start_time: number
      end_time: number
      text: string
      confidence?: number
    }>
  }
  metadata?: {
    progress?: number
    chunksCompleted?: number
    chunksTotal?: number
    processingMethod?: string
    cleanup_stats?: {
      originalLength: number
      cleanedLength: number
      reduction: number
      fillersRemoved: number
      errorsFixed: number
    }
    cleaned?: boolean
    keyPoints?: string[]
    sentiment?: string
    topics?: string[]
    nextSteps?: string[]
    cleanedAt?: string
  }
  summary: string
  action_items: Array<{
    task: string
    assignee?: string
    deadline?: string
    priority?: string
  }>
  speakers: Array<{
    id: number
    name: string
    duration: number
  }>
  intelligence_score: number
  template_id?: string
  template_data?: {
    sections?: Array<{
      name: string
      content: string
      found: boolean
    }>
    templateAnalysis?: {
      sentiment: string
      topics: string[]
      keyPoints: string[]
      nextSteps: string[]
    }
    templateValidation?: {
      isValid: boolean
      missingRequiredSections: string[]
      warnings: string[]
    }
  }
  meeting_templates?: {
    id: string
    name: string
    template_type: string
    sections: any[]
  }
  calendar_events?: {
    id: string
    event_id: string
    calendar_id: string
    title: string
    start_time: string
    end_time: string
    attendees: any[]
    location?: string
    meeting_link?: string
  }
  annotation_count?: number
}

export default function MeetingDetailsPage() {
  const params = useParams()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('cleaned')
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [currentAudioTime, setCurrentAudioTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const supabase = createClient()

  const loadCurrentUser = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (user && !error) {
        setCurrentUser(user.id)
      }
    } catch (error) {
      console.error('Error loading current user:', error)
    }
  }, [supabase])

  const loadMeeting = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          meeting_templates (
            id,
            name,
            template_type,
            sections
          ),
          calendar_events (
            id,
            event_id,
            calendar_id,
            title,
            start_time,
            end_time,
            attendees,
            location,
            meeting_link
          )
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setMeeting(data)
      
      // Get audio URL if available
      if (data?.file_path) {
        const { data: { publicUrl } } = supabase.storage
          .from('meeting-recordings')
          .getPublicUrl(data.file_path)
        setAudioUrl(publicUrl)
      }
    } catch (error) {
      console.error('Error loading meeting:', error)
      toast.error('Hiba történt a meeting betöltése során')
    } finally {
      setIsLoading(false)
    }
  }, [params.id, supabase])

  useEffect(() => {
    loadMeeting()
    loadCurrentUser()
    
    // Poll for updates while processing
    const interval = setInterval(() => {
      if (meeting?.status === 'processing') {
        loadMeeting()
      }
    }, 3000) // Poll every 3 seconds
    
    return () => clearInterval(interval)
  }, [meeting?.status, loadMeeting, loadCurrentUser])

  const copyTranscript = () => {
    const textToCopy = activeTab === 'original' && meeting?.transcript?.original_text 
      ? meeting.transcript.original_text 
      : meeting?.transcript?.text
      
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
      toast.success('Átirat másolva a vágólapra')
    }
  }

  const downloadTranscript = () => {
    const textToDownload = activeTab === 'original' && meeting?.transcript?.original_text 
      ? meeting.transcript.original_text 
      : meeting?.transcript?.text
      
    if (textToDownload && meeting) {
      const blob = new Blob([textToDownload], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${meeting.title}-transcript-${activeTab}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Átirat letöltve')
    }
  }

  const syncWithCalendar = useCallback(async () => {
    if (!meeting) return
    
    try {
      toast.info('Szinkronizálás folyamatban...')
      
      const response = await fetch('/api/integrations/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meeting.id,
          summary: meeting.summary,
          actionItems: meeting.action_items?.map(item => item.task) || [],
        }),
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      toast.success('Meeting összefoglaló hozzáadva a naptár eseményhez!')
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Szinkronizálás sikertelen')
    }
  }, [meeting])

  const cleanTranscript = useCallback(async () => {
    try {
      const response = await fetch(`/api/meetings/${meeting?.id}/cleanup`, {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Cleanup failed')
      
      const result = await response.json()
      toast.success(`Átirat tisztítva! ${result.stats.reduction}% csökkentés`)
      
      // Reload meeting to show cleaned transcript
      await loadMeeting()
    } catch (error) {
      console.error('Cleanup error:', error)
      toast.error('Hiba történt a tisztítás során')
    }
  }, [meeting?.id, loadMeeting])

  const exportMeeting = useCallback(async (format: 'pdf' | 'docx') => {
    if (!meeting) return
    
    try {
      toast.loading('Dokumentum generálása...')
      
      const response = await fetch(`/api/meetings/${meeting.id}/export?format=${format}`)
      
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${meeting.title || 'meeting'}-${meeting.id}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.dismiss()
      toast.success(`${format.toUpperCase()} sikeresen letöltve!`)
    } catch (error) {
      console.error('Export error:', error)
      toast.dismiss()
      toast.error(`Hiba történt a ${format.toUpperCase()} exportálás során`)
    }
  }, [meeting])

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}ó ${minutes}p ${secs}mp`
    }
    return `${minutes}p ${secs}mp`
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Meeting nem található</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{meeting.title}</h1>
          <p className="text-gray-600 mt-1">
            {new Date(meeting.created_at).toLocaleString('hu-HU')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Megosztás
          </Button>
          <Badge
            variant={
              meeting.status === 'completed' ? 'default' :
              meeting.status === 'processing' ? 'secondary' : 'destructive'
            }
          >
            {meeting.status === 'completed' ? 'Kész' :
             meeting.status === 'processing' ? 'Feldolgozás alatt' : 'Sikertelen'}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-effect">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Időtartam</p>
                <p className="text-2xl font-bold">{formatDuration(meeting.duration_seconds)}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Résztvevők</p>
                <p className="text-2xl font-bold">{meeting.speakers.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Intelligence Score</p>
                <p className="text-2xl font-bold">{meeting.intelligence_score}%</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Event Info */}
      {meeting.calendar_events && (
        <Card className="glass-effect border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
                Naptár esemény
              </CardTitle>
              {meeting.status === 'completed' && meeting.summary && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={syncWithCalendar}
                  className="text-blue-600 border-blue-200 hover:bg-blue-100"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Szinkronizálás naptárral
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">
                  {new Date(meeting.calendar_events.start_time).toLocaleString('hu-HU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              {meeting.calendar_events.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{meeting.calendar_events.location}</span>
                </div>
              )}
              {meeting.calendar_events.meeting_link && (
                <div className="flex items-center gap-2 text-sm">
                  <Video className="h-4 w-4 text-gray-500" />
                  <a 
                    href={meeting.calendar_events.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Online meeting link
                  </a>
                </div>
              )}
              {meeting.calendar_events.attendees && meeting.calendar_events.attendees.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Users className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-gray-700">
                      {meeting.calendar_events.attendees.length} résztvevő
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Information */}
      {meeting.meeting_templates && (
        <Card className="glass-effect border-purple-200 bg-purple-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-purple-600" />
              Meeting sablon: {meeting.meeting_templates.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Template sections */}
              {meeting.template_data?.sections && meeting.template_data.sections.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-gray-900 mb-3">Felismert szakaszok:</h4>
                  <div className="space-y-2">
                    {meeting.template_data.sections.map((section, index) => (
                      <div key={index} className="flex items-start gap-3">
                        {section.found ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{section.name}</p>
                          {section.found && section.content && (
                            <p className="text-sm text-gray-600 mt-1">{section.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Template validation */}
              {meeting.template_data?.templateValidation && (
                <div className="border-t pt-3">
                  {meeting.template_data.templateValidation.isValid ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">A meeting megfelel a sablon követelményeinek</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Hiányzó kötelező szakaszok:</span>
                      </div>
                      <ul className="list-disc list-inside text-sm text-red-600 ml-7">
                        {meeting.template_data.templateValidation.missingRequiredSections.map((section, idx) => (
                          <li key={idx}>{section}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {meeting.template_data.templateValidation.warnings.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-yellow-700">
                        <AlertCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Figyelmeztetések:</span>
                      </div>
                      <ul className="list-disc list-inside text-sm text-yellow-600 ml-7">
                        {meeting.template_data.templateValidation.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {meeting.status === 'completed' && (
        <>
          {/* Summary */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                AI Összefoglaló
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">{meeting.summary || 'Az összefoglaló generálása folyamatban...'}</p>
              
              {meeting.metadata?.keyPoints && meeting.metadata.keyPoints.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-gray-900 mb-2">Kulcs pontok:</h4>
                  <ul className="space-y-1">
                    {meeting.metadata.keyPoints.map((point: string, index: number) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {meeting.metadata?.sentiment && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Hangulat:</span>
                  <Badge variant={
                    meeting.metadata.sentiment === 'positive' ? 'default' :
                    meeting.metadata.sentiment === 'negative' ? 'destructive' : 'secondary'
                  }>
                    {meeting.metadata.sentiment === 'positive' ? 'Pozitív' :
                     meeting.metadata.sentiment === 'negative' ? 'Negatív' :
                     meeting.metadata.sentiment === 'mixed' ? 'Vegyes' : 'Semleges'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Items */}
          {meeting.action_items && meeting.action_items.length > 0 && (
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Akció pontok
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {meeting.action_items.map((item, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Badge 
                        variant={
                          item.priority === 'high' ? 'destructive' :
                          item.priority === 'medium' ? 'default' : 'secondary'
                        }
                        className="mt-0.5 min-w-fit"
                      >
                        {item.priority === 'high' ? 'Sürgős' :
                         item.priority === 'medium' ? 'Közepes' : 'Alacsony'}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-gray-700">{item.task}</p>
                        {(item.assignee || item.deadline) && (
                          <p className="text-sm text-gray-500 mt-1">
                            {item.assignee && <span className="font-medium">{item.assignee}</span>}
                            {item.assignee && item.deadline && ' • '}
                            {item.deadline && <span>Határidő: {item.deadline}</span>}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          
          {/* Meeting Highlights - New AI-powered summary */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Meeting Highlights
            </h2>
            <MeetingHighlights meetingId={meeting.id} />
          </div>

          {/* Public Sharing */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-600" />
              Megosztás
            </h2>
            <ShareManager meetingId={meeting.id} />
          </div>

          {/* CRM Integration */}
          <div className="mb-8">
            <CRMLinker meetingId={meeting.id} />
          </div>

          {/* Audio Player */}
          {audioUrl && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-600" />
                Hangfelvétel
              </h2>
              <AudioPlayer
                src={audioUrl}
                title={meeting.title}
                onTimeUpdate={setCurrentAudioTime}
                onSeek={setCurrentAudioTime}
              />
            </div>
          )}

          {/* Topics and Next Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meeting.metadata?.topics && meeting.metadata.topics.length > 0 && (
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    Témák
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {meeting.metadata.topics.map((topic: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {meeting.metadata?.nextSteps && meeting.metadata.nextSteps.length > 0 && (
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Következő lépések
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {meeting.metadata.nextSteps.map((step: string, index: number) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="text-blue-600 mr-2">→</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Transcript Viewer */}
          {meeting.transcript?.segments && meeting.transcript.segments.length > 0 ? (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Átírás
              </h2>
              <TranscriptViewer
                segments={meeting.transcript.segments}
                currentTime={currentAudioTime}
                onSegmentClick={(segment) => setCurrentAudioTime(segment.start_time)}
                title={meeting.title}
                language={meeting.metadata?.language || 'hu'}
                className="h-[600px]"
              />
            </div>
          ) : (
            /* Legacy transcript display */
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Átirat és Annotációk</span>
                  {meeting.annotation_count !== undefined && meeting.annotation_count > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <StickyNote className="h-3 w-3" />
                      {meeting.annotation_count} annotáció
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Teljes szöveges átirat megjegyzésekkel és akció pontokkal
                </CardDescription>
              </CardHeader>
              <CardContent>
              {meeting.metadata?.cleanup_stats && meeting.metadata?.cleaned && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Intelligens tisztítás alkalmazva</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Méret csökkentés</p>
                      <p className="font-medium">{meeting.metadata.cleanup_stats.reduction}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Eltávolított töltelékszavak</p>
                      <p className="font-medium">{meeting.metadata.cleanup_stats.fillersRemoved}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Javított hibák</p>
                      <p className="font-medium">{meeting.metadata.cleanup_stats.errorsFixed}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Karakterek</p>
                      <p className="font-medium">{meeting.metadata.cleanup_stats.cleanedLength.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              <Tabs defaultValue="cleaned" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="cleaned" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Tisztított átirat
                  </TabsTrigger>
                  {meeting.transcript?.original_text && (
                    <TabsTrigger value="original" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Eredeti átirat
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="annotations" className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Kollaboratív annotációk
                  </TabsTrigger>
                </TabsList>

                <div className="flex gap-2 mb-4 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyTranscript}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Másolás
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTranscript}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Letöltés
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExportDialog(true)}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportálás
                  </Button>
                  {!meeting.metadata?.cleaned && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cleanTranscript}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Intelligens tisztítás
                    </Button>
                  )}
                </div>

                <TabsContent value="cleaned">
                  <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-gray-700">
                      {meeting.transcript?.text || 'Átirat nem elérhető'}
                    </p>
                  </div>
                </TabsContent>

                {meeting.transcript?.original_text && (
                  <TabsContent value="original">
                    <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                      <p className="whitespace-pre-wrap text-gray-700">
                        {meeting.transcript.original_text}
                      </p>
                    </div>
                  </TabsContent>
                )}

                <TabsContent value="annotations">
                  {currentUser && (
                    <CollaborativeAnnotations
                      meetingId={meeting.id}
                      transcript={meeting.transcript}
                      currentUserId={currentUser}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          )}
        </>
      )}

      {meeting.status === 'processing' && (
        <Card className="glass-effect">
          <CardContent className="p-12 text-center">
            <div className="animate-pulse">
              <Play className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <p className="text-lg font-medium">Feldolgozás folyamatban...</p>
              <p className="text-gray-600 mt-2">Ez néhány percet vehet igénybe</p>
              
              {meeting.metadata?.progress !== undefined && (
                <div className="mt-6 space-y-2">
                  <Progress value={meeting.metadata.progress} className="w-full max-w-md mx-auto" />
                  <p className="text-sm text-gray-500">
                    {meeting.metadata.progress}% kész
                    {meeting.metadata.chunksCompleted && meeting.metadata.chunksTotal && (
                      <span> ({meeting.metadata.chunksCompleted}/{meeting.metadata.chunksTotal} rész)</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Export Dialog */}
      {meeting && (
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          meetingId={meeting.id}
          meetingTitle={meeting.title}
        />
      )}

      {/* Share Dialog */}
      {meeting && (
        <ShareMeetingDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          meetingId={meeting.id}
          meetingTitle={meeting.title}
          onSuccess={() => {
            toast.success('Meeting sikeresen megosztva')
          }}
        />
      )}
    </div>
  )
}