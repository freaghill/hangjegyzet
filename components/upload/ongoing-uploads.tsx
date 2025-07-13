'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadProgressCard } from './upload-progress-card'
import { ChunkedUploadManager } from '@/lib/upload/chunked-upload'
import { Upload } from 'lucide-react'

interface OngoingUploadsProps {
  organizationId: string
}

interface UploadSession {
  uploadId: string
  fileName: string
  fileSize: number
  totalChunks: number
  uploadedChunks: number
  percentage: number
  status: string
  expiresAt: string
  createdAt: string
}

export function OngoingUploads({ organizationId }: OngoingUploadsProps) {
  const [sessions, setSessions] = useState<UploadSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/meetings/upload/status')
        if (response.ok) {
          const data = await response.json()
          setSessions(data.sessions || [])
        }
      } catch (error) {
        console.error('Failed to fetch upload sessions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchSessions, 5000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return null
  }

  if (sessions.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Folyamatban lévő feltöltések</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.map(session => (
          <UploadProgressCard
            key={session.uploadId}
            fileName={session.fileName}
            fileSize={session.fileSize}
            fileType="audio/mpeg" // This should come from the session data
            progress={{
              uploadId: session.uploadId,
              fileName: session.fileName,
              fileSize: session.fileSize,
              uploadedBytes: (session.uploadedChunks * 5 * 1024 * 1024), // Assuming 5MB chunks
              uploadedChunks: session.uploadedChunks,
              totalChunks: session.totalChunks,
              percentage: session.percentage,
              speed: 0, // Would need to calculate from timestamps
              remainingTime: 0, // Would need to calculate
              status: session.status as any
            }}
          />
        ))}
      </CardContent>
    </Card>
  )
}