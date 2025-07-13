import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  X, 
  Pause, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  FileAudio,
  FileVideo,
  Upload
} from 'lucide-react'
import { UploadProgress } from '@/lib/upload/chunked-upload'
import { formatFileSize } from '@/lib/upload-validation'
import { cn } from '@/lib/utils'

interface UploadProgressCardProps {
  fileName: string
  fileSize: number
  fileType: string
  progress: UploadProgress | null
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
  className?: string
}

export function UploadProgressCard({
  fileName,
  fileSize,
  fileType,
  progress,
  onPause,
  onResume,
  onCancel,
  className
}: UploadProgressCardProps) {
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

  const getIcon = () => {
    if (fileType.startsWith('audio/')) {
      return <FileAudio className="h-5 w-5 text-blue-500" />
    } else if (fileType.startsWith('video/')) {
      return <FileVideo className="h-5 w-5 text-purple-500" />
    }
    return <Upload className="h-5 w-5 text-gray-500" />
  }

  const getStatusIcon = () => {
    if (!progress) return null
    
    switch (progress.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(fileSize)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            {progress?.status === 'uploading' && onPause && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onPause}
                className="h-8 w-8 p-0"
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}
            {progress?.status === 'paused' && onResume && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onResume}
                className="h-8 w-8 p-0"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            {onCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancel}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        {progress && progress.status !== 'preparing' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {progress.uploadedChunks}/{progress.totalChunks} részlet
              </span>
              <span className="font-medium">{progress.percentage}%</span>
            </div>
            
            <Progress 
              value={progress.percentage} 
              className="h-2"
            />
            
            {progress.status === 'uploading' && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatSpeed(progress.speed)}</span>
                <span>Hátralévő: {formatTime(progress.remainingTime)}</span>
              </div>
            )}
          </div>
        )}

        {/* Status message */}
        {progress?.status === 'completed' && (
          <p className="text-xs text-green-600">Feltöltés sikeres</p>
        )}
        {progress?.status === 'error' && (
          <p className="text-xs text-red-600">{progress.error || 'Feltöltési hiba'}</p>
        )}
        {progress?.status === 'paused' && (
          <p className="text-xs text-yellow-600">Feltöltés szüneteltetve</p>
        )}
      </div>
    </Card>
  )
}