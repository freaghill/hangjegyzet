'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Play,
  Pause,
  Square,
  Download,
  Settings,
  Bell,
  BellOff,
  Brain,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  FileText,
  FileSpreadsheet,
  FileImage,
  Share2,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Volume2,
  Wifi,
  WifiOff,
  RefreshCw,
  MoreVertical
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MeetingControlsProps {
  meetingId: string
  isRecording: boolean
  isPaused: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onPauseResume: () => void
  onEndMeeting: () => void
  onExport: (format: string) => void
  enableAlerts?: boolean
  enableCoaching?: boolean
  onAlertsChange?: (enabled: boolean) => void
  onCoachingChange?: (enabled: boolean) => void
  className?: string
}

interface ExportFormat {
  id: string
  name: string
  description: string
  icon: React.ReactNode
}

interface AlertConfig {
  type: string
  label: string
  enabled: boolean
  threshold?: number
}

export function MeetingControls({
  meetingId,
  isRecording,
  isPaused,
  onStartRecording,
  onStopRecording,
  onPauseResume,
  onEndMeeting,
  onExport,
  enableAlerts = true,
  enableCoaching = true,
  onAlertsChange,
  onCoachingChange,
  className
}: MeetingControlsProps) {
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [selectedExportFormat, setSelectedExportFormat] = useState<string>('pdf')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Recording settings
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(false)
  const [transcriptionQuality, setTranscriptionQuality] = useState<'standard' | 'enhanced'>('enhanced')
  
  // Alert configurations
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([
    { type: 'speaking_time', label: 'Beszédidő egyensúly', enabled: true, threshold: 5 },
    { type: 'low_engagement', label: 'Alacsony részvétel', enabled: true, threshold: 10 },
    { type: 'topic_drift', label: 'Téma eltérés', enabled: true },
    { type: 'meeting_overrun', label: 'Időtúllépés', enabled: true, threshold: 15 },
    { type: 'decision_needed', label: 'Döntés szükséges', enabled: true },
    { type: 'conflict_detection', label: 'Konfliktus észlelés', enabled: false }
  ])
  
  // Coach settings
  const [coachMode, setCoachMode] = useState<'passive' | 'active' | 'proactive'>('active')
  const [coachFrequency, setCoachFrequency] = useState<'low' | 'medium' | 'high'>('medium')

  const exportFormats: ExportFormat[] = [
    { id: 'pdf', name: 'PDF', description: 'Formázott dokumentum', icon: <FileText className="h-4 w-4" /> },
    { id: 'docx', name: 'Word', description: 'Szerkeszthető dokumentum', icon: <FileText className="h-4 w-4" /> },
    { id: 'txt', name: 'Szöveg', description: 'Egyszerű szövegfájl', icon: <FileText className="h-4 w-4" /> },
    { id: 'xlsx', name: 'Excel', description: 'Strukturált adatok', icon: <FileSpreadsheet className="h-4 w-4" /> },
    { id: 'json', name: 'JSON', description: 'Gépi feldolgozáshoz', icon: <FileText className="h-4 w-4" /> }
  ]

  const handleExport = () => {
    setIsProcessing(true)
    setTimeout(() => {
      onExport(selectedExportFormat)
      setShowExportDialog(false)
      setIsProcessing(false)
    }, 1500)
  }

  const handleEndMeeting = () => {
    setShowEndDialog(false)
    onEndMeeting()
  }

  const toggleAlertConfig = (index: number) => {
    const newConfigs = [...alertConfigs]
    newConfigs[index].enabled = !newConfigs[index].enabled
    setAlertConfigs(newConfigs)
  }

  const updateAlertThreshold = (index: number, threshold: number) => {
    const newConfigs = [...alertConfigs]
    newConfigs[index].threshold = threshold
    setAlertConfigs(newConfigs)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Square className="h-5 w-5" />
            Rögzítés vezérlők
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Control Buttons */}
            <div className="flex flex-wrap gap-2">
              {!isRecording ? (
                <Button 
                  onClick={onStartRecording}
                  className="flex-1"
                  variant="default"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Rögzítés indítása
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={onStopRecording}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Leállítás
                  </Button>
                  <Button 
                    onClick={onPauseResume}
                    variant="outline"
                    className="flex-1"
                  >
                    {isPaused ? (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Folytatás
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Szünet
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            {/* Recording Status */}
            {isRecording && (
              <Alert className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                    )} />
                    <span className="text-sm font-medium">
                      {isPaused ? 'Szüneteltetve' : 'Rögzítés folyamatban'}
                    </span>
                  </div>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    12:34
                  </Badge>
                </div>
              </Alert>
            )}

            {/* Media Controls */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  <span className="text-sm">Mikrofon</span>
                </div>
                <Switch 
                  checked={audioEnabled} 
                  onCheckedChange={setAudioEnabled}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  <span className="text-sm">Videó</span>
                </div>
                <Switch 
                  checked={videoEnabled} 
                  onCheckedChange={setVideoEnabled}
                />
              </div>
            </div>

            {/* Quality Settings */}
            <div className="space-y-2">
              <Label className="text-sm">Átírás minősége</Label>
              <Select value={transcriptionQuality} onValueChange={(value: any) => setTranscriptionQuality(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      <span>Standard - Gyorsabb, kevesebb adat</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="enhanced">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      <span>Továbbfejlesztett - Pontosabb átírás</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI funkciók
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="alerts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="alerts">Értesítések</TabsTrigger>
              <TabsTrigger value="coach">Coach</TabsTrigger>
            </TabsList>
            
            <TabsContent value="alerts" className="space-y-3 mt-4">
              <div className="flex items-center justify-between mb-3">
                <Label>Intelligens értesítések</Label>
                <Switch 
                  checked={enableAlerts} 
                  onCheckedChange={onAlertsChange}
                />
              </div>
              
              {enableAlerts && (
                <div className="space-y-2">
                  {alertConfigs.map((config, index) => (
                    <div key={config.type} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={config.enabled}
                          onCheckedChange={() => toggleAlertConfig(index)}
                        />
                        <span className="text-sm">{config.label}</span>
                      </div>
                      {config.threshold !== undefined && config.enabled && (
                        <Select 
                          value={config.threshold.toString()} 
                          onValueChange={(value) => updateAlertThreshold(index, parseInt(value))}
                        >
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 perc</SelectItem>
                            <SelectItem value="10">10 perc</SelectItem>
                            <SelectItem value="15">15 perc</SelectItem>
                            <SelectItem value="20">20 perc</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="coach" className="space-y-3 mt-4">
              <div className="flex items-center justify-between mb-3">
                <Label>AI Coach</Label>
                <Switch 
                  checked={enableCoaching} 
                  onCheckedChange={onCoachingChange}
                />
              </div>
              
              {enableCoaching && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Coach mód</Label>
                    <Select value={coachMode} onValueChange={(value: any) => setCoachMode(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passive">Passzív - Csak figyel</SelectItem>
                        <SelectItem value="active">Aktív - Javaslatok kérésre</SelectItem>
                        <SelectItem value="proactive">Proaktív - Automatikus javaslatok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Javaslatok gyakorisága</Label>
                    <Select value={coachFrequency} onValueChange={(value: any) => setCoachFrequency(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Alacsony - Csak kritikus</SelectItem>
                        <SelectItem value="medium">Közepes - Kiegyensúlyozott</SelectItem>
                        <SelectItem value="high">Magas - Részletes coaching</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gyors műveletek</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowExportDialog(true)}
              disabled={!isRecording && !isPaused}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportálás
            </Button>
            <Button 
              variant="outline"
              onClick={() => toast.info('Megosztás funkció hamarosan')}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Megosztás
            </Button>
            <Button 
              variant="outline"
              onClick={() => toast.info('Résztvevők kezelése')}
            >
              <Users className="h-4 w-4 mr-2" />
              Résztvevők
            </Button>
            <Button 
              variant="destructive"
              onClick={() => setShowEndDialog(true)}
            >
              <Square className="h-4 w-4 mr-2" />
              Befejezés
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integrációk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg border">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Google Calendar</span>
              </div>
              <Badge variant="outline" className="text-xs">Szinkronizálva</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg border">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Zoom</span>
              </div>
              <Badge variant="outline" className="text-xs">Részleges</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg border">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Slack</span>
              </div>
              <Badge variant="outline" className="text-xs">Nincs kapcsolat</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meeting exportálása</DialogTitle>
            <DialogDescription>
              Válassza ki a kívánt export formátumot
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {exportFormats.map((format) => (
              <div
                key={format.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedExportFormat === format.id && "border-primary bg-primary/5"
                )}
                onClick={() => setSelectedExportFormat(format.id)}
              >
                <div className="flex items-center gap-3">
                  {format.icon}
                  <div>
                    <p className="font-medium">{format.name}</p>
                    <p className="text-sm text-muted-foreground">{format.description}</p>
                  </div>
                </div>
                <div className={cn(
                  "h-4 w-4 rounded-full border-2",
                  selectedExportFormat === format.id ? "border-primary bg-primary" : "border-muted"
                )} />
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Mégse
            </Button>
            <Button onClick={handleExport} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Exportálás...
                </>
              ) : (
                'Exportálás'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Meeting Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meeting befejezése</DialogTitle>
            <DialogDescription>
              Biztosan befejezi a meetinget? A rögzítés leáll és az átirat mentésre kerül.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Mégse
            </Button>
            <Button variant="destructive" onClick={handleEndMeeting}>
              Meeting befejezése
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}