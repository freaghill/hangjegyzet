'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Clock, Database, Zap } from 'lucide-react'
import { useUsage } from '@/hooks/use-usage'

interface UsageCardProps {
  organizationId: string
}

export function UsageCard({ organizationId }: UsageCardProps) {
  const { usage, isLoading, error, formatUsage } = useUsage()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Használat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    )
  }

  if (error || !usage || !formatUsage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Használat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{error || 'Nem sikerült betölteni a használati adatokat'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatted = formatUsage

  return (
    <Card>
      <CardHeader>
        <CardTitle>Havi használat</CardTitle>
        <CardDescription>
          Az aktuális hónap felhasználása
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transcription Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Átírási percek</span>
            </div>
            <Badge variant={formatted.transcription.percentage >= 90 ? 'destructive' : 'secondary'}>
              {formatted.transcription.used} / {formatted.transcription.limit}
            </Badge>
          </div>
          <Progress value={formatted.transcription.percentage} />
          <p className="text-xs text-gray-600">
            {formatted.transcription.remaining} perc maradt
          </p>
        </div>

        {/* API Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">API hívások</span>
            </div>
            <Badge variant={formatted.api.percentage >= 90 ? 'destructive' : 'secondary'}>
              {formatted.api.used} / {formatted.api.limit}
            </Badge>
          </div>
          <Progress value={formatted.api.percentage} />
          <p className="text-xs text-gray-600">
            {formatted.api.remaining} hívás maradt
          </p>
        </div>

        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Tárhely</span>
            </div>
            <Badge variant={formatted.storage.percentage >= 90 ? 'destructive' : 'secondary'}>
              {formatted.storage.usedGB} / {formatted.storage.limitGB} GB
            </Badge>
          </div>
          <Progress value={formatted.storage.percentage} />
          <p className="text-xs text-gray-600">
            {formatted.storage.remainingGB} GB maradt
          </p>
        </div>

        {!usage.isWithinLimits && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm font-medium">
                Elérte a havi limitet!
              </p>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Frissítse az előfizetését a folytatáshoz.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}