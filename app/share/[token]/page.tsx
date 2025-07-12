'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { 
  Lock, 
  Clock, 
  FileText, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye
} from 'lucide-react'

interface SharedMeeting {
  id: string
  title: string
  created_at: string
  duration_seconds: number
  transcript?: any
  summary?: string
  action_items?: any[]
  highlights?: any
  requiresPassword: boolean
}

interface ShareInfo {
  id: string
  expires_at?: string
  view_count: number
  max_views?: number
  settings: any
  requiresPassword: boolean
}

export default function PublicSharePage() {
  const params = useParams()
  const [isLoading, setIsLoading] = useState(true)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null)
  const [meeting, setMeeting] = useState<SharedMeeting | null>(null)
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadShare = useCallback(async () => {
    try {
      const response = await fetch(`/api/share/${params.token}`)
      
      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to load share')
        setIsLoading(false)
        return
      }
      
      const data = await response.json()
      setShareInfo(data.share)
      
      if (!data.share.requiresPassword) {
        setMeeting(data.meeting)
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error('Error loading share:', error)
      setError('Failed to load share')
    } finally {
      setIsLoading(false)
    }
  }, [params.token])

  useEffect(() => {
    loadShare()
  }, [loadShare])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUnlocking(true)
    
    try {
      const response = await fetch(`/api/share/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      
      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Invalid password')
        return
      }
      
      // Password correct, reload to get meeting data
      setIsAuthenticated(true)
      await loadShare()
    } catch (error) {
      console.error('Error verifying password:', error)
      toast.error('Failed to verify password')
    } finally {
      setIsUnlocking(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}ó ${minutes}p ${secs}mp`
    }
    return `${minutes}p ${secs}mp`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-red-600">Hiba történt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (shareInfo?.requiresPassword && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <CardTitle>Jelszóval védett megosztás</CardTitle>
            <CardDescription>
              Kérjük, adja meg a jelszót a tartalom megtekintéséhez
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Jelszó</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Adja meg a jelszót"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={isUnlocking}
              >
                {isUnlocking ? 'Ellenőrzés...' : 'Belépés'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!meeting) {
    return <div />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{meeting.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(meeting.created_at).toLocaleString('hu-HU')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDuration(meeting.duration_seconds)}
            </span>
            {shareInfo && (
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {shareInfo.view_count} megtekintés
                {shareInfo.max_views && ` / ${shareInfo.max_views}`}
              </span>
            )}
          </div>
          {shareInfo?.expires_at && (
            <Badge variant="outline" className="mt-2">
              Lejár: {new Date(shareInfo.expires_at).toLocaleString('hu-HU')}
            </Badge>
          )}
        </div>

        {/* Highlights */}
        {meeting.highlights && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 w-5" />
                Meeting Highlights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {meeting.highlights.summary && (
                <div>
                  <h3 className="font-medium mb-2">Összefoglaló</h3>
                  <p className="text-gray-700">{meeting.highlights.summary}</p>
                </div>
              )}
              
              {meeting.highlights.decisions?.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Döntések
                  </h3>
                  <ul className="space-y-1">
                    {meeting.highlights.decisions.map((decision: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">•</span>
                        <span className="text-sm">{decision}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {meeting.highlights.actionItems?.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    Teendők
                  </h3>
                  <ul className="space-y-1">
                    {meeting.highlights.actionItems.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <input 
                          type="checkbox" 
                          className="mt-1 rounded border-gray-300"
                          disabled
                        />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {meeting.summary && !meeting.highlights && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Összefoglaló</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{meeting.summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Action Items */}
        {meeting.action_items && meeting.action_items.length > 0 && !meeting.highlights && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Teendők</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {meeting.action_items.map((item: any, index: number) => (
                  <li key={index} className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      className="mt-1 rounded border-gray-300"
                      disabled
                    />
                    <div className="flex-1">
                      <p className="text-gray-700">{item.task}</p>
                      {(item.assignee || item.deadline) && (
                        <p className="text-sm text-gray-500 mt-1">
                          {item.assignee && <span className="font-medium">{item.assignee}</span>}
                          {item.assignee && item.deadline && ' • '}
                          {item.deadline && <span>Határidő: {item.deadline}</span>}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Transcript */}
        {meeting.transcript && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Átirat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                <p className="whitespace-pre-wrap text-gray-700">
                  {meeting.transcript.text || 'Átirat nem elérhető'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Ez a megosztás a HangJegyzet alkalmazással készült</p>
        </div>
      </div>
    </div>
  )
}