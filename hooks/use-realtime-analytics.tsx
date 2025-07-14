import { useState, useEffect, useRef } from 'react'
import { RealtimeAnalyticsService } from '@/lib/analytics/realtime-service'
import { RealtimeMetrics } from '@/lib/analytics/types'

export function useRealtimeAnalytics() {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    activeUsers: 0,
    activeTranscriptions: 0,
    queuedJobs: 0,
    systemLoad: 0
  })
  const [isConnected, setIsConnected] = useState(false)
  const serviceRef = useRef<RealtimeAnalyticsService | null>(null)
  const subscriberIdRef = useRef<string>(`subscriber-${Math.random().toString(36).substr(2, 9)}`)

  useEffect(() => {
    // Initialize service
    if (!serviceRef.current) {
      serviceRef.current = new RealtimeAnalyticsService()
    }

    const service = serviceRef.current
    const subscriberId = subscriberIdRef.current

    // Subscribe to updates
    service.subscribe(subscriberId, (newMetrics) => {
      setMetrics(newMetrics)
      setIsConnected(true)
    })

    // Cleanup
    return () => {
      service.unsubscribe(subscriberId)
      setIsConnected(false)
    }
  }, [])

  const trackEvent = async (event: {
    category: string
    action: string
    label?: string
    value?: number
  }) => {
    if (serviceRef.current) {
      await serviceRef.current.trackEvent(event)
    }
  }

  const trackPerformance = async (metric: {
    name: string
    value: number
    unit: string
    tags?: Record<string, string>
  }) => {
    if (serviceRef.current) {
      await serviceRef.current.trackPerformance(metric)
    }
  }

  return {
    metrics,
    isConnected,
    trackEvent,
    trackPerformance
  }
}