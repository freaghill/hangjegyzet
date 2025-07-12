'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Mic,
  MicOff,
  Bookmark,
  CheckCircle,
  Star,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Battery,
  Vibrate,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Zap,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  Settings,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
// Swipe detection will be implemented with touch events

interface MobileCompanionProps {
  meetingId: string
  enableVibration?: boolean
  enableDiscreteMode?: boolean
  enableLowDataMode?: boolean
  onQuickAction?: (action: string, data?: any) => void
  className?: string
}

interface QuickStat {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
}

interface CoachingAlert {
  id: string
  type: 'speaking' | 'engagement' | 'energy' | 'time'
  message: string
  action?: string
  vibrationPattern?: number[]
}

export function MobileCompanion({
  meetingId,
  enableVibration = true,
  enableDiscreteMode = false,
  enableLowDataMode = false,
  onQuickAction,
  className
}: MobileCompanionProps) {
  const [isMuted, setIsMuted] = useState(true)
  const [isRecording, setIsRecording] = useState(true)
  const [discreteMode, setDiscreteMode] = useState(enableDiscreteMode)
  const [lowDataMode, setLowDataMode] = useState(enableLowDataMode)
  const [vibrationEnabled, setVibrationEnabled] = useState(enableVibration)
  const [currentView, setCurrentView] = useState<'transcript' | 'stats' | 'coach'>('transcript')
  const [batteryLevel, setBatteryLevel] = useState(85)
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good')
  const [transcript, setTranscript] = useState<string[]>([])
  const [coachingAlerts, setCoachingAlerts] = useState<CoachingAlert[]>([])
  const [quickStats, setQuickStats] = useState<QuickStat[]>([
    { label: 'Beszédidő', value: '5:32', icon: <Clock className="h-4 w-4" /> },
    { label: 'Részvétel', value: '68%', trend: 'up', icon: <Users className="h-4 w-4" /> },
    { label: 'Energia', value: '72%', trend: 'neutral', icon: <Zap className="h-4 w-4" /> },
    { label: 'Döntések', value: 3, icon: <CheckCircle className="h-4 w-4" /> }
  ])
  
  const transcriptRef = useRef<HTMLDivElement>(null)
  const [showQuickActions, setShowQuickActions] = useState(true)
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)

  // Touch handlers for swipe detection
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchEndX - touchStartX.current
    const deltaY = touchEndY - touchStartY.current
    const threshold = 50

    // Horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // Swipe right
        if (currentView === 'coach') setCurrentView('stats')
        else if (currentView === 'stats') setCurrentView('transcript')
      } else {
        // Swipe left
        if (currentView === 'transcript') setCurrentView('stats')
        else if (currentView === 'stats') setCurrentView('coach')
      }
    }
    // Vertical swipe
    else if (Math.abs(deltaY) > threshold) {
      if (deltaY > 0) {
        // Swipe down
        setShowQuickActions(true)
      } else {
        // Swipe up
        setShowQuickActions(false)
      }
    }
  }

  // Vibration support
  const vibrate = (pattern: number[] = [200]) => {
    if (vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  // Mock coaching alerts
  useEffect(() => {
    const mockAlert = () => {
      const alerts: CoachingAlert[] = [
        {
          id: '1',
          type: 'speaking',
          message: 'Ön 5 perce beszél folyamatosan',
          action: 'Adjon szót másnak',
          vibrationPattern: [100, 50, 100]
        },
        {
          id: '2',
          type: 'engagement',
          message: 'Alacsony részvétel észlelve',
          action: 'Tegyen fel kérdést',
          vibrationPattern: [200, 100, 200]
        },
        {
          id: '3',
          type: 'time',
          message: 'Időtúllépés veszélye',
          action: 'Gyorsítson',
          vibrationPattern: [300]
        }
      ]
      
      const randomAlert = alerts[Math.floor(Math.random() * alerts.length)]
      setCoachingAlerts(prev => [...prev.slice(-2), randomAlert])
      
      if (discreteMode) {
        vibrate(randomAlert.vibrationPattern)
      }
    }
    
    const interval = setInterval(mockAlert, 20000)
    return () => clearInterval(interval)
  }, [discreteMode])

  // Mock transcript updates
  useEffect(() => {
    if (!lowDataMode) {
      const mockTranscript = () => {
        const sentences = [
          'Az új projekt ütemezését át kell gondolnunk.',
          'Egyetértek, de előbb nézzük meg az erőforrásokat.',
          'Javaslom, hogy osszuk fel kisebb szakaszokra.',
          'Ez jó ötlet, készítsünk egy részletes tervet.'
        ]
        
        setTranscript(prev => [...prev.slice(-10), sentences[Math.floor(Math.random() * sentences.length)]])
      }
      
      const interval = setInterval(mockTranscript, 3000)
      return () => clearInterval(interval)
    }
  }, [lowDataMode])

  // Battery monitoring
  useEffect(() => {
    const updateBattery = async () => {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery()
        setBatteryLevel(Math.round(battery.level * 100))
      }
    }
    
    updateBattery()
    const interval = setInterval(updateBattery, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleQuickAction = (action: string) => {
    vibrate([50])
    onQuickAction?.(action)
    
    // Visual feedback
    const button = document.getElementById(`quick-action-${action}`)
    if (button) {
      button.classList.add('scale-95')
      setTimeout(() => button.classList.remove('scale-95'), 100)
    }
  }

  const getTrendIcon = (trend?: string) => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-green-500" />
    if (trend === 'down') return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />
    return null
  }

  return (
    <div 
      className={cn("flex flex-col h-full bg-background", className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between p-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="h-8 w-8"
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-red-500" />}
          </Button>
          <Badge variant={isRecording ? "default" : "secondary"} className="text-xs">
            {isRecording ? 'Rögzítés' : 'Szünet'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          {connectionQuality === 'good' ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : connectionQuality === 'poor' ? (
            <Wifi className="h-4 w-4 text-yellow-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <Battery className={cn(
            "h-4 w-4",
            batteryLevel > 50 ? "text-green-500" : batteryLevel > 20 ? "text-yellow-500" : "text-red-500"
          )} />
          <span className="text-xs text-muted-foreground">{batteryLevel}%</span>
        </div>
      </div>

      {/* View Indicator */}
      <div className="flex items-center justify-center gap-2 py-2">
        <div className={cn(
          "h-1.5 w-12 rounded-full transition-colors",
          currentView === 'transcript' ? "bg-primary" : "bg-muted"
        )} />
        <div className={cn(
          "h-1.5 w-12 rounded-full transition-colors",
          currentView === 'stats' ? "bg-primary" : "bg-muted"
        )} />
        <div className={cn(
          "h-1.5 w-12 rounded-full transition-colors",
          currentView === 'coach' ? "bg-primary" : "bg-muted"
        )} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* Transcript View */}
        {currentView === 'transcript' && (
          <div className="h-full flex flex-col">
            {discreteMode ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-sm">
                  <CardContent className="pt-6 text-center">
                    <EyeOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Diszkrét mód aktív
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Rezgés értesítések bekapcsolva
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4" ref={transcriptRef}>
                <div className="space-y-2">
                  {transcript.map((text, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-card border text-sm animate-in slide-in-from-bottom-2"
                    >
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats View */}
        {currentView === 'stats' && (
          <div className="h-full p-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {quickStats.map((stat, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    {stat.icon}
                    {getTrendIcon(stat.trend)}
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </Card>
              ))}
            </div>
            
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Meeting egészség</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Részvétel</span>
                      <span>68%</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Produktivitás</span>
                      <span>75%</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Időhatékonyság</span>
                      <span>82%</span>
                    </div>
                    <Progress value={82} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Coach View */}
        {currentView === 'coach' && (
          <div className="h-full p-4 overflow-y-auto">
            <div className="space-y-3">
              {coachingAlerts.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Nincs aktív coaching javaslat
                    </p>
                  </CardContent>
                </Card>
              ) : (
                coachingAlerts.map((alert) => (
                  <Alert key={alert.id} className="p-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="ml-2">
                      <p className="font-medium text-sm">{alert.message}</p>
                      {alert.action && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Javaslat: {alert.action}
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                ))
              )}
            </div>
            
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Coaching beállítások
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Rezgés értesítések</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setVibrationEnabled(!vibrationEnabled)}
                      className="h-8 w-8"
                    >
                      {vibrationEnabled ? <Vibrate className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Diszkrét mód</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDiscreteMode(!discreteMode)}
                      className="h-8 w-8"
                    >
                      {discreteMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Adattakarékos</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setLowDataMode(!lowDataMode)}
                      className="h-8 w-8"
                    >
                      {lowDataMode ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Quick Actions Bar */}
      {showQuickActions && (
        <div className="border-t bg-card p-3">
          <div className="flex items-center justify-around">
            <Button
              id="quick-action-bookmark"
              variant="ghost"
              size="icon"
              onClick={() => handleQuickAction('bookmark')}
              className="h-10 w-10 transition-transform"
            >
              <Bookmark className="h-5 w-5" />
            </Button>
            <Button
              id="quick-action-action"
              variant="ghost"
              size="icon"
              onClick={() => handleQuickAction('action')}
              className="h-10 w-10 transition-transform"
            >
              <CheckCircle className="h-5 w-5" />
            </Button>
            <Button
              id="quick-action-decision"
              variant="ghost"
              size="icon"
              onClick={() => handleQuickAction('decision')}
              className="h-10 w-10 transition-transform"
            >
              <Star className="h-5 w-5" />
            </Button>
            <Button
              id="quick-action-note"
              variant="ghost"
              size="icon"
              onClick={() => handleQuickAction('note')}
              className="h-10 w-10 transition-transform"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Swipe indicator */}
          <div className="flex items-center justify-center mt-2">
            <ChevronUp className="h-4 w-4 text-muted-foreground animate-bounce" />
          </div>
        </div>
      )}
    </div>
  )
}