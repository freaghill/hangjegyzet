'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Zap, Scale, Target, TrendingUp, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ModeUsage {
  mode: 'fast' | 'balanced' | 'precision'
  available: boolean
  used: number
  limit: number
  remaining: number
  unlimited: boolean
}

interface UsageData {
  subscription: {
    tier: string
    name: string
    currency: 'HUF' | 'EUR'
  }
  modeStatus: ModeUsage[]
  totalUsed: number
  resetDate: string
}

const MODE_INFO = {
  fast: {
    name: 'Fast',
    icon: Zap,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    progressColor: 'bg-green-600',
    description: '90-93% pontosság',
  },
  balanced: {
    name: 'Balanced',
    icon: Scale,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    progressColor: 'bg-blue-600',
    description: '94-96% pontosság',
  },
  precision: {
    name: 'Precision',
    icon: Target,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    progressColor: 'bg-orange-600',
    description: '97%+ pontosság',
  },
}

export function ModeUsageDashboard() {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsageData()
  }, [])

  const fetchUsageData = async () => {
    try {
      const response = await fetch('/api/usage/mode-status')
      if (!response.ok) {
        throw new Error('Failed to fetch usage data')
      }
      const data = await response.json()
      setUsageData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage data')
    } finally {
      setLoading(false)
    }
  }

  const getDaysUntilReset = () => {
    if (!usageData) return 0
    const resetDate = new Date(usageData.resetDate)
    const today = new Date()
    const diffTime = resetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0 // Unlimited
    if (limit === 0) return 100 // No access
    return Math.min(100, (used / limit) * 100)
  }

  const getUsageStatus = (percentage: number) => {
    if (percentage >= 90) return 'critical'
    if (percentage >= 75) return 'warning'
    return 'normal'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !usageData) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>{error || 'Failed to load usage data'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Használati statisztika</h2>
          <p className="text-gray-600">
            Csomag: <span className="font-semibold">{usageData.subscription.name}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Megújul</p>
          <p className="text-lg font-semibold">{getDaysUntilReset()} nap múlva</p>
        </div>
      </div>

      {/* Mode Usage Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {usageData.modeStatus.map((modeUsage) => {
          const info = MODE_INFO[modeUsage.mode]
          const Icon = info.icon
          const percentage = getUsagePercentage(modeUsage.used, modeUsage.limit)
          const status = getUsageStatus(percentage)

          return (
            <Card key={modeUsage.mode} className={cn(
              'relative overflow-hidden',
              !modeUsage.available && 'opacity-60'
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={cn('p-2 rounded-lg', info.bgColor)}>
                    <Icon className={cn('w-5 h-5', info.color)} />
                  </div>
                  {modeUsage.unlimited && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      Korlátlan
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg mt-2">{info.name} mód</CardTitle>
                <CardDescription>{info.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                {!modeUsage.unlimited ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Használt</span>
                        <span className="font-semibold">
                          {modeUsage.used} / {modeUsage.limit} perc
                        </span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className="h-2"
                        indicatorClassName={cn(
                          info.progressColor,
                          status === 'critical' && 'bg-red-600',
                          status === 'warning' && 'bg-yellow-600'
                        )}
                      />
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{Math.round(percentage)}% használva</span>
                        <span>{modeUsage.remaining} perc maradt</span>
                      </div>
                    </div>

                    {!modeUsage.available && (
                      <div className="mt-3 p-2 bg-red-50 rounded text-xs text-red-700">
                        Elérte a havi limitet
                      </div>
                    )}

                    {status === 'warning' && modeUsage.available && (
                      <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-700">
                        Közelít a limithez
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-semibold">{modeUsage.used} perc</span> használva
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={cn('h-full transition-all', info.progressColor)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                )}

                {modeUsage.limit === 0 && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
                    Nem elérhető ebben a csomagban
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Total Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Összesített használat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{usageData.totalUsed} perc</p>
              <p className="text-sm text-gray-600">összesen ebben a hónapban</p>
            </div>
            <TrendingUp className="w-8 h-8 text-gray-400" />
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      {(usageData.subscription.tier === 'indulo' || usageData.subscription.tier === 'profi') && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Több percre van szüksége?</h3>
                <p className="text-gray-700 mt-1">
                  Frissítsen magasabb csomagra több percért és Precision módért
                </p>
              </div>
              <Button asChild>
                <Link href="/settings/billing">
                  Csomag frissítése
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}