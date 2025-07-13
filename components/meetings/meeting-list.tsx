'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { hu } from 'date-fns/locale'
import { 
  FileAudio, 
  Clock, 
  Users, 
  Calendar,
  MoreVertical,
  Play,
  Download,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface Meeting {
  id: string
  title: string
  duration_seconds: number
  created_at: string
  file_size: number
  transcription_status: 'pending' | 'processing' | 'completed' | 'failed'
  transcription_progress?: number
  speakers_count?: number
  language?: string
  meeting_date?: string
  tags?: string[]
}

interface MeetingListProps {
  meetings: Meeting[]
  onPlay?: (meeting: Meeting) => void
  onDownload?: (meeting: Meeting) => void
  onDelete?: (meeting: Meeting) => void
  onEdit?: (meeting: Meeting) => void
  onShare?: (meeting: Meeting) => void
  className?: string
}

export function MeetingList({ 
  meetings, 
  onPlay,
  onDownload,
  onDelete,
  onEdit,
  onShare,
  className 
}: MeetingListProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}ó ${minutes}p`
    }
    return `${minutes} perc`
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const getStatusIcon = (status: Meeting['transcription_status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusText = (status: Meeting['transcription_status']) => {
    switch (status) {
      case 'completed':
        return 'Átírás kész'
      case 'processing':
        return 'Átírás folyamatban'
      case 'failed':
        return 'Átírás sikertelen'
      default:
        return 'Átírásra vár'
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {meetings.map((meeting) => (
        <Card key={meeting.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              {/* Meeting Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileAudio className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                      {meeting.title}
                    </h3>
                    
                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(meeting.duration_seconds)}
                      </span>
                      {meeting.speakers_count && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {meeting.speakers_count} résztvevő
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDistanceToNow(new Date(meeting.created_at), { 
                          addSuffix: true,
                          locale: hu 
                        })}
                      </span>
                      <span className="text-xs">
                        {formatFileSize(meeting.file_size)}
                      </span>
                    </div>

                    {/* Tags */}
                    {meeting.tags && meeting.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {meeting.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Transcription Status */}
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(meeting.transcription_status)}
                        <span className="text-sm">
                          {getStatusText(meeting.transcription_status)}
                        </span>
                      </div>
                      {meeting.transcription_status === 'processing' && meeting.transcription_progress && (
                        <Progress 
                          value={meeting.transcription_progress} 
                          className="mt-2 h-1.5"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {meeting.transcription_status === 'completed' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onPlay?.(meeting)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Lejátszás
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(meeting)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Szerkesztés
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onShare?.(meeting)}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Megosztás
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDownload?.(meeting)}>
                      <Download className="h-4 w-4 mr-2" />
                      Letöltés
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => onDelete?.(meeting)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Törlés
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {meetings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileAudio className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Még nincs feltöltött meeting
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}