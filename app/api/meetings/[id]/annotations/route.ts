import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AnnotationManager } from '@/lib/annotations/manager'

// GET /api/meetings/[id]/annotations - Get all annotations for a meeting
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
    
    // Check if user has access to this meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('organization_id')
      .eq('id', params.id)
      .single()
    
    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }
    
    // Check if user belongs to the organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.organization_id !== meeting.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Get annotations
    const manager = new AnnotationManager()
    const annotations = await manager.getAnnotations(params.id)
    
    return NextResponse.json({ annotations })
  } catch (error) {
    console.error('Error fetching annotations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch annotations' },
      { status: 500 }
    )
  }
}

// POST /api/meetings/[id]/annotations - Create a new annotation
export async function POST(
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
    
    // Parse request body
    const body = await request.json()
    const { timestamp_seconds, content, is_action_item } = body
    
    if (typeof timestamp_seconds !== 'number' || !content) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    
    // Check if user has access to this meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('organization_id')
      .eq('id', params.id)
      .single()
    
    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }
    
    // Check if user belongs to the organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.organization_id !== meeting.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Create annotation
    const manager = new AnnotationManager()
    const annotation = await manager.createAnnotation(
      params.id,
      user.id,
      timestamp_seconds,
      content,
      is_action_item || false
    )
    
    // If it's an action item, update the meeting's action items
    if (is_action_item) {
      const { assignee, deadline } = body
      await manager.createActionItem(annotation, assignee, deadline)
    }
    
    return NextResponse.json({ annotation })
  } catch (error) {
    console.error('Error creating annotation:', error)
    return NextResponse.json(
      { error: 'Failed to create annotation' },
      { status: 500 }
    )
  }
}

// PATCH /api/meetings/[id]/annotations/[annotationId] - Update an annotation
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Extract annotation ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const annotationId = pathParts[pathParts.length - 1]
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse request body
    const body = await request.json()
    const { content, is_action_item } = body
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }
    
    // Check if user owns the annotation
    const { data: annotation } = await supabase
      .from('annotations')
      .select('user_id')
      .eq('id', annotationId)
      .single()
    
    if (!annotation || annotation.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Update annotation
    const manager = new AnnotationManager()
    const updatedAnnotation = await manager.updateAnnotation(
      annotationId,
      content,
      is_action_item
    )
    
    return NextResponse.json({ annotation: updatedAnnotation })
  } catch (error) {
    console.error('Error updating annotation:', error)
    return NextResponse.json(
      { error: 'Failed to update annotation' },
      { status: 500 }
    )
  }
}

// DELETE /api/meetings/[id]/annotations/[annotationId] - Delete an annotation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Extract annotation ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const annotationId = pathParts[pathParts.length - 1]
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user owns the annotation
    const { data: annotation } = await supabase
      .from('annotations')
      .select('user_id')
      .eq('id', annotationId)
      .single()
    
    if (!annotation || annotation.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Delete annotation
    const manager = new AnnotationManager()
    await manager.deleteAnnotation(annotationId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting annotation:', error)
    return NextResponse.json(
      { error: 'Failed to delete annotation' },
      { status: 500 }
    )
  }
}