import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AnnotationManager } from '@/lib/annotations/manager'

// GET /api/users/mentions - Get unread mentions for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get unread mentions
    const manager = new AnnotationManager()
    const mentions = await manager.getUnreadMentions(user.id)
    
    return NextResponse.json({ mentions })
  } catch (error) {
    console.error('Error fetching mentions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch mentions' },
      { status: 500 }
    )
  }
}

// POST /api/users/mentions/mark-read - Mark mentions as read
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse request body
    const body = await request.json()
    const { mentionIds } = body
    
    if (!Array.isArray(mentionIds) || mentionIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid mention IDs' },
        { status: 400 }
      )
    }
    
    // Verify mentions belong to the user
    const { data: mentions } = await supabase
      .from('annotation_mentions')
      .select('id')
      .eq('mentioned_user_id', user.id)
      .in('id', mentionIds)
    
    if (!mentions || mentions.length !== mentionIds.length) {
      return NextResponse.json(
        { error: 'Invalid mention IDs' },
        { status: 400 }
      )
    }
    
    // Mark as read
    const manager = new AnnotationManager()
    await manager.markMentionsAsNotified(mentionIds)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking mentions as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark mentions as read' },
      { status: 500 }
    )
  }
}