'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AnnotationManager, Annotation, AnnotationThread, MeetingPresence } from '@/lib/annotations/manager'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { MessageSquare, Plus, Target, Users, Clock, Send, AtSign, X } from 'lucide-react'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { AnnotationThreadComponent } from './annotation-thread'

interface CollaborativeAnnotationsProps {
  meetingId: string
  transcript: {
    text: string
    segments?: Array<{
      start: number
      end: number
      text: string
    }>
  }
  currentUserId: string
}

interface AnnotationWithPosition extends Annotation {
  position: number // Position in pixels
}

export function CollaborativeAnnotations({
  meetingId,
  transcript,
  currentUserId
}: CollaborativeAnnotationsProps) {
  const [annotations, setAnnotations] = useState<AnnotationWithPosition[]>([])
  const [presence, setPresence] = useState<MeetingPresence[]>([])
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [newAnnotationTimestamp, setNewAnnotationTimestamp] = useState<number | null>(null)
  const [newAnnotationContent, setNewAnnotationContent] = useState('')
  const [isActionItem, setIsActionItem] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [organizationUsers, setOrganizationUsers] = useState<Array<{ id: string; name: string; avatar_url?: string }>>([])
  const [cursorPosition, setCursorPosition] = useState(0)
  
  const annotationManager = useRef<AnnotationManager>(new AnnotationManager())
  const transcriptRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  
  // Calculate position for annotations based on timestamp
  const calculateAnnotationPosition = useCallback((timestampSeconds: number): number => {
    if (!transcript.segments || transcript.segments.length === 0) {
      // Fallback: distribute evenly across transcript
      const totalDuration = transcript.segments?.[transcript.segments.length - 1]?.end || 300 // Default 5 min
      return (timestampSeconds / totalDuration) * (transcriptRef.current?.scrollHeight || 1000)
    }
    
    // Find the segment containing this timestamp
    const segmentIndex = transcript.segments.findIndex(
      seg => timestampSeconds >= seg.start && timestampSeconds <= seg.end
    )
    
    if (segmentIndex === -1) return 0
    
    // Calculate position within the transcript
    const segment = transcript.segments[segmentIndex]
    const segmentProgress = (timestampSeconds - segment.start) / (segment.end - segment.start)
    
    // Rough estimation: each segment takes proportional space
    const heightPerSegment = (transcriptRef.current?.scrollHeight || 1000) / transcript.segments.length
    return (segmentIndex + segmentProgress) * heightPerSegment
  }, [transcript.segments])
  
  const loadAnnotations = useCallback(async () => {
    try {
      const fetchedAnnotations = await annotationManager.current.getAnnotations(meetingId)
      setAnnotations(fetchedAnnotations.map(ann => ({
        ...ann,
        position: calculateAnnotationPosition(ann.timestamp_seconds)
      })))
    } catch (error) {
      console.error('Error loading annotations:', error)
      toast.error('Hiba történt az annotációk betöltése során')
    }
  }, [meetingId, calculateAnnotationPosition])
  
  const loadOrganizationUsers = useCallback(async () => {
    try {
      const users = await annotationManager.current.getOrganizationUsers(currentUserId)
      setOrganizationUsers(users)
    } catch (error) {
      console.error('Error loading organization users:', error)
    }
  }, [currentUserId])

  // Load initial data
  useEffect(() => {
    loadAnnotations()
    loadOrganizationUsers()
    
    // Subscribe to real-time updates
    const unsubscribe = annotationManager.current.subscribeToMeeting(meetingId, {
      onAnnotationAdded: (annotation) => {
        setAnnotations(prev => [...prev, {
          ...annotation,
          position: calculateAnnotationPosition(annotation.timestamp_seconds)
        }])
      },
      onAnnotationUpdated: (annotation) => {
        setAnnotations(prev => prev.map(a => 
          a.id === annotation.id 
            ? { ...annotation, position: calculateAnnotationPosition(annotation.timestamp_seconds) }
            : a
        ))
      },
      onAnnotationDeleted: (id) => {
        setAnnotations(prev => prev.filter(a => a.id !== id))
      },
      onPresenceUpdate: (presenceList) => {
        setPresence(presenceList)
      }
    })
    
    // Track user presence
    const presenceInterval = setInterval(() => {
      annotationManager.current.trackPresence(meetingId, currentUserId)
    }, 30000) // Update every 30 seconds
    
    return () => {
      unsubscribe()
      clearInterval(presenceInterval)
    }
  }, [meetingId, currentUserId, calculateAnnotationPosition, loadAnnotations, loadOrganizationUsers])
  
  const handleTranscriptClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = transcriptRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const relativeY = event.clientY - rect.top + (transcriptRef.current?.scrollTop || 0)
    const totalHeight = transcriptRef.current?.scrollHeight || 1
    
    // Estimate timestamp based on position
    const totalDuration = transcript.segments?.[transcript.segments.length - 1]?.end || 300
    const estimatedTimestamp = (relativeY / totalHeight) * totalDuration
    
    setNewAnnotationTimestamp(estimatedTimestamp)
    setNewAnnotationContent('')
    setIsActionItem(false)
    
    // Focus input after a short delay
    setTimeout(() => inputRef.current?.focus(), 100)
  }
  
  const handleCreateAnnotation = async () => {
    if (!newAnnotationContent.trim() || newAnnotationTimestamp === null) return
    
    try {
      await annotationManager.current.createAnnotation(
        meetingId,
        currentUserId,
        newAnnotationTimestamp,
        newAnnotationContent,
        isActionItem
      )
      
      setNewAnnotationTimestamp(null)
      setNewAnnotationContent('')
      setIsActionItem(false)
      toast.success('Annotáció létrehozva')
    } catch (error) {
      console.error('Error creating annotation:', error)
      toast.error('Hiba történt az annotáció létrehozása során')
    }
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewAnnotationContent(value)
    setCursorPosition(e.target.selectionStart || 0)
    
    // Check for @ mentions
    const lastAtIndex = value.lastIndexOf('@')
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentions(true)
      setMentionSearch('')
    } else if (lastAtIndex !== -1 && value[lastAtIndex] === '@') {
      const searchTerm = value.substring(lastAtIndex + 1, cursorPosition)
      if (!searchTerm.includes(' ')) {
        setShowMentions(true)
        setMentionSearch(searchTerm)
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }
  
  const handleMentionSelect = (user: { id: string; name: string }) => {
    const lastAtIndex = newAnnotationContent.lastIndexOf('@')
    const beforeMention = newAnnotationContent.substring(0, lastAtIndex)
    const afterMention = newAnnotationContent.substring(cursorPosition)
    
    const newContent = `${beforeMention}@${user.name} ${afterMention}`
    setNewAnnotationContent(newContent)
    setShowMentions(false)
    
    // Focus back to input
    inputRef.current?.focus()
  }
  
  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
  
  const filteredUsers = organizationUsers.filter(user =>
    user.name.toLowerCase().includes(mentionSearch.toLowerCase())
  )
  
  return (
    <div className="relative flex gap-8">
      {/* Transcript with annotation markers */}
      <div className="flex-1 relative">
        <div
          ref={transcriptRef}
          className="bg-gray-50 rounded-lg p-6 cursor-text relative"
          onClick={handleTranscriptClick}
          style={{ minHeight: '600px' }}
        >
          {/* Presence indicators */}
          <div className="absolute top-2 right-2 flex -space-x-2">
            {presence.slice(0, 5).map((p) => (
              <Avatar key={p.user_id} className="h-8 w-8 border-2 border-white">
                <AvatarImage src={p.user?.avatar_url} />
                <AvatarFallback>
                  {p.user?.name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            ))}
            {presence.length > 5 && (
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium">
                +{presence.length - 5}
              </div>
            )}
          </div>
          
          {/* Transcript text */}
          <p className="whitespace-pre-wrap text-gray-700">{transcript.text}</p>
          
          {/* Annotation markers */}
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              className={cn(
                "absolute left-0 w-full px-6 transition-all duration-200",
                selectedAnnotation === annotation.id && "z-10"
              )}
              style={{ top: `${annotation.position}px` }}
            >
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "absolute -left-12 top-0",
                    annotation.is_action_item && "text-blue-600"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedAnnotation(
                      selectedAnnotation === annotation.id ? null : annotation.id
                    )
                  }}
                >
                  {annotation.is_action_item ? (
                    <Target className="h-4 w-4" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  {annotation.thread_count > 0 && (
                    <span className="ml-1 text-xs">{annotation.thread_count}</span>
                  )}
                </Button>
                
                {/* Annotation highlight */}
                <div
                  className={cn(
                    "absolute inset-x-0 h-6 rounded",
                    selectedAnnotation === annotation.id
                      ? "bg-blue-200/50"
                      : "bg-yellow-200/30 hover:bg-yellow-200/50"
                  )}
                />
              </div>
            </div>
          ))}
          
          {/* New annotation input */}
          {newAnnotationTimestamp !== null && (
            <div
              className="absolute left-0 w-full px-6"
              style={{ top: `${calculateAnnotationPosition(newAnnotationTimestamp)}px` }}
            >
              <Card className="shadow-lg">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {formatTimestamp(newAnnotationTimestamp)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsActionItem(!isActionItem)}
                      className={cn(
                        "ml-auto",
                        isActionItem && "text-blue-600"
                      )}
                    >
                      <Target className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="relative">
                    <Input
                      ref={inputRef}
                      value={newAnnotationContent}
                      onChange={handleInputChange}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleCreateAnnotation()
                        }
                      }}
                      placeholder="Írj egy megjegyzést..."
                      className="pr-10"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-1 top-1"
                      onClick={handleCreateAnnotation}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Mention suggestions */}
                  {showMentions && (
                    <Card className="absolute z-20 mt-1 w-64 shadow-lg">
                      <CardContent className="p-2">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              className="w-full text-left p-2 hover:bg-gray-100 rounded flex items-center gap-2"
                              onClick={() => handleMentionSelect(user)}
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>
                                  {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{user.name}</span>
                            </button>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 p-2">
                            Nincs találat
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      {/* Selected annotation details */}
      {selectedAnnotation && (
        <div className="w-96">
          <Card className="sticky top-4">
            <CardContent className="p-4">
              {(() => {
                const annotation = annotations.find(a => a.id === selectedAnnotation)
                if (!annotation) return null
                
                return (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={annotation.user?.avatar_url} />
                          <AvatarFallback>
                            {annotation.user?.name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {annotation.user?.name || 'Ismeretlen'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(annotation.created_at), 'PPp', { locale: hu })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAnnotation(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {formatTimestamp(annotation.timestamp_seconds)}
                        </span>
                        {annotation.is_action_item && (
                          <Badge variant="default" className="ml-auto">
                            Akció pont
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-700">{annotation.content}</p>
                    </div>
                    
                    <div className="border-t pt-3">
                      <h4 className="text-sm font-medium mb-2">
                        Hozzászólások ({annotation.thread_count || 0})
                      </h4>
                      <AnnotationThreadComponent
                        annotationId={annotation.id}
                        currentUserId={currentUserId}
                      />
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}