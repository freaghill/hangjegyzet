'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { 
  Clock,
  Play,
  Pause,
  RefreshCw,
  XCircle,
  AlertCircle,
  CheckCircle,
  Mail,
  Calendar
} from 'lucide-react'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'
import { toast } from 'sonner'

interface QueueItem {
  id: string
  template: string
  to_emails: string[]
  status: string
  priority: number
  attempts: number
  max_attempts: number
  scheduled_at?: string
  next_retry_at?: string
  error?: string
  created_at: string
}

interface QueueStats {
  pending: number
  processing: number
  sent: number
  failed: number
  scheduled: number
}

export function EmailQueue() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadQueue()
    const interval = setInterval(loadQueue, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const loadQueue = async () => {
    try {
      const [itemsResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/emails/queue'),
        fetch('/api/admin/emails/queue/stats')
      ])

      if (itemsResponse.ok) {
        const data = await itemsResponse.json()
        setQueueItems(data.items || [])
      }

      if (statsResponse.ok) {
        const data = await statsResponse.json()
        setQueueStats(data)
        setIsProcessing(data.processing > 0)
      }
    } catch (error) {
      console.error('Error loading queue:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = async (itemId: string) => {
    try {
      const response = await fetch(`/api/admin/emails/queue/${itemId}/retry`, {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Email újraküldése sikeres')
        loadQueue()
      }
    } catch (error) {
      toast.error('Hiba történt az újraküldés során')
    }
  }

  const handleCancel = async (itemId: string) => {
    try {
      const response = await fetch(`/api/admin/emails/queue/${itemId}/cancel`, {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Email sikeresen törölve')
        loadQueue()
      }
    } catch (error) {
      toast.error('Hiba történt a törlés során')
    }
  }

  const toggleProcessing = async () => {
    try {
      const response = await fetch('/api/admin/emails/queue/processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !isProcessing })
      })

      if (response.ok) {
        setIsProcessing(!isProcessing)
        toast.success(isProcessing ? 'Feldolgozás leállítva' : 'Feldolgozás elindítva')
      }
    } catch (error) {
      toast.error('Hiba történt a feldolgozás állapotának változtatása során')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  const getPriorityBadge = (priority: number) => {
    if (priority >= 8) {
      return <Badge variant="destructive">Magas</Badge>
    } else if (priority >= 5) {
      return <Badge variant="default">Normál</Badge>
    } else {
      return <Badge variant="secondary">Alacsony</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Queue Stats */}
      {queueStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Várakozó sor állapota</CardTitle>
                <CardDescription>Valós idejű statisztikák</CardDescription>
              </div>
              <Button
                variant={isProcessing ? 'destructive' : 'default'}
                onClick={toggleProcessing}
              >
                {isProcessing ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Feldolgozás leállítása
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Feldolgozás indítása
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{queueStats.pending}</p>
                <p className="text-sm text-gray-500">Várakozik</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{queueStats.processing}</p>
                <p className="text-sm text-gray-500">Feldolgozás alatt</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{queueStats.scheduled}</p>
                <p className="text-sm text-gray-500">Ütemezett</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{queueStats.sent}</p>
                <p className="text-sm text-gray-500">Elküldve</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{queueStats.failed}</p>
                <p className="text-sm text-gray-500">Sikertelen</p>
              </div>
            </div>
            
            {queueStats.pending + queueStats.processing > 0 && (
              <div className="mt-4">
                <Progress 
                  value={(queueStats.sent / (queueStats.pending + queueStats.processing + queueStats.sent)) * 100}
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Queue Items */}
      <Card>
        <CardHeader>
          <CardTitle>Várakozó emailek</CardTitle>
          <CardDescription>
            Küldésre váró és feldolgozás alatt lévő emailek
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queueItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nincs várakozó email</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queueItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="font-medium">{item.template}</span>
                        {getPriorityBadge(item.priority)}
                      </div>
                      <p className="text-sm text-gray-600">
                        Címzettek: {item.to_emails.join(', ')}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Próbálkozások: {item.attempts}/{item.max_attempts}</span>
                        {item.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Ütemezve: {format(new Date(item.scheduled_at), 'yyyy.MM.dd HH:mm')}
                          </span>
                        )}
                        {item.next_retry_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Újrapróbálkozás: {format(new Date(item.next_retry_at), 'HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {item.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(item.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      {(item.status === 'pending' || item.status === 'scheduled') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(item.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {item.error && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-sm text-red-700">{item.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}