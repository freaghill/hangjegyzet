'use client'

import { useEffect, useState, useRef } from 'react'
import { AnnotationManager, AnnotationThread } from '@/lib/annotations/manager'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { Send, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'

interface AnnotationThreadProps {
  annotationId: string
  currentUserId: string
}

export function AnnotationThreadComponent({
  annotationId,
  currentUserId
}: AnnotationThreadProps) {
  const [threads, setThreads] = useState<AnnotationThread[]>([])
  const [newReply, setNewReply] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  const annotationManager = useRef<AnnotationManager>(new AnnotationManager())
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    loadThreads()
  }, [annotationId])
  
  useEffect(() => {
    // Scroll to bottom when new threads are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [threads])
  
  const loadThreads = async () => {
    setIsLoading(true)
    try {
      const fetchedThreads = await annotationManager.current.getThreads(annotationId)
      setThreads(fetchedThreads)
    } catch (error) {
      console.error('Error loading threads:', error)
      toast.error('Hiba történt a hozzászólások betöltése során')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleSendReply = async () => {
    if (!newReply.trim()) return
    
    setIsSending(true)
    try {
      const thread = await annotationManager.current.addThread(
        annotationId,
        currentUserId,
        newReply
      )
      
      setThreads(prev => [...prev, thread])
      setNewReply('')
      toast.success('Hozzászólás elküldve')
    } catch (error) {
      console.error('Error sending reply:', error)
      toast.error('Hiba történt a hozzászólás küldése során')
    } finally {
      setIsSending(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      <ScrollArea
        ref={scrollAreaRef}
        className="h-48 pr-3"
      >
        {threads.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Még nincs hozzászólás
          </p>
        ) : (
          <div className="space-y-3">
            {threads.map((thread) => (
              <div key={thread.id} className="flex gap-2">
                <Avatar className="h-6 w-6 mt-0.5 flex-shrink-0">
                  <AvatarImage src={thread.user?.avatar_url} />
                  <AvatarFallback>
                    {thread.user?.name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-sm font-medium">
                      {thread.user?.name || 'Ismeretlen'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(thread.created_at), 'p', { locale: hu })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 break-words">
                    {thread.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <div className="flex gap-2">
        <Input
          value={newReply}
          onChange={(e) => setNewReply(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendReply()
            }
          }}
          placeholder="Írj egy választ..."
          disabled={isSending}
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={handleSendReply}
          disabled={isSending || !newReply.trim()}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}