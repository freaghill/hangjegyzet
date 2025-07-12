'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { FeatureFlag, getAllFeatures } from './feature-flags'

interface FeatureFlagContextValue {
  flags: Record<FeatureFlag, boolean>
  loading: boolean
  isEnabled: (flag: FeatureFlag) => boolean
  refresh: () => Promise<void>
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(undefined)

interface FeatureFlagProviderProps {
  children: React.ReactNode
  userId?: string
  organizationId?: string
  email?: string
  initialFlags?: Record<FeatureFlag, boolean>
}

export function FeatureFlagProvider({
  children,
  userId,
  organizationId,
  email,
  initialFlags,
}: FeatureFlagProviderProps) {
  const [flags, setFlags] = useState<Record<FeatureFlag, boolean>>(
    initialFlags || ({} as Record<FeatureFlag, boolean>)
  )
  const [loading, setLoading] = useState(!initialFlags)

  const refresh = async () => {
    setLoading(true)
    try {
      const features = await getAllFeatures({ userId, organizationId, email })
      setFlags(features)
    } catch (error) {
      console.error('Failed to fetch feature flags:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialFlags) {
      refresh()
    }
  }, [userId, organizationId, email])

  const isEnabled = (flag: FeatureFlag) => flags[flag] || false

  return (
    <FeatureFlagContext.Provider value={{ flags, loading, isEnabled, refresh }}>
      {children}
    </FeatureFlagContext.Provider>
  )
}

export function useFeatureFlag(flag: FeatureFlag): boolean {
  const context = useContext(FeatureFlagContext)
  if (!context) {
    throw new Error('useFeatureFlag must be used within a FeatureFlagProvider')
  }
  return context.isEnabled(flag)
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext)
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider')
  }
  return context
}

/**
 * Component that conditionally renders based on feature flag
 */
interface FeatureProps {
  flag: FeatureFlag
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function Feature({ flag, children, fallback = null }: FeatureProps) {
  const isEnabled = useFeatureFlag(flag)
  return <>{isEnabled ? children : fallback}</>
}

/**
 * HOC for feature-gated components
 */
export function withFeature<P extends object>(
  flag: FeatureFlag,
  fallback?: React.ComponentType<P>
) {
  return function WithFeatureComponent(Component: React.ComponentType<P>) {
    return function FeatureGatedComponent(props: P) {
      const isEnabled = useFeatureFlag(flag)
      
      if (!isEnabled) {
        return fallback ? <fallback {...props} /> : null
      }
      
      return <Component {...props} />
    }
  }
}

/**
 * Server component wrapper for feature flags
 */
export async function FeatureGate({
  flag,
  children,
  fallback = null,
  userId,
  organizationId,
  email,
}: {
  flag: FeatureFlag
  children: React.ReactNode
  fallback?: React.ReactNode
  userId?: string
  organizationId?: string
  email?: string
}) {
  const { isFeatureEnabled } = await import('./feature-flags')
  const enabled = await isFeatureEnabled(flag, { userId, organizationId, email })
  
  return <>{enabled ? children : fallback}</>
}