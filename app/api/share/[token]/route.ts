import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get share by token (no auth required)
    const { data: share, error: shareError } = await supabase
      .from('public_shares')
      .select('*')
      .eq('share_token', params.token)
      .single()
    
    if (shareError || !share) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      )
    }
    
    // Check if share is expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      )
    }
    
    // Check if max views reached
    if (share.max_views && share.view_count >= share.max_views) {
      return NextResponse.json(
        { error: 'Share link has reached maximum views' },
        { status: 410 }
      )
    }
    
    // Get meeting data
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, title, created_at, duration_seconds, transcript, summary, action_items, highlights, metadata')
      .eq('id', share.meeting_id)
      .single()
    
    if (meetingError || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    // Increment view count
    await supabase.rpc('increment_share_view_count', {
      share_token_param: params.token
    })
    
    // Filter meeting data based on share settings
    const settings = share.settings || {}
    const filteredMeeting: any = {
      id: meeting.id,
      title: meeting.title,
      created_at: meeting.created_at,
      duration_seconds: meeting.duration_seconds,
      requiresPassword: !!share.password_hash
    }
    
    // Only include allowed data
    if (settings.showTranscript !== false) {
      filteredMeeting.transcript = meeting.transcript
    }
    
    if (settings.showHighlights !== false) {
      filteredMeeting.highlights = meeting.highlights
      filteredMeeting.summary = meeting.summary
    }
    
    if (settings.showActionItems !== false) {
      filteredMeeting.action_items = meeting.action_items
    }
    
    return NextResponse.json({
      share: {
        id: share.id,
        expires_at: share.expires_at,
        view_count: share.view_count + 1,
        max_views: share.max_views,
        settings: share.settings,
        requiresPassword: !!share.password_hash
      },
      meeting: filteredMeeting
    })
  } catch (error) {
    console.error('Get shared meeting error:', error)
    return NextResponse.json(
      { error: 'Failed to get shared meeting' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Get share by token
    const { data: share, error: shareError } = await supabase
      .from('public_shares')
      .select('*')
      .eq('share_token', params.token)
      .single()
    
    if (shareError || !share) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      )
    }
    
    // Check if share requires password
    if (!share.password_hash) {
      return NextResponse.json(
        { error: 'This share does not require a password' },
        { status: 400 }
      )
    }
    
    // Verify password
    const { password } = body
    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      )
    }
    
    const isValid = await bcrypt.compare(password, share.password_hash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }
    
    // Password is valid, return success
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Verify share password error:', error)
    return NextResponse.json(
      { error: 'Failed to verify password' },
      { status: 500 }
    )
  }
}