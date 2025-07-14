import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch meeting
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select(`
        *,
        meeting_templates (
          id,
          name,
          template_type,
          sections
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }

    // Calculate duration in minutes
    const duration = Math.floor(meeting.duration_seconds / 60)

    return NextResponse.json({
      ...meeting,
      duration
    })
  } catch (error) {
    console.error('Meeting fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    )
  }
}