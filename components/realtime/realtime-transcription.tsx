'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Mic, MicOff, Download, Loader2, Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { useRealtimeTranscription } from '@/hooks/use-realtime-transcription-v2'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'

interface RealtimeTranscriptionProps {
  meetingId: string
  onTranscriptionUpdate?: (transcript: string) => void
}

export default function RealtimeTranscription({
  meetingId,
  onTranscriptionUpdate
}: RealtimeTranscriptionProps) {
  const {
    isRecording,
    isConnected,
    transcript,
    startRecording,
    stopRecording,
    exportTranscript,
    clearTranscript
  } = useRealtimeTranscription({
    meetingId,
    onTranscription: (segment) => {
      // Notify parent component
      const fullTranscript = transcript
        .map(s => s.text)
        .join(' ')
      onTranscriptionUpdate?.(fullTranscript)
    }
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript, autoScroll])

  // Check if user scrolled up
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10
      setAutoScroll(isAtBottom)
    }
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Valós idejű átírás</CardTitle>
            <CardDescription>
              {isRecording ? 'Felvétel folyamatban...' : 'Kattints a mikrofonra a kezdéshez'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'success' : 'secondary'}>
              {isConnected ? (
                <><Wifi className="h-3 w-3 mr-1" /> Kapcsolódva</>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1" /> Nincs kapcsolat</>
              )}
            </Badge>
            {transcript.length > 0 && (
              <Badge variant="outline">
                {transcript.length} szegmens
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Transcript Display */}
        <ScrollArea 
          className="flex-1 w-full rounded-md border bg-muted/10 p-4"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {transcript.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {isRecording ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Várok a beszédre...</p>
                </>
              ) : (
                <p>Az átírt szöveg itt fog megjelenni</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {transcript.map((segment, index) => (
                  <motion.div
                    key={segment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-muted-foreground whitespace-nowrap pt-1">
                        {format(new Date(segment.timestamp), 'HH:mm:ss', { locale: hu })}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {segment.speaker}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              segment.confidence > 0.9 ? 'text-green-600' : 
                              segment.confidence > 0.7 ? 'text-yellow-600' : 
                              'text-red-600'
                            }`}
                          >
                            {Math.round(segment.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed">{segment.text}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          
          {!autoScroll && (
            <Button
              size="sm"
              variant="secondary"
              className="fixed bottom-24 right-8 shadow-lg"
              onClick={() => {
                setAutoScroll(true)
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                }
              }}
            >
              Ugrás a végére
            </Button>
          )}
        </ScrollArea>

        {/* Connection Error Alert */}
        {!isConnected && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nincs kapcsolat a valós idejű szolgáltatással. Ellenőrizd az internetkapcsolatot.
            </AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="lg"
              variant={isRecording ? 'destructive' : 'default'}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!isConnected}
              className="min-w-[140px]"
            >
              {isRecording ? (
                <>
                  <MicOff className="mr-2 h-4 w-4" />
                  Leállítás
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Felvétel
                </>
              )}
            </Button>
            
            {isRecording && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  Felvétel alatt
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {transcript.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearTranscript}
                >
                  Törlés
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportTranscript}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportálás
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Instructions */}
        {!isRecording && transcript.length === 0 && (
          <Alert>
            <AlertDescription>
              <strong>Tipp:</strong> A legjobb eredmény érdekében használj fejhallgatót 
              és beszélj tisztán, normál hangerővel. A rendszer automatikusan felismeri 
              a beszélőket és magyar nyelvre van optimalizálva.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}