'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'

interface ProgressiveHydrationProps {
  children: ReactNode
  fallback?: ReactNode
  onHydrated?: () => void
  ssrOnly?: boolean
  whenIdle?: boolean
  whenVisible?: boolean
}

export function ProgressiveHydration({
  children,
  fallback,
  onHydrated,
  ssrOnly = false,
  whenIdle = false,
  whenVisible = false,
}: ProgressiveHydrationProps) {
  const [isHydrated, setIsHydrated] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ssrOnly) return

    let cleanup: (() => void) | undefined

    const hydrate = () => {
      setIsHydrated(true)
      onHydrated?.()
    }

    if (whenIdle && 'requestIdleCallback' in window) {
      const id = requestIdleCallback(hydrate)
      cleanup = () => cancelIdleCallback(id)
    } else if (whenVisible && elementRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            hydrate()
            observer.disconnect()
          }
        },
        { rootMargin: '50px' }
      )
      observer.observe(elementRef.current)
      cleanup = () => observer.disconnect()
    } else {
      // Default: hydrate immediately
      hydrate()
    }

    return cleanup
  }, [ssrOnly, whenIdle, whenVisible, onHydrated])

  return (
    <div ref={elementRef}>
      {isHydrated ? children : fallback || children}
    </div>
  )
}

// Wrapper for lazy hydration based on priority
export function LazyHydrate({
  children,
  priority = 'low',
}: {
  children: ReactNode
  priority?: 'high' | 'medium' | 'low'
}) {
  const hydrationProps = {
    high: {},
    medium: { whenIdle: true },
    low: { whenVisible: true },
  }

  return (
    <ProgressiveHydration {...hydrationProps[priority]}>
      {children}
    </ProgressiveHydration>
  )
}

// Hook for manual hydration control
export function useHydrated() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}

// Component for hydration on interaction
export function HydrateOnInteraction({
  children,
  fallback,
  interaction = 'click',
}: {
  children: ReactNode
  fallback: ReactNode
  interaction?: 'click' | 'hover' | 'focus'
}) {
  const [shouldHydrate, setShouldHydrate] = useState(false)

  const handleInteraction = () => {
    setShouldHydrate(true)
  }

  const interactionProps = {
    click: { onClick: handleInteraction },
    hover: { onMouseEnter: handleInteraction },
    focus: { onFocus: handleInteraction },
  }

  if (shouldHydrate) {
    return <>{children}</>
  }

  return (
    <div {...interactionProps[interaction]}>
      {fallback}
    </div>
  )
}