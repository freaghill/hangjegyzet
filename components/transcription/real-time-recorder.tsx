'use client'

import { useState, useRef, useEffect } from 'react'
import RecordRTC from 'recordrtc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mic, Pause, Play, Square, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { io, Socket } from 'socket.io-client'

interface TranscriptionSegment {
  text: string
  timestamp: number
  isFinal: boolean
}

export function RealTimeRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([])
  const [currentSegment, setCurrentSegment] = useState('')
  
  const recorderRef = useRef<RecordRTC | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (recorderRef.current) {
        recorderRef.current.stopRecording()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      setIsConnecting(true)
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      })
      streamRef.current = stream

      // Initialize WebSocket connection
      const socket = io('/api/transcription/stream', {
        transports: ['websocket'],
        query: {
          language: 'hu'
        }
      })
      socketRef.current = socket

      // Setup WebSocket listeners
      socket.on('connect', () => {
        console.log('Connected to transcription server')
        setIsConnecting(false)
        setIsRecording(true)
      })

      socket.on('transcription', (data: { text: string; isFinal: boolean }) => {
        if (data.isFinal) {
          setTranscription(prev => [...prev, {
            text: data.text,
            timestamp: Date.now(),
            isFinal: true
          }])
          setCurrentSegment('')
        } else {
          setCurrentSegment(data.text)
        }
      })

      socket.on('error', (error: string) => {
        console.error('Transcription error:', error)
        toast.error('Átírási hiba történt')
      })

      socket.on('disconnect', () => {
        console.log('Disconnected from transcription server')
      })

      // Initialize RecordRTC
      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 1000, // Send data every second
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
        bufferSize: 4096,
        audioBitsPerSecond: 128000,
        ondataavailable: (blob: Blob) => {
          if (socket.connected && !isPaused) {
            // Send audio chunk to server
            socket.emit('audio-chunk', blob)
          }
        }
      })

      recorder.startRecording()
      recorderRef.current = recorder

    } catch (error) {
      console.error('Failed to start recording:', error)
      toast.error('Nem sikerült elindítani a felvételt')
      setIsConnecting(false)
    }
  }

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stopRecording(() => {
        // Get the final recording
        const blob = recorderRef.current!.getBlob()
        
        // Send final audio to server for processing
        if (socketRef.current?.connected) {
          socketRef.current.emit('audio-end', blob)
        }
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
        if (socketRef.current) {
          socketRef.current.disconnect()
        }
        
        setIsRecording(false)
        setIsPaused(false)
      })
    }
  }

  const togglePause = () => {
    if (recorderRef.current) {
      if (isPaused) {
        recorderRef.current.resumeRecording()
      } else {
        recorderRef.current.pauseRecording()
      }
      setIsPaused(!isPaused)
    }
  }

  const downloadTranscript = () => {
    const text = transcription.map(seg => seg.text).join(' ')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atirat-${new Date().toISOString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyTranscript = () => {
    const text = transcription.map(seg => seg.text).join(' ')
    navigator.clipboard.writeText(text)
    toast.success('Átirat másolva')
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Valós idejű átírás</span>
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              <Mic className="h-3 w-3 mr-1" />
              Felvétel
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex justify-center gap-4">
          {!isRecording ? (
            <Button
              size="lg"
              onClick={startRecording}
              disabled={isConnecting}
              className="rounded-full h-16 w-16"
            >
              {isConnecting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                variant="outline"
                onClick={togglePause}
                className="rounded-full h-16 w-16"
              >
                {isPaused ? (
                  <Play className="h-6 w-6" />
                ) : (
                  <Pause className="h-6 w-6" />
                )}
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={stopRecording}
                className="rounded-full h-16 w-16"
              >
                <Square className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {/* Transcription Display */}
        {(transcription.length > 0 || currentSegment) && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Átirat</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyTranscript}
                  disabled={transcription.length === 0}
                >
                  Másolás
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadTranscript}
                  disabled={transcription.length === 0}
                >
                  Letöltés
                </Button>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {transcription.map((segment, index) => (
                <span key={index} className="text-gray-800">
                  {segment.text}{' '}
                </span>
              ))}
              {currentSegment && (
                <span className="text-gray-500 italic">{currentSegment}</span>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isRecording && transcription.length === 0 && (
          <div className="text-center text-gray-600 text-sm">
            <p>Kattintson a mikrofon gombra a felvétel indításához.</p>
            <p className="mt-1">Az átírás valós időben jelenik meg.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}