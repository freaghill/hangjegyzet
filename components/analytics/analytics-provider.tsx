'use client'

import { useEffect } from 'react'
import { analytics } from '@/lib/analytics'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize analytics when the app loads
    analytics.init()
  }, [])

  return <>{children}</>
}