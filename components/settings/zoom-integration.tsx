'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Video, Download, Trash2, RefreshCw, CheckCircle2, XCircle, Clock, Users } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface ZoomIntegration {
  id: string
  zoom_email: string
  auto_download_enabled: boolean
  delete_after_download: boolean
  is_active: boolean
  created_at: string
}

interface ZoomRecording {
  id: string
  zoom_meeting_id: string
  topic: string
  start_time: string
  duration: number
  total_size: number
  download_status: string
  participants: any[]
  meeting?: {
    id: string
    title: string
    transcription_status: string
  }
}

export function ZoomIntegration() {
  const [integration, setIntegration] = useState<ZoomIntegration | null>(null)
  const [recordings, setRecordings] = useState<ZoomRecording[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadIntegration()
  }, [])

  async function loadIntegration() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get integration
      const { data: integrationData } = await supabase
        .from('zoom_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      setIntegration(integrationData)

      // If integrated, load recordings
      if (integrationData) {
        await loadRecordings()
      }
    } catch (error) {
      console.error('Failed to load integration:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadRecordings() {
    try {
      const response = await fetch('/api/integrations/zoom/recordings')
      if (response.ok) {
        const data = await response.json()
        setRecordings(data.recordings || [])
      }
    } catch (error) {
      console.error('Failed to load recordings:', error)
    }
  }

  async function connectZoom() {
    window.location.href = '/api/integrations/zoom/auth'
  }

  async function disconnectZoom() {
    try {
      const response = await fetch('/api/integrations/zoom/recordings', {
        method: 'DELETE',
      })

      if (response.ok) {
        setIntegration(null)
        setRecordings([])
        toast.success('Zoom integration removed')
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      toast.error('Failed to disconnect Zoom')
    }
  }

  async function updateSettings(field: string, value: boolean) {
    if (!integration) return

    try {
      const { error } = await supabase
        .from('zoom_integrations')
        .update({ [field]: value })
        .eq('id', integration.id)

      if (error) throw error

      setIntegration({ ...integration, [field]: value })
      toast.success('Settings updated')
    } catch (error) {
      toast.error('Failed to update settings')
    }
  }

  async function syncRecordings() {
    setSyncing(true)
    try {
      const response = await fetch('/api/integrations/zoom/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Synced ${data.count} recordings`)
        await loadRecordings()
      } else {
        throw new Error('Sync failed')
      }
    } catch (error) {
      toast.error('Failed to sync recordings')
    } finally {
      setSyncing(false)
    }
  }

  async function importRecording(recordingUuid: string) {
    setDownloading(recordingUuid)
    try {
      const response = await fetch('/api/integrations/zoom/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'import',
          recordingUuid: recordingUuid
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Recording imported successfully')
        await loadRecordings()
      } else {
        throw new Error('Import failed')
      }
    } catch (error) {
      toast.error('Failed to import recording')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    )
  }

  if (!integration) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zoom</CardTitle>
          <CardDescription>
            Connect your Zoom account to automatically import cloud recordings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={connectZoom} className="gap-2">
            <Video className="w-4 h-4" />
            Connect Zoom
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Zoom</CardTitle>
              <CardDescription>
                Connected as {integration.zoom_email}
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-download">Auto-download recordings</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically download new recordings when they're ready
                </p>
              </div>
              <Switch
                id="auto-download"
                checked={integration.auto_download_enabled}
                onCheckedChange={(checked) => updateSettings('auto_download_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="delete-after">Delete from Zoom after download</Label>
                <p className="text-sm text-muted-foreground">
                  Free up Zoom storage by deleting recordings after import
                </p>
              </div>
              <Switch
                id="delete-after"
                checked={integration.delete_after_download}
                onCheckedChange={(checked) => updateSettings('delete_after_download', checked)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={syncRecordings}
              disabled={syncing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync Recordings
            </Button>
            <Button
              variant="outline"
              onClick={disconnectZoom}
              className="gap-2 text-destructive"
            >
              <XCircle className="w-4 h-4" />
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      {recordings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Recordings</CardTitle>
            <CardDescription>
              Your Zoom cloud recordings from the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{recording.topic}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(recording.start_time), 'MMM d, yyyy h:mm a')}
                      </span>
                      <span>{Math.round(recording.duration / 60)} min</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {recording.participants?.length || 0}
                      </span>
                      <span>{(recording.total_size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {recording.download_status === 'completed' && recording.meeting ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Imported
                      </Badge>
                    ) : recording.download_status === 'downloading' ? (
                      <Badge variant="outline" className="gap-1">
                        <Download className="w-3 h-3 animate-pulse" />
                        Downloading...
                      </Badge>
                    ) : recording.download_status === 'failed' ? (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="w-3 h-3" />
                        Failed
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => importRecording(recording.zoom_meeting_uuid)}
                        disabled={downloading === recording.zoom_meeting_uuid}
                        className="gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Import
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}