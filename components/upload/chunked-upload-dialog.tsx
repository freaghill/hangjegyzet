'use client'

import { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { 
  Upload, 
  X, 
  Pause, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  FileAudio,
  FileVideo,
  Clock,
  Zap,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/upload-validation'
import { ChunkedUploadManager, UploadProgress } from '@/lib/upload/chunked-upload'
import { useTranscriptionMode } from '@/hooks/use-transcription-mode'
import { ModeSelector, TranscriptionMode } from '@/components/transcription/mode-selector'
import { useToast } from '@/components/ui/use-toast'

interface ChunkedUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (meetingId: string) => void
  organizationId: string
}

interface UploadFile {
  file: File
  uploadId?: string
  progress: UploadProgress | null
  mode: TranscriptionMode
}

export function ChunkedUploadDialog({
  open,
  onOpenChange,
  onSuccess,
  organizationId
}: ChunkedUploadDialogProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [resumableUploads, setResumableUploads] = useState<any[]>([])
  const { mode, setMode } = useTranscriptionMode()
  const { toast } = useToast()
  
  const uploadManager = new ChunkedUploadManager()

  useEffect(() => {
    // Check for resumable uploads
    const uploads = ChunkedUploadManager.getResumableUploads()
    setResumableUploads(uploads)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      handleFiles(selectedFiles)
    }
  }, [])

  const handleFiles = async (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter(file => {
      const isAudio = file.type.startsWith('audio/')
      const isVideo = file.type.startsWith('video/')
      const isValidSize = file.size <= 2 * 1024 * 1024 * 1024 // 2GB
      
      if (!isAudio && !isVideo) {
        toast({
          title: 'Érvénytelen fájltípus',
          description: `${file.name} nem támogatott. Csak audio és videó fájlok engedélyezettek.`,
          variant: 'destructive'
        })
        return false
      }
      
      if (!isValidSize) {
        toast({
          title: 'Fájl túl nagy',
          description: `${file.name} meghaladja a 2GB-os limitet.`,
          variant: 'destructive'
        })
        return false
      }
      
      return true
    })

    const newFiles: UploadFile[] = validFiles.map(file => ({
      file,
      progress: null,
      mode
    }))

    setFiles(prev => [...prev, ...newFiles])
  }

  const startUpload = async (index: number) => {
    const uploadFile = files[index]
    if (!uploadFile) return

    try {
      const uploadId = await uploadManager.initializeUpload(
        uploadFile.file,
        (progress) => {
          setFiles(prev => prev.map((f, i) => 
            i === index ? { ...f, progress } : f
          ))
        }
      )

      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, uploadId } : f
      ))

      await uploadManager.uploadFile(
        uploadFile.file,
        uploadId,
        '/api/meetings/upload',
        {
          mode: uploadFile.mode,
          organizationId
        }
      )

      // Success
      toast({
        title: 'Feltöltés sikeres',
        description: `${uploadFile.file.name} feltöltve és átírás alatt.`
      })

      if (onSuccess) {
        // Get meeting ID from response
        // onSuccess(meetingId)
      }
    } catch (error: any) {
      toast({
        title: 'Feltöltési hiba',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const pauseUpload = (index: number) => {
    const uploadFile = files[index]
    if (uploadFile?.uploadId) {
      uploadManager.pauseUpload(uploadFile.uploadId)
    }
  }

  const resumeUpload = async (index: number) => {
    const uploadFile = files[index]
    if (!uploadFile?.uploadId) return

    try {
      await uploadManager.resumeUpload(
        uploadFile.file,
        uploadFile.uploadId,
        '/api/meetings/upload',
        {
          mode: uploadFile.mode,
          organizationId
        }
      )
    } catch (error: any) {
      toast({
        title: 'Folytatási hiba',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const cancelUpload = (index: number) => {
    const uploadFile = files[index]
    if (uploadFile?.uploadId) {
      uploadManager.cancelUpload(uploadFile.uploadId)
    }
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return '–'
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatSpeed = (bytesPerSecond: number): string => {
    if (!bytesPerSecond || !isFinite(bytesPerSecond)) return '–'
    return formatFileSize(bytesPerSecond) + '/s'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nagy fájlok feltöltése</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Selector */}
          <div>
            <h3 className="text-sm font-medium mb-2">Átírási mód</h3>
            <ModeSelector value={mode} onChange={setMode} />
          </div>

          {/* Resumable Uploads */}
          {resumableUploads.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {resumableUploads.length} befejezetlen feltöltés található. 
                Folytathatja ezeket vagy törölheti őket.
              </AlertDescription>
            </Alert>
          )}

          {/* Drop Zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              "cursor-pointer"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Húzza ide a fájlokat vagy kattintson a tallózáshoz
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum 2GB • Audio és videó fájlok támogatottak
            </p>
            <input
              id="file-input"
              type="file"
              className="hidden"
              multiple
              accept="audio/*,video/*"
              onChange={handleFileSelect}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Feltöltések</h3>
              {files.map((uploadFile, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    {/* File Info */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {uploadFile.file.type.startsWith('audio/') ? (
                          <FileAudio className="h-8 w-8 text-blue-500 mt-1" />
                        ) : (
                          <FileVideo className="h-8 w-8 text-purple-500 mt-1" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {uploadFile.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(uploadFile.file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!uploadFile.progress && (
                          <Button
                            size="sm"
                            onClick={() => startUpload(index)}
                          >
                            Feltöltés
                          </Button>
                        )}
                        {uploadFile.progress?.status === 'uploading' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => pauseUpload(index)}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {uploadFile.progress?.status === 'paused' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resumeUpload(index)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelUpload(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress */}
                    {uploadFile.progress && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>
                            {uploadFile.progress.uploadedChunks} / {uploadFile.progress.totalChunks} chunk
                          </span>
                          <span>{uploadFile.progress.percentage}%</span>
                        </div>
                        <Progress value={uploadFile.progress.percentage} />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {formatSpeed(uploadFile.progress.speed)}
                          </span>
                          <span>
                            Hátralévő idő: {formatTime(uploadFile.progress.remainingTime)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    {uploadFile.progress?.status === 'completed' && (
                      <div className="flex items-center space-x-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Feltöltés sikeres</span>
                      </div>
                    )}
                    {uploadFile.progress?.status === 'error' && (
                      <div className="flex items-center space-x-2 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>{uploadFile.progress.error}</span>
                      </div>
                    )}

                    {/* Mode Badge */}
                    <div className="flex items-center space-x-2">
                      {uploadFile.mode === 'fast' && (
                        <div className="flex items-center space-x-1 text-xs text-blue-600">
                          <Zap className="h-3 w-3" />
                          <span>Gyors mód</span>
                        </div>
                      )}
                      {uploadFile.mode === 'balanced' && (
                        <div className="flex items-center space-x-1 text-xs text-orange-600">
                          <Clock className="h-3 w-3" />
                          <span>Kiegyensúlyozott mód</span>
                        </div>
                      )}
                      {uploadFile.mode === 'precision' && (
                        <div className="flex items-center space-x-1 text-xs text-purple-600">
                          <Shield className="h-3 w-3" />
                          <span>Precíziós mód</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-xs font-medium">Folytatható feltöltés</p>
              <p className="text-xs text-muted-foreground">
                Megszakítás után folytatható
              </p>
            </div>
            <div className="text-center">
              <Shield className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-xs font-medium">Biztonságos</p>
              <p className="text-xs text-muted-foreground">
                Titkosított kapcsolat
              </p>
            </div>
            <div className="text-center">
              <Zap className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-xs font-medium">Gyors feldolgozás</p>
              <p className="text-xs text-muted-foreground">
                Párhuzamos chunk feltöltés
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}