import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'

interface ShareOptions {
  password?: string
  expiresIn?: number // hours
  maxViews?: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get all shares for this meeting
    const { data: shares, error } = await supabase
      .from('public_shares')
      .select('*')
      .eq('meeting_id', params.id)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    // Add full URLs to shares
    const sharesWithUrls = shares.map(share => ({
      ...share,
      url: `${request.nextUrl.origin}/share/${share.share_token}`,
      isActive: (!share.expires_at || new Date(share.expires_at) > new Date()) &&
                (!share.max_views || share.view_count < share.max_views)
    }))
    
    return NextResponse.json(sharesWithUrls)
  } catch (error) {
    console.error('Get shares error:', error)
    return NextResponse.json(
      { error: 'Failed to get shares' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check if user has access to the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, organization_id, created_by')
      .eq('id', params.id)
      .single()
    
    if (meetingError || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    // Check authorization
    if (meeting.created_by !== user.id) {
      // Check if user belongs to the same organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      
      if (!profile || profile.organization_id !== meeting.organization_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }
    
    // Parse share options
    const body = await request.json()
    const options: ShareOptions = body || {}
    
    // Generate unique share token
    const shareToken = nanoid(16)
    
    // Prepare share data
    const shareData: any = {
      meeting_id: params.id,
      share_token: shareToken,
      created_by: user.id,
      settings: {
        showTranscript: body.showTranscript !== false,
        showHighlights: body.showHighlights !== false,
        showActionItems: body.showActionItems !== false
      }
    }
    
    // Add password if provided
    if (options.password) {
      const hashedPassword = await bcrypt.hash(options.password, 10)
      shareData.password_hash = hashedPassword
    }
    
    // Add expiration if provided
    if (options.expiresIn) {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + options.expiresIn)
      shareData.expires_at = expiresAt.toISOString()
    }
    
    // Add max views if provided
    if (options.maxViews) {
      shareData.max_views = options.maxViews
    }
    
    // Create the share
    const { data: share, error: shareError } = await supabase
      .from('public_shares')
      .insert(shareData)
      .select()
      .single()
    
    if (shareError) {
      throw shareError
    }
    
    // Return share with full URL
    return NextResponse.json({
      ...share,
      url: `${request.nextUrl.origin}/share/${share.share_token}`,
      isActive: true
    })
  } catch (error) {
    console.error('Create share error:', error)
    return NextResponse.json(
      { error: 'Failed to create share' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get share token from query params
    const shareToken = request.nextUrl.searchParams.get('token')
    if (!shareToken) {
      return NextResponse.json(
        { error: 'Share token required' },
        { status: 400 }
      )
    }
    
    // Delete the share
    const { error } = await supabase
      .from('public_shares')
      .delete()
      .eq('share_token', shareToken)
      .eq('created_by', user.id)
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete share error:', error)
    return NextResponse.json(
      { error: 'Failed to delete share' },
      { status: 500 }
    )
  }
}