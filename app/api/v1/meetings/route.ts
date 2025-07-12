import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, createPaginatedResponse } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/v1/meetings - List meetings
 */
export const GET = withApiAuth(async (request, context) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  
  const supabase = await createClient()
  
  // Build query
  let query = supabase
    .from('meetings')
    .select('*', { count: 'exact' })
    .eq('organization_id', context.organizationId)
    .order('created_at', { ascending: false })
  
  // Apply filters
  if (status) {
    query = query.eq('status', status)
  }
  if (from) {
    query = query.gte('created_at', from)
  }
  if (to) {
    query = query.lte('created_at', to)
  }
  
  // Apply pagination
  const offset = (page - 1) * limit
  query = query.range(offset, offset + limit - 1)
  
  const { data, error, count } = await query
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    )
  }
  
  // Format response
  const meetings = data.map(meeting => ({
    id: meeting.id,
    title: meeting.title,
    status: meeting.status,
    duration_seconds: meeting.duration_seconds,
    created_at: meeting.created_at,
    transcript_available: !!meeting.transcript,
    summary: meeting.summary,
    intelligence_score: meeting.intelligence_score,
    speakers_count: meeting.speakers?.length || 0
  }))
  
  return NextResponse.json(
    createPaginatedResponse(meetings, page, limit, count || 0)
  )
}, { resource: 'meetings', action: 'read' })

/**
 * POST /api/v1/meetings - Create a new meeting via URL
 */
export const POST = withApiAuth(async (request, context) => {
  try {
    const body = await request.json()
    const { url, title, language = 'hu' } = body
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Create meeting record
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        organization_id: context.organizationId,
        title: title || `Meeting from ${new URL(url).hostname}`,
        status: 'processing',
        metadata: {
          source: 'api',
          url,
          language
        }
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to create meeting' },
        { status: 500 }
      )
    }
    
    // Queue transcription job
    // In production, this would be sent to a queue
    // For now, we'll process it inline
    const { processTranscriptionJob } = await import('@/lib/jobs/transcription-processor')
    
    processTranscriptionJob({
      meetingId: meeting.id,
      fileUrl: url,
      organizationId: context.organizationId,
      options: { language }
    }).catch(console.error)
    
    return NextResponse.json({
      id: meeting.id,
      title: meeting.title,
      status: meeting.status,
      created_at: meeting.created_at
    }, { status: 201 })
  } catch (_error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}, { resource: 'meetings', action: 'write' })