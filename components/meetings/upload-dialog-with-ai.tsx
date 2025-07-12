'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { ModeSelector, type TranscriptionMode } from '@/components/transcription/mode-selector'
import { TemplateSelector } from '@/components/meetings/template-selector'
import { audioQualityAnalyzer, type AudioQualityMetrics } from '@/lib/audio/quality-analyzer'
import { cn } from '@/lib/utils'
import { 
  Upload, 
  FileAudio, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Brain,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Sparkles,
  Target,
  Lightbulb
} from 'lucide-react'
import type { SubscriptionPlanDetails, ModeAllocation } from '@/lib/payments/subscription-plans'

interface UploadDialogWithAIProps {
  children: React.ReactNode
  userPlan?: SubscriptionPlanDetails
  currentUsage?: ModeAllocation
  organizationId: string
}

interface AIPredictions {
  estimatedDuration: number
  predictedTopics: Array<{
    topic: string
    confidence: number
  }>
  suggestedParticipants: string[]
  recommendedTemplate: {
    templateId: string
    confidence: number
    reason: string
  }
  optimalTime: {
    day: string
    time: string
    reason: string
  }
  preparationTips: string[]
}

export function UploadDialogWithAI({ 
  children, 
  userPlan, 
  currentUsage,
  organizationId 
}: UploadDialogWithAIProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('upload')
  
  // File upload state
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMode, setSelectedMode] = useState<TranscriptionMode>('balanced')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [participants, setParticipants] = useState<string[]>([])
  const [participantInput, setParticipantInput] = useState('')
  
  // Analysis state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [audioMetrics, setAudioMetrics] = useState<AudioQualityMetrics | null>(null)
  const [predictions, setPredictions] = useState<AIPredictions | null>(null)
  const [loadingPredictions, setLoadingPredictions] = useState(false)

  // Analyze audio quality when file is selected
  useEffect(() => {
    if (file && file.type.startsWith('audio/')) {
      analyzeAudioQuality(file)
    }
  }, [file])

  // Load AI predictions when participants or template changes
  useEffect(() => {
    if (participants.length > 0 || selectedTemplateId) {
      loadAIPredictions()
    }
  }, [participants, selectedTemplateId])

  const analyzeAudioQuality = async (audioFile: File) => {
    setAnalyzing(true)
    try {
      const metrics = await audioQualityAnalyzer.analyzeFile(audioFile)
      setAudioMetrics(metrics)
      
      // Update selected mode based on recommendation
      if (metrics.recommendation.confidence > 0.7) {
        setSelectedMode(metrics.recommendation.mode)
      }
    } catch (error) {
      console.error('Audio analysis failed:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const loadAIPredictions = async () => {
    setLoadingPredictions(true)
    try {
      const response = await fetch('/api/ai/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          participants,
          templateId: selectedTemplateId,
          fileSize: file?.size,
          audioQuality: audioMetrics?.overallQuality
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPredictions(data)
      }
    } catch (error) {
      console.error('Error loading predictions:', error)
    } finally {
      setLoadingPredictions(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
        'audio/mp4', 'audio/x-m4a', 'audio/aac',
        'video/mp4', 'video/quicktime', 'video/x-msvideo'
      ]
      
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error('Nem támogatott fájlformátum. Használjon MP3, WAV, M4A, MP4 vagy MOV fájlt.')
        return
      }
      
      // Validate file size (500MB)
      if (selectedFile.size > 500 * 1024 * 1024) {
        toast.error('A fájl túl nagy. Maximum 500MB engedélyezett.')
        return
      }
      
      setFile(selectedFile)
      
      // Extract title from filename
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, '')
      setTitle(fileName)
    }
  }

  const handleAddParticipant = () => {
    if (participantInput && !participants.includes(participantInput)) {
      setParticipants([...participants, participantInput])
      setParticipantInput('')
    }
  }

  const handleRemoveParticipant = (email: string) => {
    setParticipants(participants.filter(p => p !== email))
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Kérjük válasszon ki egy fájlt')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title || file.name)
      formData.append('description', description)
      formData.append('mode', selectedMode)
      formData.append('templateId', selectedTemplateId || '')
      formData.append('participants', JSON.stringify(participants))
      formData.append('estimatedDuration', predictions?.estimatedDuration?.toString() || '60')

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Upload file
      const response = await fetch('/api/meetings/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Feltöltés sikertelen')
      }

      toast.success(data.message || 'Fájl sikeresen feltöltve!')
      
      // Close dialog and redirect to meeting
      setOpen(false)
      router.push(`/meetings/${data.meeting.id}`)
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Feltöltés sikertelen')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const resetForm = () => {
    setFile(null)
    setTitle('')
    setDescription('')
    setSelectedMode('balanced')
    setSelectedTemplateId(null)
    setParticipants([])
    setParticipantInput('')
    setAudioMetrics(null)
    setPredictions(null)
    setActiveTab('upload')
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen)
      if (!newOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Új meeting feltöltése AI elemzéssel
          </DialogTitle>
          <DialogDescription>
            Töltsön fel egy fájlt és használja ki az AI előrejelzéseket
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Feltöltés</TabsTrigger>
            <TabsTrigger value="details">Részletek</TabsTrigger>
            <TabsTrigger value="predictions" disabled={!file}>
              AI Előrejelzések
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
            {/* File Upload */}
            <div className="space-y-4">
              <Label htmlFor="file">Fájl kiválasztása</Label>
              <div className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                file ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              )}>
                <input
                  id="file"
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="file"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  {file ? (
                    <>
                      <FileAudio className="w-12 h-12 text-blue-600" />
                      <div>
                        <p className="font-semibold">{file.name}</p>
                        <p className="text-sm text-gray-600">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400" />
                      <p className="text-gray-600">
                        Kattintson ide vagy húzza ide a fájlt
                      </p>
                      <p className="text-xs text-gray-500">
                        MP3, WAV, M4A, MP4, MOV (max 500MB)
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Audio Quality Analysis */}
            {analyzing && (
              <div className="bg-gray-50 rounded-lg p-4 flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                <span className="text-sm text-gray-600">Hangminőség elemzése...</span>
              </div>
            )}

            {audioMetrics && !analyzing && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Hangminőség elemzés</h4>
                  <div className="flex items-center space-x-2">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      audioMetrics.overallQuality > 0.7 ? 'bg-green-500' :
                      audioMetrics.overallQuality > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                    )} />
                    <span className="text-sm">
                      {audioMetrics.overallQuality > 0.7 ? 'Jó' :
                       audioMetrics.overallQuality > 0.5 ? 'Közepes' : 'Gyenge'}
                    </span>
                  </div>
                </div>
                
                {audioMetrics.recommendation.reasons.length > 0 && (
                  <p className="text-xs text-gray-600">
                    {audioMetrics.recommendation.reasons.join(' • ')}
                  </p>
                )}
              </div>
            )}

            {/* Mode Selection */}
            {file && (
              <ModeSelector
                selectedMode={selectedMode}
                onModeChange={setSelectedMode}
                currentUsage={currentUsage}
                userPlan={userPlan}
                audioQuality={audioMetrics?.overallQuality}
                estimatedDuration={predictions?.estimatedDuration || 60}
              />
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Meeting Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Meeting címe</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="pl. Heti státusz meeting"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Leírás (opcionális)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rövid leírás a meetingről"
                  className="mt-1"
                />
              </div>

              {/* Template Selection */}
              <TemplateSelector
                onSelect={setSelectedTemplateId}
                selectedTemplateId={selectedTemplateId}
                showDescription={true}
              />

              {/* Participants */}
              <div>
                <Label>Résztvevők</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={participantInput}
                    onChange={(e) => setParticipantInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddParticipant()}
                    placeholder="Email cím"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddParticipant}
                  >
                    Hozzáadás
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {participants.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveParticipant(email)}
                    >
                      {email} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4 mt-4">
            {loadingPredictions ? (
              <div className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">AI előrejelzések generálása...</p>
              </div>
            ) : predictions ? (
              <div className="space-y-4">
                {/* Duration Prediction */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Becsült időtartam
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{predictions.estimatedDuration} perc</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Korábbi hasonló meetingek alapján
                    </p>
                  </CardContent>
                </Card>

                {/* Predicted Topics */}
                {predictions.predictedTopics.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Várható témák
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {predictions.predictedTopics.map((topic, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm">{topic.topic}</span>
                            <Badge variant="outline" className="text-xs">
                              {topic.confidence}% valószínűség
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Suggested Participants */}
                {predictions.suggestedParticipants.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Javasolt résztvevők
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-2">
                        Akik általában részt vesznek hasonló meetingeken:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {predictions.suggestedParticipants.map((email) => (
                          <Button
                            key={email}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (!participants.includes(email)) {
                                setParticipants([...participants, email])
                              }
                            }}
                            disabled={participants.includes(email)}
                          >
                            {participants.includes(email) ? <CheckCircle className="mr-1 h-3 w-3" /> : '+'}
                            {email}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Template Recommendation */}
                {predictions.recommendedTemplate && !selectedTemplateId && (
                  <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription>
                      <strong>AI javaslat:</strong> {predictions.recommendedTemplate.reason}
                      <Button
                        variant="link"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          setSelectedTemplateId(predictions.recommendedTemplate.templateId)
                          setActiveTab('details')
                        }}
                      >
                        Sablon használata
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Preparation Tips */}
                {predictions.preparationTips.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Felkészülési tippek
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {predictions.preparationTips.map((tip, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-gray-400">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">
                  Adjon meg résztvevőket vagy válasszon sablont az AI előrejelzésekhez
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span>Feltöltés folyamatban...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (activeTab === 'predictions') setActiveTab('details')
              else if (activeTab === 'details') setActiveTab('upload')
            }}
            disabled={activeTab === 'upload' || uploading}
          >
            Vissza
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploading}
            >
              Mégse
            </Button>
            
            {activeTab !== 'predictions' ? (
              <Button
                onClick={() => {
                  if (activeTab === 'upload' && file) setActiveTab('details')
                  else if (activeTab === 'details') setActiveTab('predictions')
                }}
                disabled={!file || uploading}
              >
                Tovább
              </Button>
            ) : (
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Feltöltés...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Feltöltés és átírás
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}