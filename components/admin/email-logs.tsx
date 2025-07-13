'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Search,
  Filter,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  MousePointer,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'

interface EmailLog {
  id: string
  message_id: string
  template: string
  to_email: string
  subject: string
  status: string
  sent_at: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  error?: string
}

export function EmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/admin/emails/logs')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error loading email logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Mail className="h-4 w-4" />
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'bounced':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'queued':
        return <Clock className="h-4 w-4 text-gray-500" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      sent: 'default',
      delivered: 'default',
      failed: 'destructive',
      bounced: 'secondary',
      queued: 'outline'
    }

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status === 'sent' ? 'Elküldve' :
         status === 'delivered' ? 'Kézbesítve' :
         status === 'failed' ? 'Sikertelen' :
         status === 'bounced' ? 'Visszapattant' :
         status === 'queued' ? 'Várakozik' : status}
      </Badge>
    )
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' || 
      log.to_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = selectedStatus === null || log.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email napló</CardTitle>
          <CardDescription>Elküldött emailek részletes naplója</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email napló</CardTitle>
        <CardDescription>Elküldött emailek részletes naplója</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Keresés email cím vagy tárgy alapján..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            {['sent', 'delivered', 'failed', 'bounced'].map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
              >
                {status === 'sent' ? 'Elküldve' :
                 status === 'delivered' ? 'Kézbesítve' :
                 status === 'failed' ? 'Sikertelen' :
                 'Visszapattant'}
              </Button>
            ))}
          </div>
          
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Logs */}
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nincs találat a szűrési feltételeknek megfelelően
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className="font-medium">{log.to_email}</span>
                      {getStatusBadge(log.status)}
                    </div>
                    <p className="text-sm text-gray-600">{log.subject}</p>
                    <p className="text-xs text-gray-500">
                      Sablon: {log.template} | ID: {log.message_id}
                    </p>
                  </div>
                  
                  <div className="text-right text-sm text-gray-500">
                    <p>
                      {format(new Date(log.sent_at), 'yyyy.MM.dd HH:mm', { locale: hu })}
                    </p>
                  </div>
                </div>
                
                {/* Events */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {log.delivered_at && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Kézbesítve: {format(new Date(log.delivered_at), 'HH:mm')}</span>
                    </div>
                  )}
                  {log.opened_at && (
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-blue-500" />
                      <span>Megnyitva: {format(new Date(log.opened_at), 'HH:mm')}</span>
                    </div>
                  )}
                  {log.clicked_at && (
                    <div className="flex items-center gap-1">
                      <MousePointer className="h-3 w-3 text-purple-500" />
                      <span>Kattintva: {format(new Date(log.clicked_at), 'HH:mm')}</span>
                    </div>
                  )}
                </div>
                
                {log.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-2">
                    <p className="text-sm text-red-700">{log.error}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}