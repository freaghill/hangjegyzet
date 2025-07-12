/**
 * Environment Variable Validator
 * Validates required environment variables at startup
 */

interface EnvVar {
  name: string
  required: boolean
  validate?: (value: string) => boolean
  defaultValue?: string
  sensitive?: boolean
}

const ENV_VARS: EnvVar[] = [
  // Supabase
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    validate: (value) => value.includes('.supabase.co') || value === 'https://your-project.supabase.co',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    validate: (value) => value.length > 10, // Allow dummy values in dev
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    sensitive: true,
    validate: (value) => value.length > 10, // Allow dummy values in dev
  },
  
  // API Keys
  {
    name: 'OPENAI_API_KEY',
    required: true,
    sensitive: true,
    validate: (value) => value.startsWith('sk-') || value === 'sk-your-openai-key',
  },
  {
    name: 'ANTHROPIC_API_KEY',
    required: true,
    sensitive: true,
    validate: (value) => value.startsWith('sk-ant-') || value === 'sk-ant-your-anthropic-key',
  },
  {
    name: 'DEEPGRAM_API_KEY',
    required: false,
    sensitive: true,
  },
  
  // Payment Integration
  {
    name: 'SIMPLEPAY_MERCHANT',
    required: true,
  },
  {
    name: 'SIMPLEPAY_SECRET_KEY',
    required: true,
    sensitive: true,
  },
  {
    name: 'BILLINGO_API_KEY',
    required: true,
    sensitive: true,
  },
  
  // App Configuration
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: true,
    validate: (value) => {
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    },
  },
  
  // Redis (optional)
  {
    name: 'UPSTASH_REDIS_REST_URL',
    required: false,
    validate: (value) => value.includes('upstash.io'),
  },
  {
    name: 'UPSTASH_REDIS_REST_TOKEN',
    required: false,
    sensitive: true,
  },
  
  // WebSocket (optional)
  {
    name: 'NEXT_PUBLIC_WS_URL',
    required: false,
    defaultValue: 'ws://localhost:3001',
  },
  {
    name: 'WS_PORT',
    required: false,
    defaultValue: '3001',
    validate: (value) => !isNaN(parseInt(value)),
  },
  
  // Teams Integration (optional)
  {
    name: 'TEAMS_TENANT_ID',
    required: false,
    validate: (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  },
  {
    name: 'TEAMS_CLIENT_ID',
    required: false,
    validate: (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  },
  {
    name: 'TEAMS_CLIENT_SECRET',
    required: false,
    sensitive: true,
  },
  
  // Security
  {
    name: 'TOKEN_ENCRYPTION_KEY',
    required: false,
    sensitive: true,
    validate: (value) => value.length >= 10, // Allow shorter keys in dev
  },
  
  // Monitoring
  {
    name: 'SENTRY_DSN',
    required: false,
    validate: (value) => value.includes('sentry.io'),
  },
]

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name]
    
    // Check if required variable is missing
    if (envVar.required && !value) {
      errors.push(`Missing required environment variable: ${envVar.name}`)
      continue
    }
    
    // Skip validation if optional and not provided
    if (!envVar.required && !value) {
      // Add warning for recommended variables
      if (['UPSTASH_REDIS_REST_URL', 'TOKEN_ENCRYPTION_KEY'].includes(envVar.name)) {
        warnings.push(`Recommended environment variable not set: ${envVar.name}`)
      }
      continue
    }
    
    // Validate value if validator provided
    if (value && envVar.validate) {
      if (!envVar.validate(value)) {
        errors.push(`Invalid value for ${envVar.name}`)
      }
    }
    
    // Check for sensitive variables in wrong environment
    if (envVar.sensitive && value && process.env.NODE_ENV === 'development') {
      if (value.includes('prod') || value.includes('live')) {
        warnings.push(`Possible production credential in development: ${envVar.name}`)
      }
    }
  }
  
  // Additional checks
  if (process.env.NODE_ENV === 'production') {
    // Production-specific requirements
    if (!process.env.TOKEN_ENCRYPTION_KEY) {
      errors.push('TOKEN_ENCRYPTION_KEY is required in production for security')
    }
    
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      warnings.push('Redis caching is highly recommended in production')
    }
    
    if (process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')) {
      errors.push('NEXT_PUBLIC_APP_URL should not be localhost in production')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Log environment validation results
 */
export function logValidationResults(result: ValidationResult): void {
  if (!result.valid) {
    console.error('❌ Environment validation failed:')
    result.errors.forEach(error => console.error(`  - ${error}`))
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:')
    result.warnings.forEach(warning => console.warn(`  - ${warning}`))
  }
  
  if (result.valid && result.warnings.length === 0) {
    console.log('✅ Environment validation passed')
  }
}

/**
 * Get safe environment info for logging (without sensitive values)
 */
export function getSafeEnvironmentInfo(): Record<string, string> {
  const safeEnv: Record<string, string> = {}
  
  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name]
    
    if (!value) {
      safeEnv[envVar.name] = '<not set>'
    } else if (envVar.sensitive) {
      safeEnv[envVar.name] = '<redacted>'
    } else {
      safeEnv[envVar.name] = value
    }
  }
  
  return safeEnv
}

/**
 * Validate environment at startup
 */
export function validateEnvironmentStartup(): void {
  const result = validateEnvironment()
  logValidationResults(result)
  
  if (!result.valid && process.env.NODE_ENV === 'production') {
    console.error('🚨 Critical: Cannot start in production with invalid environment')
    process.exit(1)
  }
  
  // In development, just warn but continue
  if (!result.valid && process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Continuing in development mode despite validation errors')
    console.warn('⚠️  Some features may not work without proper environment variables')
  }
}