#!/bin/bash

# Add environment variables to Vercel

echo "Adding environment variables to Vercel..."

# Add production environment variables
vercel env add DATABASE_URL production < <(echo "postgresql://postgres.cxbfiywpynbrcsnysvha:MU8pvm3QAnLi8kTU@aws-0-eu-central-1.pooler.supabase.com:6543/postgres")
vercel env add NEXT_PUBLIC_SUPABASE_URL production < <(echo "https://cxbfiywpynbrcsnysvha.supabase.co")
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production < <(echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4YmZpeXdweW5icmNzbnlzdmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzI1MTgsImV4cCI6MjA2NzQwODUxOH0.LPWhWE-n4hBA4RA75D6pfSUEMBbJkMha1KiKS4DE2go")
vercel env add SUPABASE_SERVICE_ROLE_KEY production < <(echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4YmZpeXdweW5icmNzbnlzdmhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgzMjUxOCwiZXhwIjoyMDY3NDA4NTE4fQ.uROzBL3zmwTO9-52RI45SwMhvLpkZSWHE4cvJQfUjIc")
vercel env add NEXTAUTH_URL production < <(echo "https://hangjegyzet.vercel.app")
vercel env add NEXTAUTH_SECRET production < <(echo "Xqumm3D982AwkQj6iH8HQIaCxHryMInORwqEus7E8gY=")
vercel env add NEXT_PUBLIC_APP_URL production < <(echo "https://hangjegyzet.vercel.app")

# Add placeholder values for optional services
vercel env add OPENAI_API_KEY production < <(echo "sk-placeholder")
vercel env add SENDGRID_API_KEY production < <(echo "SG.placeholder")
vercel env add STRIPE_SECRET_KEY production < <(echo "sk_test_placeholder")
vercel env add STRIPE_WEBHOOK_SECRET production < <(echo "whsec_placeholder")
vercel env add SENTRY_DSN production < <(echo "https://placeholder@sentry.io/placeholder")
vercel env add REDIS_URL production < <(echo "redis://localhost:6379")

echo "Environment variables added!"