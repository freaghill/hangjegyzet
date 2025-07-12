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
import { toast } from 'sonner'
import { ModeSelector, type TranscriptionMode } from '@/components/transcription/mode-selector'
import { audioQualityAnalyzer, type AudioQualityMetrics } from '@/lib/audio/quality-analyzer'
import { cn } from '@/lib/utils'
import { Upload, FileAudio, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import type { SubscriptionPlanDetails, ModeAllocation } from '@/lib/payments/subscription-plans'

interface UploadDialogProps {
  children: React.ReactNode
  userPlan?: SubscriptionPlanDetails
  currentUsage?: ModeAllocation
}

export function UploadDialog({ children, userPlan, currentUsage }: UploadDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [selectedMode, setSelectedMode] = useState<TranscriptionMode>('balanced')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [audioMetrics, setAudioMetrics] = useState<AudioQualityMetrics | null>(null)
  const [estimatedDuration, setEstimatedDuration] = useState(60)

  // Analyze audio quality when file is selected
  useEffect(() => {
    if (file && file.type.startsWith('audio/')) {
      analyzeAudioQuality(file)
    }
  }, [file])

  const analyzeAudioQuality = async (audioFile: File) => {
    setAnalyzing(true)
    try {
      const metrics = await audioQualityAnalyzer.analyzeFile(audioFile)
      setAudioMetrics(metrics)
      
      // Update selected mode based on recommendation
      if (metrics.recommendation.confidence > 0.7) {
        setSelectedMode(metrics.recommendation.mode)
      }
      
      // Estimate duration based on file size (rough estimate)
      const fileSizeMB = audioFile.size / (1024 * 1024)
      const estimatedMinutes = Math.ceil(fileSizeMB * 1.5) // ~1.5 min per MB
      setEstimatedDuration(estimatedMinutes)
    } catch (error) {
      console.error('Audio analysis failed:', error)
    } finally {
      setAnalyzing(false)
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
    }
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
      formData.append('mode', selectedMode)
      formData.append('estimatedDuration', estimatedDuration.toString())

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
    setSelectedMode('balanced')
    setAudioMetrics(null)
    setEstimatedDuration(60)
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen)
      if (!newOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Új meeting feltöltése</DialogTitle>
          <DialogDescription>
            Töltsön fel egy hang- vagy videofájlt az átíráshoz
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Zajszint:</span>
                  <span className="ml-2">{Math.round((1 - audioMetrics.noiseLevel) * 100)}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Tisztaság:</span>
                  <span className="ml-2">{Math.round(audioMetrics.clarity * 100)}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Mintavétel:</span>
                  <span className="ml-2">{audioMetrics.sampleRate / 1000} kHz</span>
                </div>
                <div>
                  <span className="text-gray-600">Bitráta:</span>
                  <span className="ml-2">{audioMetrics.bitRate} kbps</span>
                </div>
              </div>

              {audioMetrics.recommendation.reasons.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-600">
                    {audioMetrics.recommendation.reasons.join(' • ')}
                  </p>
                </div>
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
              estimatedDuration={estimatedDuration}
            />
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Feltöltés folyamatban...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={uploading}
          >
            Mégse
          </Button>
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
        </div>
      </DialogContent>
    </Dialog>
  )
}