'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { 
  Mail, 
  Send, 
  Eye, 
  MousePointer,
  XCircle,
  AlertTriangle,
  Users,
  TrendingUp
} from 'lucide-react'

interface EmailStatsData {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
  unsubscribed: number
}

export function EmailStats() {
  const [stats, setStats] = useState<EmailStatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/emails/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading email stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const deliveryRate = stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0
  const openRate = stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0
  const clickRate = stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0
  const bounceRate = stats.sent > 0 ? (stats.bounced / stats.sent) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Elküldve</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Összes elküldött email
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kézbesítve</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={deliveryRate} className="h-2" />
              <span className="text-xs text-muted-foreground">{deliveryRate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Megnyitva</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.opened.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={openRate} className="h-2" />
              <span className="text-xs text-muted-foreground">{openRate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kattintva</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clicked.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={clickRate} className="h-2" />
              <span className="text-xs text-muted-foreground">{clickRate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visszapattant</CardTitle>
            <XCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.bounced.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {bounceRate.toFixed(2)}% visszapattanási arány
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spam jelentés</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.complained.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Spam jelentések száma
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leiratkozás</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unsubscribed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Leiratkozott felhasználók
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Siker arány</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {((stats.delivered - stats.bounced - stats.complained) / stats.sent * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Sikeres kézbesítés
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}