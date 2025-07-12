import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Zoom integration status
    const { data: integration, error } = await supabase
      .from('zoom_integrations')
      .select('id, zoom_email, auto_download_enabled, delete_after_download, is_active, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
      throw error
    }

    return NextResponse.json({ 
      connected: !!integration,
      integration: integration || null
    })
  } catch (error) {
    console.error('Failed to get Zoom integration status:', error)
    return NextResponse.json(
      { error: 'Failed to get integration status' },
      { status: 500 }
    )
  }
}