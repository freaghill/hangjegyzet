/**
 * Validate required environment variables on startup
 * Call this in your app's root layout or API routes
 */

const requiredEnvVars = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: 'Supabase project URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Supabase anonymous key',
  SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role key',
  
  // Stripe
  STRIPE_SECRET_KEY: 'Stripe secret key',
  STRIPE_WEBHOOK_SECRET: 'Stripe webhook signing secret',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'Stripe publishable key',
  
  // AI Services
  OPENAI_API_KEY: 'OpenAI API key',
  ANTHROPIC_API_KEY: 'Anthropic API key',
  
  // App
  NEXT_PUBLIC_APP_URL: 'Application URL',
  
  // Optional but recommended
  SENTRY_DSN: 'Sentry error tracking DSN',
  RESEND_API_KEY: 'Resend email API key',
} as const

export function validateEnv(): void {
  const missing: string[] = []
  const warnings: string[] = []
  
  // Check required vars
  Object.entries(requiredEnvVars).forEach(([key, description]) => {
    if (!process.env[key]) {
      // Some vars are only required in production
      if (process.env.NODE_ENV === 'production') {
        missing.push(`${key} - ${description}`)
      } else if (!key.includes('SENTRY') && !key.includes('RESEND')) {
        missing.push(`${key} - ${description}`)
      } else {
        warnings.push(`${key} - ${description} (optional in development)`)
      }
    }
  })
  
  // Log warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Missing optional environment variables:')
    warnings.forEach(w => console.warn(`   - ${w}`))
  }
  
  // Throw if required vars missing
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(m => console.error(`   - ${m}`))
    throw new Error(
      `Missing ${missing.length} required environment variables. ` +
      'Please check your .env.local file.'
    )
  }
  
  // Validate format
  validateUrlFormat('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
  validateUrlFormat('NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL)
  
  console.log('✅ Environment variables validated successfully')
}

function validateUrlFormat(name: string, value?: string): void {
  if (!value) return
  
  try {
    new URL(value)
  } catch {
    throw new Error(`${name} must be a valid URL. Got: ${value}`)
  }
}

// Additional validation for specific services
export function validateStripeConfig(): void {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return
  
  if (key.startsWith('pk_')) {
    throw new Error('STRIPE_SECRET_KEY should be a secret key (sk_), not a publishable key (pk_)')
  }
  
  if (key.includes('test') && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Using Stripe test key in production!')
  }
}

export function validateAIConfig(): void {
  const openai = process.env.OPENAI_API_KEY
  const anthropic = process.env.ANTHROPIC_API_KEY
  
  if (!openai && !anthropic) {
    throw new Error('At least one AI service API key is required (OpenAI or Anthropic)')
  }
}

// Run all validations
export function validateAllEnv(): void {
  validateEnv()
  validateStripeConfig()
  validateAIConfig()
}