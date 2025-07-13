'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Web Vitals types
interface Metric {
  name: string
  value: number
  delta: number
  id: string
  entries: PerformanceEntry[]
}

// Report Web Vitals to analytics
function sendToAnalytics(metric: Metric) {
  // Send to your analytics endpoint
  const body = {
    metric: metric.name,
    value: Math.round(metric.value),
    delta: Math.round(metric.delta),
    id: metric.id,
    pathname: window.location.pathname,
    timestamp: Date.now(),
  }

  // Use sendBeacon for reliability
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', JSON.stringify(body))
  } else {
    fetch('/api/analytics/vitals', {
      method: 'POST',
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // Silently fail
    })
  }
}

export function PerformanceMonitor() {
  const pathname = usePathname()

  useEffect(() => {
    // Only run in production
    if (process.env.NODE_ENV !== 'production') return

    // Import web-vitals dynamically
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      onCLS(sendToAnalytics)
      onFID(sendToAnalytics)
      onFCP(sendToAnalytics)
      onLCP(sendToAnalytics)
      onTTFB(sendToAnalytics)
    })

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // Report long tasks (> 50ms)
            if (entry.duration > 50) {
              sendToAnalytics({
                name: 'long-task',
                value: entry.duration,
                delta: entry.duration,
                id: `lt-${Date.now()}`,
                entries: [entry],
              })
            }
          }
        })
        observer.observe({ entryTypes: ['longtask'] })

        return () => observer.disconnect()
      } catch (e) {
        // Browser doesn't support long task monitoring
      }
    }
  }, [pathname])

  // Monitor route changes
  useEffect(() => {
    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
      const routeChangeDuration = endTime - startTime

      // Report route change duration
      sendToAnalytics({
        name: 'route-change',
        value: routeChangeDuration,
        delta: routeChangeDuration,
        id: `rc-${Date.now()}`,
        entries: [],
      })
    }
  }, [pathname])

  // Monitor memory usage (if available)
  useEffect(() => {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory
        const usedMemoryMB = memory.usedJSHeapSize / 1048576
        const totalMemoryMB = memory.totalJSHeapSize / 1048576

        // Alert if memory usage is high
        if (usedMemoryMB / totalMemoryMB > 0.9) {
          console.warn('High memory usage detected:', {
            used: usedMemoryMB.toFixed(2) + 'MB',
            total: totalMemoryMB.toFixed(2) + 'MB',
            percentage: ((usedMemoryMB / totalMemoryMB) * 100).toFixed(2) + '%',
          })
        }
      }

      const interval = setInterval(checkMemory, 30000) // Check every 30 seconds
      return () => clearInterval(interval)
    }
  }, [])

  return null
}

// Hook to measure component render performance
export function useRenderPerformance(componentName: string) {
  useEffect(() => {
    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Log slow renders (> 16ms)
      if (renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`)
      }
    }
  })
}

// Performance debugging utilities
export const performanceUtils = {
  // Mark performance timeline
  mark: (name: string) => {
    if ('performance' in window) {
      performance.mark(name)
    }
  },

  // Measure between marks
  measure: (name: string, startMark: string, endMark: string) => {
    if ('performance' in window) {
      try {
        performance.measure(name, startMark, endMark)
        const measures = performance.getEntriesByName(name, 'measure')
        const duration = measures[measures.length - 1]?.duration
        console.log(`${name}: ${duration?.toFixed(2)}ms`)
      } catch (e) {
        // Marks don't exist
      }
    }
  },

  // Clear marks and measures
  clear: () => {
    if ('performance' in window) {
      performance.clearMarks()
      performance.clearMeasures()
    }
  },
}