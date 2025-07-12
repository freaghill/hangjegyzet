import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const checks = {
    environment: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseUrlValid: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('.supabase.co'),
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseAnonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not set',
    },
    supabaseConnection: false,
    databaseTables: false,
    error: null as string | null,
  }

  try {
    // Test Supabase connection
    const supabase = await createClient()
    const { error } = await supabase.from('organizations').select('count').single()
    
    if (!error || error.code === 'PGRST116') {
      // PGRST116 means no rows, which is fine - connection works
      checks.supabaseConnection = true
      checks.databaseTables = true
    } else if (error.code === '42P01') {
      // Table doesn't exist
      checks.supabaseConnection = true
      checks.databaseTables = false
      checks.error = 'Database tables not created. Run supabase/schema.sql in your Supabase SQL editor.'
    } else {
      checks.error = error.message
    }
  } catch (err) {
    checks.error = err instanceof Error ? err.message : 'Unknown error'
  }

  const allChecksPass = 
    checks.environment.supabaseUrl && 
    checks.environment.supabaseUrlValid &&
    checks.environment.supabaseAnonKey &&
    checks.environment.supabaseAnonKeyLength > 100 &&
    checks.supabaseConnection &&
    checks.databaseTables

  return NextResponse.json({
    status: allChecksPass ? 'ready' : 'not ready',
    checks,
    instructions: !allChecksPass ? {
      message: 'Setup incomplete. Please follow these steps:',
      steps: [
        !checks.environment.supabaseUrl ? '1. Add NEXT_PUBLIC_SUPABASE_URL to .env.local' : null,
        !checks.environment.supabaseUrlValid ? '1. Set a valid Supabase URL (should include .supabase.co)' : null,
        !checks.environment.supabaseAnonKey ? '2. Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local' : null,
        checks.environment.supabaseAnonKeyLength < 100 ? '2. Set a valid Supabase anon key (should be a long JWT token)' : null,
        !checks.supabaseConnection ? '3. Ensure your Supabase project is active and credentials are correct' : null,
        !checks.databaseTables ? '4. Run the schema.sql file in your Supabase SQL editor' : null,
      ].filter(Boolean),
      setupGuide: 'See SETUP.md for detailed instructions',
    } : null,
  })
}