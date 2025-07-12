import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/v1/meetings/:id/transcript - Get meeting transcript
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiAuth(async (request, context) => {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'
  
  const supabase = await createClient()
  
  const { data: meeting, error } = await supabase
    .from('meetings')
    .select('transcript, title, created_at')
    .eq('id', params.id)
    .eq('organization_id', context.organizationId)
    .single()
  
  if (error || !meeting) {
    return NextResponse.json(
      { error: 'Meeting not found' },
      { status: 404 }
    )
  }
  
  if (!meeting.transcript) {
    return NextResponse.json(
      { error: 'Transcript not available' },
      { status: 404 }
    )
  }
  
  // Return different formats
  switch (format) {
    case 'text':
      return new NextResponse(meeting.transcript.text || '', {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${meeting.title}-transcript.txt"`
        }
      })
    
    case 'srt':
      const srt = generateSRT(meeting.transcript.segments || [])
      return new NextResponse(srt, {
        headers: {
          'Content-Type': 'text/srt',
          'Content-Disposition': `attachment; filename="${meeting.title}-transcript.srt"`
        }
      })
    
    case 'json':
    default:
      return NextResponse.json({
        meeting_id: params.id,
        title: meeting.title,
        created_at: meeting.created_at,
        transcript: {
          text: meeting.transcript.text,
          segments: meeting.transcript.segments,
          language: meeting.transcript.language || 'hu'
        }
      })
  }
  }, { resource: 'transcripts', action: 'read' })(request)
}

/**
 * Generate SRT format from segments
 */
function generateSRT(segments: Array<{ start: number; end: number; text: string }>): string {
  return segments
    .map((segment, index) => {
      const startTime = formatSRTTime(segment.start)
      const endTime = formatSRTTime(segment.end)
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`
    })
    .join('\n')
}

/**
 * Format time for SRT
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const millis = Math.floor((seconds % 1) * 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis
    .toString()
    .padStart(3, '0')}`
}