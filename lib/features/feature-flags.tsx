import { env } from '@/lib/config/environment'

/**
 * Feature Flags Management
 * 
 * Supports multiple providers:
 * 1. LaunchDarkly (production)
 * 2. Vercel Edge Config
 * 3. Environment variables (fallback)
 */

export type FeatureFlag = 
  | 'mode-based-pricing-enabled'
  | 'migration-wizard-enabled'
  | 'new-upload-flow-enabled'
  | 'usage-monitoring-enabled'
  | 'rate-limiting-enabled'
  | 'anomaly-detection-enabled'
  | 'webhook-notifications-enabled'
  | 'precision-mode-enabled'

interface FeatureFlagConfig {
  key: FeatureFlag
  defaultValue: boolean
  description: string
  rolloutPercentage?: number
  enabledForUsers?: string[]
  enabledForOrganizations?: string[]
}

// Feature flag configurations
const FLAGS: Record<FeatureFlag, FeatureFlagConfig> = {
  'mode-based-pricing-enabled': {
    key: 'mode-based-pricing-enabled',
    defaultValue: true,
    description: 'Enable mode-based pricing system',
    rolloutPercentage: 100,
  },
  'migration-wizard-enabled': {
    key: 'migration-wizard-enabled',
    defaultValue: false,
    description: 'Show migration wizard to existing customers',
    rolloutPercentage: 0,
  },
  'new-upload-flow-enabled': {
    key: 'new-upload-flow-enabled',
    defaultValue: true,
    description: 'Enable new upload flow with mode selection',
    rolloutPercentage: 100,
  },
  'usage-monitoring-enabled': {
    key: 'usage-monitoring-enabled',
    defaultValue: true,
    description: 'Enable real-time usage monitoring',
    rolloutPercentage: 100,
  },
  'rate-limiting-enabled': {
    key: 'rate-limiting-enabled',
    defaultValue: true,
    description: 'Enable rate limiting for API endpoints',
    rolloutPercentage: 100,
  },
  'anomaly-detection-enabled': {
    key: 'anomaly-detection-enabled',
    defaultValue: false,
    description: 'Enable anomaly detection system',
    rolloutPercentage: 0,
  },
  'webhook-notifications-enabled': {
    key: 'webhook-notifications-enabled',
    defaultValue: false,
    description: 'Enable webhook notifications for limits',
    rolloutPercentage: 0,
  },
  'precision-mode-enabled': {
    key: 'precision-mode-enabled',
    defaultValue: true,
    description: 'Enable precision transcription mode',
    rolloutPercentage: 100,
  },
}

// LaunchDarkly client (lazy loaded)
let ldClient: any = null

async function getLaunchDarklyClient() {
  if (!env.hasFeatureFlags()) {
    return null
  }

  if (!ldClient) {
    const { init } = await import('launchdarkly-node-server-sdk')
    ldClient = init(env.get('LAUNCHDARKLY_SDK_KEY'))
    await ldClient.waitForInitialization()
  }

  return ldClient
}

// Vercel Edge Config client
let edgeConfig: any = null

async function getEdgeConfig() {
  if (!process.env.EDGE_CONFIG) {
    return null
  }

  if (!edgeConfig) {
    const { get } = await import('@vercel/edge-config')
    edgeConfig = { get }
  }

  return edgeConfig
}

/**
 * Check if a feature flag is enabled
 */
export async function isFeatureEnabled(
  flag: FeatureFlag,
  context?: {
    userId?: string
    organizationId?: string
    email?: string
  }
): Promise<boolean> {
  const config = FLAGS[flag]
  if (!config) {
    console.warn(`Unknown feature flag: ${flag}`)
    return false
  }

  // Check environment variable override
  const envOverride = process.env[`FEATURE_${flag.toUpperCase().replace(/-/g, '_')}`]
  if (envOverride !== undefined) {
    return envOverride === 'true'
  }

  // Try LaunchDarkly first
  try {
    const client = await getLaunchDarklyClient()
    if (client) {
      const user = {
        key: context?.userId || 'anonymous',
        email: context?.email,
        custom: {
          organizationId: context?.organizationId,
        },
      }

      const value = await client.variation(flag, user, config.defaultValue)
      return value
    }
  } catch (error) {
    console.error(`LaunchDarkly error for ${flag}:`, error)
  }

  // Try Vercel Edge Config
  try {
    const edge = await getEdgeConfig()
    if (edge) {
      const value = await edge.get(`features.${flag}`)
      if (value !== undefined) {
        return value
      }
    }
  } catch (error) {
    console.error(`Edge Config error for ${flag}:`, error)
  }

  // Check rollout percentage
  if (config.rolloutPercentage && config.rolloutPercentage > 0) {
    const hash = hashString(context?.userId || context?.organizationId || 'anonymous')
    const percentage = (hash % 100) + 1
    return percentage <= config.rolloutPercentage
  }

  // Check specific user/org lists
  if (config.enabledForUsers && context?.userId) {
    return config.enabledForUsers.includes(context.userId)
  }

  if (config.enabledForOrganizations && context?.organizationId) {
    return config.enabledForOrganizations.includes(context.organizationId)
  }

  // Return default value
  return config.defaultValue
}

/**
 * Get all feature flags for a context
 */
export async function getAllFeatures(context?: {
  userId?: string
  organizationId?: string
  email?: string
}): Promise<Record<FeatureFlag, boolean>> {
  const results: Partial<Record<FeatureFlag, boolean>> = {}
  
  await Promise.all(
    Object.keys(FLAGS).map(async (flag) => {
      results[flag as FeatureFlag] = await isFeatureEnabled(flag as FeatureFlag, context)
    })
  )

  return results as Record<FeatureFlag, boolean>
}

/**
 * React hook for feature flags
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<FeatureFlag, boolean>>({} as any)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllFeatures().then(features => {
      setFlags(features)
      setLoading(false)
    })
  }, [])

  return { flags, loading, isEnabled: (flag: FeatureFlag) => flags[flag] || false }
}

/**
 * Server-side feature flag check with caching
 */
const flagCache = new Map<string, { value: boolean; expires: number }>()

export async function isFeatureEnabledCached(
  flag: FeatureFlag,
  context?: {
    userId?: string
    organizationId?: string
    email?: string
  },
  ttlSeconds = 60
): Promise<boolean> {
  const cacheKey = `${flag}:${context?.userId || context?.organizationId || 'anonymous'}`
  
  // Check cache
  const cached = flagCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return cached.value
  }

  // Get fresh value
  const value = await isFeatureEnabled(flag, context)
  
  // Cache it
  flagCache.set(cacheKey, {
    value,
    expires: Date.now() + ttlSeconds * 1000
  })

  return value
}

/**
 * Simple string hash for rollout percentage
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Feature flag middleware for API routes
 */
export function requireFeature(flag: FeatureFlag) {
  return async (req: Request, context: any) => {
    const enabled = await isFeatureEnabled(flag)
    
    if (!enabled) {
      return new Response(
        JSON.stringify({ error: 'Feature not available' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return context.next()
  }
}

// For client-side usage
import { useState, useEffect } from 'react'

/**
 * Export feature flag status for monitoring
 */
export async function getFeatureFlagStatus(): Promise<{
  provider: 'launchdarkly' | 'edge-config' | 'env' | 'default'
  flags: Record<FeatureFlag, boolean>
  context: any
}> {
  let provider: 'launchdarkly' | 'edge-config' | 'env' | 'default' = 'default'
  
  if (await getLaunchDarklyClient()) {
    provider = 'launchdarkly'
  } else if (await getEdgeConfig()) {
    provider = 'edge-config'
  } else if (Object.keys(process.env).some(k => k.startsWith('FEATURE_'))) {
    provider = 'env'
  }

  const flags = await getAllFeatures()

  return {
    provider,
    flags,
    context: {
      environment: env.get('NODE_ENV'),
      timestamp: new Date().toISOString()
    }
  }
}