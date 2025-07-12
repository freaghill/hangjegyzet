import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMeetingPDF } from '@/lib/export/pdf-generator'
import { generateMeetingWord } from '@/lib/export/word-generator'
import { withRateLimit } from '@/lib/security/rate-limiter'
import { withAuditLog, AuditEvents } from '@/lib/security/audit-logger'

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate meeting ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!params.id || !uuidRegex.test(params.id)) {
      return NextResponse.json(
        { error: 'Invalid meeting ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get format from query params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'pdf'
    
    if (!['pdf', 'docx'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Use pdf or docx' },
        { status: 400 }
      )
    }

    // Get meeting data
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', params.id)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }

    // Check user has access to this meeting
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', meeting.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Prepare meeting data for export
    const exportData = {
      id: meeting.id,
      title: meeting.title || 'Névtelen találkozó',
      date: new Date(meeting.created_at),
      duration: meeting.duration_seconds || 0,
      participants: meeting.speakers?.map((s: any) => s.name) || [],
      transcript: meeting.transcript?.segments?.map((s: any) => ({
        speaker: s.speaker || 'Ismeretlen',
        text: s.text,
        timestamp: s.start * 1000 // Convert to milliseconds
      })) || [{
        speaker: 'Átirat',
        text: meeting.transcript?.text || 'Átirat nem elérhető',
        timestamp: 0
      }],
      summary: meeting.summary,
      actionItems: meeting.action_items || [],
      keyPoints: meeting.metadata?.keyPoints || [],
      sentiment: meeting.metadata?.sentiment ? {
        overall: meeting.metadata.sentiment,
        distribution: {
          positive: 33,
          neutral: 34,
          negative: 33
        }
      } : undefined
    }

    // Generate document
    let blob: Blob
    let contentType: string
    let filename: string

    if (format === 'pdf') {
      blob = await generateMeetingPDF(exportData)
      contentType = 'application/pdf'
      filename = `${meeting.title || 'meeting'}-${meeting.id}.pdf`
    } else {
      blob = await generateMeetingWord(exportData)
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      filename = `${meeting.title || 'meeting'}-${meeting.id}.docx`
    }

    // Convert blob to buffer
    const buffer = await blob.arrayBuffer()

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength)
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export meeting' },
      { status: 500 }
    )
  }
}

// Export with rate limiting and audit logging
export const GET = withRateLimit(
  withAuditLog(handler, AuditEvents.MEETING_EXPORT, 'meeting'),
  'export'
)