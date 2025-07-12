import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AnnotationManager } from '@/lib/annotations/manager'

// GET /api/meetings/[id]/annotations/[annotationId]/threads - Get threads for an annotation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  const resolvedParams = await params;
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user has access to this annotation's meeting
    const { data: annotation } = await supabase
      .from('annotations')
      .select('meeting_id')
      .eq('id', resolvedParams.annotationId)
      .single()
    
    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }
    
    // Get threads
    const manager = new AnnotationManager()
    const threads = await manager.getThreads(resolvedParams.annotationId)
    
    return NextResponse.json({ threads })
  } catch (error) {
    console.error('Error fetching threads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch threads' },
      { status: 500 }
    )
  }
}

// POST /api/meetings/[id]/annotations/[annotationId]/threads - Add a thread
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  const resolvedParams = await params;
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse request body
    const body = await request.json()
    const { content } = body
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }
    
    // Check if user has access to this annotation's meeting
    const { data: annotation } = await supabase
      .from('annotations')
      .select(`
        meeting_id,
        meetings!inner (
          organization_id
        )
      `)
      .eq('id', resolvedParams.annotationId)
      .single()
    
    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }
    
    // Check if user belongs to the organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.organization_id !== annotation.meetings.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Add thread
    const manager = new AnnotationManager()
    const thread = await manager.addThread(
      resolvedParams.annotationId,
      user.id,
      content
    )
    
    return NextResponse.json({ thread })
  } catch (error) {
    console.error('Error creating thread:', error)
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    )
  }
}