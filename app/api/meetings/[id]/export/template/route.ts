import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pdfGenerator } from '@/lib/export/pdf-generator'
import { templateEngine, TemplateData } from '@/lib/export/template-engine'
import { defaultTemplates } from '@/lib/export/templates/default-templates'

export async function POST(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { meetingId } = params
    const body = await request.json()
    const { templateId, format = 'pdf', customTemplate } = body
    
    // Get meeting data with all related information
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        *,
        organization:organizations(
          id,
          name,
          logo_url,
          settings
        ),
        segments:meeting_segments(
          speaker,
          content,
          start_time,
          end_time
        ),
        action_items:meeting_action_items(
          text,
          assignee_email,
          assignee_name,
          due_date,
          priority,
          status
        ),
        participants:meeting_participants(
          name,
          email,
          role
        )
      `)
      .eq('id', meetingId)
      .single()
    
    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }
    
    // Check access
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', meeting.organization_id)
      .eq('user_id', user.id)
      .single()
    
    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Get AI summaries if available
    const { data: aiSummary } = await supabase
      .from('meeting_ai_summaries')
      .select('summary, key_points, decisions')
      .eq('meeting_id', meetingId)
      .single()
    
    // Prepare template data
    const templateData: TemplateData = {
      title: meeting.title,
      description: meeting.description,
      created_at: new Date(meeting.created_at),
      duration_seconds: meeting.duration_seconds || 0,
      status: meeting.status,
      organization: {
        name: meeting.organization.name,
        logo: meeting.organization.logo_url,
        // Add other organization details from settings if needed
      },
      summary: aiSummary?.summary,
      key_points: aiSummary?.key_points || [],
      decisions: aiSummary?.decisions || [],
      action_items: meeting.action_items.map((item: any) => ({
        text: item.text,
        assignee: item.assignee_email ? {
          name: item.assignee_name || item.assignee_email,
          email: item.assignee_email
        } : undefined,
        due_date: item.due_date ? new Date(item.due_date) : undefined,
        priority: item.priority || 'medium',
        status: item.status || 'pending'
      })),
      segments: meeting.segments.map((seg: any) => ({
        speaker: seg.speaker,
        content: seg.content,
        start_time: seg.start_time,
        end_time: seg.end_time
      })),
      participants: meeting.participants.map((p: any) => ({
        name: p.name,
        email: p.email,
        role: p.role
      }))
    }
    
    // Get template
    let template
    if (customTemplate) {
      // Use custom template provided in request
      template = customTemplate
    } else if (templateId) {
      // Try to find in default templates
      const defaultTemplate = defaultTemplates.find(t => t.id === templateId)
      if (defaultTemplate) {
        template = defaultTemplate
      } else {
        // Try to get from database
        const { data: dbTemplate } = await supabase
          .from('export_templates')
          .select('*')
          .eq('id', templateId)
          .eq('organization_id', meeting.organization_id)
          .single()
        
        if (!dbTemplate) {
          return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }
        template = dbTemplate
      }
    } else {
      // Use default business template
      template = defaultTemplates.find(t => t.id === 'business-summary')!
    }
    
    // Generate export based on format
    let exportData: Buffer
    let contentType: string
    let fileName: string
    
    switch (format) {
      case 'pdf':
        exportData = await pdfGenerator.generatePDF(template, templateData, {
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: true
        })
        contentType = 'application/pdf'
        fileName = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
        break
        
      case 'html':
        const html = templateEngine.renderTemplate(template, templateData)
        exportData = Buffer.from(html, 'utf-8')
        contentType = 'text/html; charset=utf-8'
        fileName = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.html`
        break
        
      case 'docx':
        // For now, return HTML that can be opened in Word
        // TODO: Implement proper DOCX generation with docx library
        const docHtml = templateEngine.renderTemplate(template, templateData)
        exportData = Buffer.from(docHtml, 'utf-8')
        contentType = 'text/html; charset=utf-8'
        fileName = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.html`
        break
        
      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }
    
    // Track export in analytics
    await supabase
      .from('meeting_exports')
      .insert({
        meeting_id: meetingId,
        organization_id: meeting.organization_id,
        user_id: user.id,
        format,
        template_id: template.id || templateId,
        exported_at: new Date().toISOString()
      })
    
    // Return the file
    return new NextResponse(exportData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': exportData.length.toString(),
      }
    })
    
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    )
  }
}