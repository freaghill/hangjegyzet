'use client'

import { useTranscriptionProgress } from '@/hooks/use-transcription-progress'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileAudio,
  RotateCw,
  Zap,
  Shield,
  Brain
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/utils/format'

interface TranscriptionStatusProps {
  meetingId: string
  className?: string
  onComplete?: () => void
  showDetails?: boolean
}

export function TranscriptionStatus({ 
  meetingId, 
  className,
  onComplete,
  showDetails = true
}: TranscriptionStatusProps) {
  const {
    status,
    progress,
    result,
    error,
    isConnected,
    retry
  } = useTranscriptionProgress({
    meetingId,
    onComplete: (result) => {
      onComplete?.()
    }
  })

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case 'transcribed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'processing':
        return 'Átírás folyamatban'
      case 'transcribed':
        return 'Átírás kész'
      case 'failed':
        return 'Átírás sikertelen'
      default:
        return 'Várakozás'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600'
      case 'transcribed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (!showDetails) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        {getStatusIcon()}
        <span className={cn("text-sm font-medium", getStatusColor())}>
          {getStatusText()}
        </span>
        {status === 'processing' && (
          <span className="text-sm text-muted-foreground">
            {progress}%
          </span>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div>
                <p className={cn("font-medium", getStatusColor())}>
                  {getStatusText()}
                </p>
                {!isConnected && status === 'processing' && (
                  <p className="text-xs text-muted-foreground">
                    Kapcsolat megszakadt
                  </p>
                )}
              </div>
            </div>
            {status === 'failed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={retry}
              >
                <RotateCw className="h-4 w-4 mr-1" />
                Újra
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          {status === 'processing' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Folyamat</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {progress < 20 && 'Audio fájl letöltése...'}
                {progress >= 20 && progress < 30 && 'Előfeldolgozás...'}
                {progress >= 30 && progress < 80 && 'Beszéd felismerése...'}
                {progress >= 80 && progress < 90 && 'Utófeldolgozás...'}
                {progress >= 90 && 'Véglegesítés...'}
              </div>
            </div>
          )}

          {/* Error Message */}
          {status === 'failed' && error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Result Details */}
          {status === 'transcribed' && result && (
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <FileAudio className="h-8 w-8 text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Időtartam</p>
                <p className="text-sm font-medium">
                  {formatDuration(result.duration || 0)}
                </p>
              </div>
              <div className="text-center">
                <Brain className="h-8 w-8 text-purple-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Szavak száma</p>
                <p className="text-sm font-medium">
                  {result.wordCount?.toLocaleString() || '–'}
                </p>
              </div>
              <div className="text-center">
                <Zap className="h-8 w-8 text-yellow-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Feldolgozási idő</p>
                <p className="text-sm font-medium">
                  {formatDuration((result.processingTime || 0) / 1000)}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}