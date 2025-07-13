import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ExportService } from '@/lib/export/export-service'
import { ExportOptions } from '@/lib/export/types'
import { z } from 'zod'

const exportOptionsSchema = z.object({
  format: z.enum(['pdf', 'docx', 'txt']),
  template: z.enum(['legal', 'business', 'medical', 'custom']),
  includeBranding: z.boolean().default(true),
  includeTranscript: z.boolean().default(true),
  includeSummary: z.boolean().default(true),
  includeActionItems: z.boolean().default(true),
  includeMetadata: z.boolean().default(true),
  language: z.enum(['hu', 'en']).optional().default('hu')
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const options = exportOptionsSchema.parse(body)

    // Get meeting data
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        *,
        profiles!meetings_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('id', params.id)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Check access
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id !== meeting.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get organization branding
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', meeting.organization_id)
      .single()

    const organizationBranding = organization?.branding || {
      companyName: organization?.name,
      primaryColor: '#2563eb',
      includeContactInfo: true,
      contactInfo: {
        email: organization?.contact_email,
        phone: organization?.contact_phone,
        website: organization?.website,
        address: organization?.address
      }
    }

    // Get action items
    const { data: actionItems } = await supabase
      .from('action_items')
      .select('*')
      .eq('meeting_id', params.id)
      .order('created_at', { ascending: true })

    // Prepare meeting data for export
    const meetingData = {
      id: meeting.id,
      title: meeting.title,
      date: new Date(meeting.created_at),
      duration: meeting.duration_seconds || 0,
      participants: meeting.speakers?.map((s: any) => s.name) || [],
      transcript: meeting.transcript,
      summary: meeting.summary,
      actionItems: actionItems?.map(item => ({
        task: item.description,
        assignee: item.assignee,
        deadline: item.due_date,
        priority: item.priority
      })) || [],
      metadata: {
        mode: meeting.transcription_mode,
        language: meeting.language,
        createdBy: meeting.profiles?.full_name || meeting.profiles?.email
      }
    }

    // Export document
    const exportService = new ExportService()
    const result = await exportService.export(
      meetingData,
      options as ExportOptions,
      organizationBranding
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Export failed' },
        { status: 500 }
      )
    }

    // Return the file
    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid export options', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    )
  }
}

// Get available export options
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check meeting exists and user has access
    const { data: meeting } = await supabase
      .from('meetings')
      .select('organization_id')
      .eq('id', params.id)
      .single()

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id !== meeting.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Return available export options
    return NextResponse.json({
      formats: [
        { value: 'pdf', label: 'PDF', description: 'Portable Document Format' },
        { value: 'docx', label: 'Word', description: 'Microsoft Word dokumentum' },
        { value: 'txt', label: 'Szöveg', description: 'Egyszerű szöveges fájl' }
      ],
      templates: [
        { value: 'business', label: 'Üzleti', description: 'Általános üzleti meetingekhez' },
        { value: 'legal', label: 'Jogi', description: 'Jogi konzultációkhoz' },
        { value: 'medical', label: 'Egészségügyi', description: 'Orvosi konzultációkhoz' },
        { value: 'custom', label: 'Egyéni', description: 'Testreszabható sablon' }
      ],
      options: {
        includeBranding: true,
        includeTranscript: true,
        includeSummary: true,
        includeActionItems: true,
        includeMetadata: true
      }
    })
  } catch (error) {
    console.error('Get export options error:', error)
    return NextResponse.json(
      { error: 'Failed to get export options' },
      { status: 500 }
    )
  }
}