'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Calendar,
  Zap,
  BalanceScale,
  Target,
  ChevronRight
} from 'lucide-react'
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { format, addDays, differenceInDays, startOfMonth, endOfMonth } from 'date-fns'
import { hu } from 'date-fns/locale'
import type { ModeAllocation } from '@/lib/payments/subscription-plans'

interface UsageForecastProps {
  organizationId: string
  currentUsage: ModeAllocation
  limits: ModeAllocation
  historicalData?: DailyUsage[]
}

interface DailyUsage {
  date: string
  fast: number
  balanced: number
  precision: number
}

interface Forecast {
  mode: 'fast' | 'balanced' | 'precision'
  currentUsage: number
  limit: number
  dailyAverage: number
  projectedTotal: number
  daysUntilLimit: number | null
  recommendedAction?: string
  trend: 'increasing' | 'stable' | 'decreasing'
  confidence: number
}

export function UsageForecast({ 
  organizationId, 
  currentUsage, 
  limits,
  historicalData = []
}: UsageForecastProps) {
  const [forecasts, setForecasts] = useState<Record<string, Forecast>>({})
  const [selectedMode, setSelectedMode] = useState<'fast' | 'balanced' | 'precision'>('balanced')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    calculateForecasts()
  }, [currentUsage, limits, historicalData])

  const calculateForecasts = () => {
    const today = new Date()
    const daysInMonth = differenceInDays(endOfMonth(today), startOfMonth(today)) + 1
    const daysElapsed = today.getDate()
    const daysRemaining = daysInMonth - daysElapsed

    const modes = ['fast', 'balanced', 'precision'] as const
    const newForecasts: Record<string, Forecast> = {}

    modes.forEach(mode => {
      const usage = currentUsage[mode] || 0
      const limit = limits[mode] || 0

      // Calculate daily average from historical data
      const recentData = historicalData.slice(-7) // Last 7 days
      const dailyAverage = recentData.length > 0
        ? recentData.reduce((sum, day) => sum + (day[mode] || 0), 0) / recentData.length
        : usage / Math.max(daysElapsed, 1)

      // Detect trend
      const trend = detectTrend(recentData.map(d => d[mode] || 0))
      
      // Calculate confidence based on data availability
      const confidence = Math.min(recentData.length / 7, 1) * 100

      // Project total usage
      const projectedTotal = usage + (dailyAverage * daysRemaining)

      // Calculate days until limit
      let daysUntilLimit: number | null = null
      if (limit > 0 && dailyAverage > 0) {
        const remainingCapacity = limit - usage
        daysUntilLimit = Math.floor(remainingCapacity / dailyAverage)
      }

      // Generate recommendations
      let recommendedAction
      if (limit === 0) {
        recommendedAction = mode === 'precision' 
          ? 'Frissítsen Profi vagy magasabb csomagra a Precision mód használatához'
          : 'Ez a mód nem elérhető az Ön csomagjában'
      } else if (limit === -1) {
        recommendedAction = 'Korlátlan használat - nincs limit'
      } else if (daysUntilLimit !== null && daysUntilLimit < 5) {
        recommendedAction = `Fontolja meg a ${mode} mód takarékosabb használatát vagy a csomag frissítését`
      } else if (projectedTotal > limit * 1.2) {
        recommendedAction = 'A jelenlegi használat alapján túl fogja lépni a havi limitet'
      }

      newForecasts[mode] = {
        mode,
        currentUsage: usage,
        limit,
        dailyAverage: Math.round(dailyAverage * 10) / 10,
        projectedTotal: Math.round(projectedTotal),
        daysUntilLimit,
        recommendedAction,
        trend,
        confidence
      }
    })

    setForecasts(newForecasts)
    setLoading(false)
  }

  const detectTrend = (values: number[]): 'increasing' | 'stable' | 'decreasing' => {
    if (values.length < 3) return 'stable'
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    
    const change = (secondAvg - firstAvg) / firstAvg
    
    if (change > 0.1) return 'increasing'
    if (change < -0.1) return 'decreasing'
    return 'stable'
  }

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'fast': return <Zap className="h-5 w-5 text-green-600" />
      case 'balanced': return <BalanceScale className="h-5 w-5 text-blue-600" />
      case 'precision': return <Target className="h-5 w-5 text-orange-600" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-green-500" />
      default: return <ChevronRight className="h-4 w-4 text-gray-500" />
    }
  }

  // Prepare chart data
  const chartData = historicalData.map(day => ({
    date: format(new Date(day.date), 'MM/dd', { locale: hu }),
    [selectedMode]: day[selectedMode] || 0
  }))

  // Add forecast data
  const forecast = forecasts[selectedMode]
  if (forecast && forecast.dailyAverage > 0) {
    const today = new Date()
    for (let i = 1; i <= 7; i++) {
      chartData.push({
        date: format(addDays(today, i), 'MM/dd', { locale: hu }),
        [selectedMode]: forecast.dailyAverage,
        forecast: true
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Használat előrejelzés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Előrejelzés számítása...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Forecast Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['fast', 'balanced', 'precision'] as const).map(mode => {
          const forecast = forecasts[mode]
          if (!forecast) return null

          const usagePercentage = forecast.limit > 0 
            ? (forecast.currentUsage / forecast.limit) * 100 
            : 0

          return (
            <Card 
              key={mode}
              className={`cursor-pointer transition-all ${
                selectedMode === mode ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedMode(mode)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getModeIcon(mode)}
                    <CardTitle className="text-lg capitalize">{mode}</CardTitle>
                  </div>
                  {getTrendIcon(forecast.trend)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Jelenlegi használat</span>
                    <span className="font-medium">
                      {forecast.currentUsage} / {forecast.limit === -1 ? '∞' : forecast.limit} perc
                    </span>
                  </div>
                  {forecast.limit > 0 && (
                    <Progress value={usagePercentage} className="h-2" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-600">Napi átlag</p>
                    <p className="font-semibold">{forecast.dailyAverage} perc</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Várható összesen</p>
                    <p className="font-semibold">{forecast.projectedTotal} perc</p>
                  </div>
                </div>

                {forecast.daysUntilLimit !== null && forecast.daysUntilLimit < 10 && (
                  <Alert className="py-2">
                    <AlertTriangle className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      {forecast.daysUntilLimit} nap múlva eléri a limitet
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Detailed Forecast Chart */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Részletes előrejelzés - {selectedMode} mód</CardTitle>
              <CardDescription>
                Múltbeli használat és előrejelzés (szaggatott vonal)
              </CardDescription>
            </div>
            {forecasts[selectedMode]?.confidence && (
              <div className="text-sm text-gray-600">
                Megbízhatóság: {Math.round(forecasts[selectedMode].confidence)}%
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                
                {forecasts[selectedMode]?.limit > 0 && (
                  <ReferenceLine 
                    y={forecasts[selectedMode].limit / 30} 
                    stroke="#ef4444" 
                    strokeDasharray="5 5"
                    label="Napi limit"
                  />
                )}
                
                <Line
                  type="monotone"
                  dataKey={selectedMode}
                  stroke={
                    selectedMode === 'fast' ? '#10b981' :
                    selectedMode === 'balanced' ? '#3b82f6' : '#f59e0b'
                  }
                  strokeWidth={2}
                  strokeDasharray={(entry: any) => entry.forecast ? "5 5" : "0"}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {forecasts[selectedMode]?.recommendedAction && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {forecasts[selectedMode].recommendedAction}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Javaslatok</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {generateRecommendations(forecasts).map((rec, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5">{rec.icon}</div>
                <div>
                  <p className="font-medium">{rec.title}</p>
                  <p className="text-sm text-gray-600">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function generateRecommendations(forecasts: Record<string, Forecast>) {
  const recommendations = []

  // Check for modes running out soon
  Object.values(forecasts).forEach(forecast => {
    if (forecast.daysUntilLimit !== null && forecast.daysUntilLimit < 5 && forecast.limit > 0) {
      recommendations.push({
        icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
        title: `${forecast.mode} mód hamarosan elfogy`,
        description: `Csak ${forecast.daysUntilLimit} napra elegendő ${forecast.mode} mód maradt. Fontolja meg a takarékosabb használatot vagy a csomag frissítését.`
      })
    }
  })

  // Check for increasing trends
  Object.values(forecasts).forEach(forecast => {
    if (forecast.trend === 'increasing' && forecast.projectedTotal > forecast.limit * 0.9 && forecast.limit > 0) {
      recommendations.push({
        icon: <TrendingUp className="h-5 w-5 text-red-500" />,
        title: `Növekvő ${forecast.mode} használat`,
        description: `A ${forecast.mode} mód használata növekszik. A jelenlegi trend alapján túl fogja lépni a havi limitet.`
      })
    }
  })

  // Suggest mode optimization
  if (forecasts.precision?.currentUsage > 0 && forecasts.balanced?.currentUsage < forecasts.balanced?.limit * 0.5) {
    recommendations.push({
      icon: <BalanceScale className="h-5 w-5 text-blue-500" />,
      title: 'Optimalizálja a mód használatot',
      description: 'Fontolja meg a Balanced mód használatát a kevésbé kritikus meetingekhez, hogy spóroljon a Precision percekkel.'
    })
  }

  // If no issues, add positive feedback
  if (recommendations.length === 0) {
    recommendations.push({
      icon: <Calendar className="h-5 w-5 text-green-500" />,
      title: 'Minden rendben',
      description: 'A jelenlegi használat alapján nem fog túllépni egyetlen limitet sem ebben a hónapban.'
    })
  }

  return recommendations
}