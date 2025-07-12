/**
 * Environment configuration with validation
 * Ensures all required environment variables are present
 */

import { z } from 'zod'

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // AI Services
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional(),
  
  // Payment
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  
  // Email
  RESEND_API_KEY: z.string().startsWith('re_'),
  EMAIL_FROM: z.string().email(),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  
  // Feature Flags
  LAUNCHDARKLY_SDK_KEY: z.string().optional(),
  
  // Internal
  INTERNAL_WEBHOOK_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(32),
  
  // Rate Limiting
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
})

type Environment = z.infer<typeof envSchema>

class EnvironmentConfig {
  private static instance: EnvironmentConfig
  private config: Environment

  private constructor() {
    try {
      this.config = envSchema.parse(process.env)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missing = error.errors.map(e => e.path.join('.')).join(', ')
        throw new Error(`Missing or invalid environment variables: ${missing}`)
      }
      throw error
    }
  }

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig()
    }
    return EnvironmentConfig.instance
  }

  get(key: keyof Environment): string {
    return this.config[key] as string
  }

  getAll(): Environment {
    return this.config
  }

  isProduction(): boolean {
    return this.config.NODE_ENV === 'production'
  }

  isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development'
  }

  isTest(): boolean {
    return this.config.NODE_ENV === 'test'
  }

  // Feature flag helpers
  hasFeatureFlags(): boolean {
    return !!this.config.LAUNCHDARKLY_SDK_KEY
  }

  hasRedis(): boolean {
    return !!this.config.UPSTASH_REDIS_REST_URL && !!this.config.UPSTASH_REDIS_REST_TOKEN
  }

  hasMonitoring(): boolean {
    return !!this.config.SENTRY_DSN
  }

  hasSlackIntegration(): boolean {
    return !!this.config.SLACK_WEBHOOK_URL
  }
}

// Export singleton instance
export const env = EnvironmentConfig.getInstance()

// Export specific configs for different services
export const supabaseConfig = {
  url: env.get('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey: env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  serviceRoleKey: env.get('SUPABASE_SERVICE_ROLE_KEY'),
}

export const stripeConfig = {
  secretKey: env.get('STRIPE_SECRET_KEY'),
  webhookSecret: env.get('STRIPE_WEBHOOK_SECRET'),
}

export const aiConfig = {
  openai: {
    apiKey: env.get('OPENAI_API_KEY'),
  },
  anthropic: {
    apiKey: env.get('ANTHROPIC_API_KEY'),
  },
}

export const emailConfig = {
  apiKey: env.get('RESEND_API_KEY'),
  from: env.get('EMAIL_FROM'),
}

export const monitoringConfig = {
  sentry: {
    dsn: env.get('SENTRY_DSN'),
    environment: env.get('NODE_ENV'),
  },
  slack: {
    webhookUrl: env.get('SLACK_WEBHOOK_URL'),
  },
}

// Validate environment on startup
if (env.isProduction()) {
  console.log('✅ Environment variables validated for production')
} else {
  console.log(`✅ Environment variables validated for ${env.get('NODE_ENV')}`)
}