'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Star,
  Info,
  Brain,
  Lightbulb
} from 'lucide-react'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface LiveMeetingViewProps {
  meetingId: string
  enableVideo?: boolean
  enableAutoScroll?: boolean
  onHighlight?: (text: string, timestamp: number) => void
  onActionItem?: (text: string, assignee?: string) => void
  onDecision?: (text: string) => void
  className?: string
}

interface TranscriptEntry {
  id: string
  speaker: string
  text: string
  timestamp: number
  confidence?: number
  isImportant?: boolean
  type?: 'normal' | 'decision' | 'action' | 'question'
}

interface Alert {
  id: string
  type: 'warning' | 'info' | 'success' | 'error'
  title: string
  description: string
  timestamp: number
  priority: 'low' | 'medium' | 'high'
}

interface ParticipantInsight {
  participantId: string
  name: string
  speakingTime: number
  lastSpoke: number
  sentiment: 'positive' | 'neutral' | 'negative'
  engagement: number
}

export function LiveMeetingView({
  meetingId,
  enableVideo = true,
  enableAutoScroll = true,
  onHighlight,
  onActionItem,
  onDecision,
  className
}: LiveMeetingViewProps) {
  const [isVideoOn, setIsVideoOn] = useState(enableVideo)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [participants, setParticipants] = useState<ParticipantInsight[]>([])
  const [autoScroll, setAutoScroll] = useState(enableAutoScroll)
  const [selectedText, setSelectedText] = useState<string>('')
  const [showParticipants, setShowParticipants] = useState(true)
  const [meetingDuration, setMeetingDuration] = useState(0)
  
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Mock real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMeetingDuration(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (autoScroll && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [transcript, autoScroll])

  // WebSocket connection for real-time updates
  useEffect(() => {
    // TODO: Connect to real WebSocket
    // For now, using mock data
    const mockTranscriptUpdate = () => {
      const speakers = ['János', 'Mária', 'Péter', 'Anna']
      const texts = [
        'Szerintem fontos lenne áttekinteni a projekt státuszát.',
        'Egyetértek, nézzük meg a mérföldköveket.',
        'A következő hónap kritikus lesz a határidők szempontjából.',
        'Javaslom, hogy növeljük az erőforrásokat ezen a területen.'
      ]
      
      const newEntry: TranscriptEntry = {
        id: `entry-${Date.now()}`,
        speaker: speakers[Math.floor(Math.random() * speakers.length)],
        text: texts[Math.floor(Math.random() * texts.length)],
        timestamp: Date.now(),
        confidence: 0.85 + Math.random() * 0.15,
        isImportant: Math.random() > 0.8,
        type: Math.random() > 0.9 ? 'decision' : Math.random() > 0.8 ? 'action' : 'normal'
      }
      
      setTranscript(prev => [...prev, newEntry])
    }

    const transcriptInterval = setInterval(mockTranscriptUpdate, 3000)
    
    return () => clearInterval(transcriptInterval)
  }, [])

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString())
    }
  }

  const handleHighlight = () => {
    if (selectedText && onHighlight) {
      onHighlight(selectedText, Date.now())
      setSelectedText('')
      window.getSelection()?.removeAllRanges()
    }
  }

  const handleMarkAsAction = () => {
    if (selectedText && onActionItem) {
      onActionItem(selectedText)
      setSelectedText('')
      window.getSelection()?.removeAllRanges()
    }
  }

  const handleMarkAsDecision = () => {
    if (selectedText && onDecision) {
      onDecision(selectedText)
      setSelectedText('')
      window.getSelection()?.removeAllRanges()
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="h-4 w-4" />
      case 'success':
        return <CheckCircle className="h-4 w-4" />
      case 'info':
        return <Info className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'success':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20'
      case 'error':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      default:
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
    }
  }

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-4 h-full", className)}>
      {/* Video/Audio Section */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="h-[400px] lg:h-[500px]">
          <CardContent className="p-0 h-full">
            {enableVideo && isVideoOn ? (
              <div className="relative h-full bg-gray-900 rounded-lg overflow-hidden">
                {/* Video placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="h-16 w-16 text-gray-600" />
                </div>
                
                {/* Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsVideoOn(!isVideoOn)}
                        className="text-white hover:bg-white/20"
                      >
                        {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMuted(!isMuted)}
                        className="text-white hover:bg-white/20"
                      >
                        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-white border-white/50">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDuration(meetingDuration)}
                      </Badge>
                      <Badge variant="outline" className="text-white border-white/50">
                        <Users className="h-3 w-3 mr-1" />
                        {participants.length}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg">
                <div className="text-center">
                  <Mic className={cn(
                    "h-16 w-16 mx-auto mb-4",
                    isMuted ? "text-gray-400" : "text-green-500 animate-pulse"
                  )} />
                  <p className="text-gray-600 dark:text-gray-400">
                    {isMuted ? 'Mikrofon némítva' : 'Csak hang mód'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Transcript */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Élő átirat</CardTitle>
              <div className="flex items-center gap-2">
                {selectedText && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleHighlight}
                    >
                      <Bookmark className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAsAction}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAsDecision}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={cn(autoScroll && "text-primary")}
                >
                  {autoScroll ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  Auto-görgetés
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea 
              ref={scrollAreaRef}
              className="h-[300px] px-4"
              onMouseUp={handleTextSelection}
            >
              <div className="space-y-3 pb-4">
                {transcript.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "group relative rounded-lg p-3 transition-colors",
                      entry.isImportant && "bg-yellow-50 dark:bg-yellow-900/20",
                      entry.type === 'decision' && "bg-blue-50 dark:bg-blue-900/20",
                      entry.type === 'action' && "bg-green-50 dark:bg-green-900/20"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {entry.speaker.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{entry.speaker}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(entry.timestamp, 'HH:mm:ss', { locale: hu })}
                          </span>
                          {entry.confidence && entry.confidence < 0.9 && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {Math.round(entry.confidence * 100)}%
                            </Badge>
                          )}
                          {entry.type === 'decision' && (
                            <Badge variant="default" className="text-xs px-1 py-0">
                              Döntés
                            </Badge>
                          )}
                          {entry.type === 'action' && (
                            <Badge variant="default" className="text-xs px-1 py-0">
                              Teendő
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 select-text">
                          {entry.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar */}
      <div className="space-y-4">
        {/* Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Értesítések
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nincs aktív értesítés
                  </p>
                ) : (
                  alerts.map((alert) => (
                    <Alert
                      key={alert.id}
                      className={cn("p-3", getAlertColor(alert.type))}
                    >
                      <div className="flex items-start gap-2">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1 min-w-0">
                          <AlertTitle className="text-sm font-medium">
                            {alert.title}
                          </AlertTitle>
                          <AlertDescription className="text-xs mt-1">
                            {alert.description}
                          </AlertDescription>
                        </div>
                        {alert.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs">
                            Sürgős
                          </Badge>
                        )}
                      </div>
                    </Alert>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Participant Insights */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Résztvevők
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowParticipants(!showParticipants)}
              >
                {showParticipants ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {showParticipants && (
            <CardContent>
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div key={participant.participantId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {participant.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{participant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(participant.speakingTime / 60)} perc
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          participant.engagement > 0.7 && "border-green-500 text-green-600",
                          participant.engagement < 0.3 && "border-red-500 text-red-600"
                        )}
                      >
                        {Math.round(participant.engagement * 100)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Key Moments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Kulcs pillanatok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="decisions" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="decisions" className="text-xs">Döntések</TabsTrigger>
                <TabsTrigger value="actions" className="text-xs">Teendők</TabsTrigger>
                <TabsTrigger value="insights" className="text-xs">Meglátások</TabsTrigger>
              </TabsList>
              <TabsContent value="decisions" className="mt-2">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    A meeting során hozott döntések itt jelennek meg
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="actions" className="mt-2">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Az azonosított teendők itt jelennek meg
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="insights" className="mt-2">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    AI által generált meglátások
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}