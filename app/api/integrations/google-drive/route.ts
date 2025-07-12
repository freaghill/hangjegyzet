import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the integration
    const { data: integration } = await supabase
      .from('google_drive_integrations')
      .select('id, is_active, watched_folders, last_sync_at, created_at')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({ integration })
  } catch (error) {
    console.error('Get integration error:', error)
    return NextResponse.json({ integration: null })
  }
}