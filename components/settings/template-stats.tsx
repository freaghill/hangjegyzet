'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, TrendingUp, FileText, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TemplateStats {
  templateStats: Array<{
    template_id: string
    template_name: string
    usage_count: number
    avg_intelligence_score: number
  }>
  overallStats: {
    totalMeetings: number
    meetingsWithTemplate: number
    meetingsWithoutTemplate: number
    templateUsageRate: number
    avgScoreWithTemplate: number
    avgScoreWithoutTemplate: number
    scoreImprovement: number
  }
}

export function TemplateStats() {
  const [stats, setStats] = useState<TemplateStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/templates/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading template stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
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

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Összes meeting
            </CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overallStats.totalMeetings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overallStats.meetingsWithTemplate} sablonnal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sablon használat
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.overallStats.templateUsageRate.toFixed(1)}%
            </div>
            <Progress 
              value={stats.overallStats.templateUsageRate} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Átlag pontszám (sablonnal)
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.overallStats.avgScoreWithTemplate}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs {stats.overallStats.avgScoreWithoutTemplate}% sablon nélkül
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pontszám javulás
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              stats.overallStats.scoreImprovement > 0 ? "text-green-600" : "text-red-600"
            )}>
              {stats.overallStats.scoreImprovement > 0 ? '+' : ''}
              {stats.overallStats.scoreImprovement.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              sablonok használatával
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Template Usage Details */}
      {stats.templateStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sablon használati statisztikák</CardTitle>
            <CardDescription>
              Az egyes sablonok használata és teljesítménye
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.templateStats.map((template) => (
                <div key={template.template_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{template.template_name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {template.usage_count} használat
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Átlag: {template.avg_intelligence_score.toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={template.avg_intelligence_score} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}