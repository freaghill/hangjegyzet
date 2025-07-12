import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { meetingPreparationService } from '@/lib/ai/meeting-preparation'
import { MeetingTemplateManager } from '@/lib/templates/meeting-templates'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const meetingId = searchParams.get('meetingId')
    const participants = searchParams.get('participants')?.split(',') || []
    const meetingType = searchParams.get('type') || undefined
    const templateId = searchParams.get('templateId') || undefined
    const scheduledDuration = searchParams.get('duration') 
      ? parseInt(searchParams.get('duration')!)
      : undefined
    
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      )
    }
    
    if (participants.length === 0) {
      return NextResponse.json(
        { error: 'At least one participant is required' },
        { status: 400 }
      )
    }
    
    // Get template if specified
    let template = undefined
    if (templateId) {
      const templateManager = new MeetingTemplateManager()
      template = await templateManager.getTemplate(templateId)
    }
    
    // Generate pre-meeting brief
    const brief = await meetingPreparationService.generatePreMeetingBrief({
      meetingId,
      organizationId: profile.organization_id,
      participants,
      meetingType,
      template: template || undefined,
      scheduledDuration
    })
    
    return NextResponse.json(brief)
  } catch (error) {
    console.error('Error generating meeting brief:', error)
    return NextResponse.json(
      { error: 'Failed to generate meeting brief' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Parse request body
    const body = await request.json()
    const {
      meetingId,
      participants,
      meetingType,
      templateId,
      scheduledDuration,
      customContext
    } = body
    
    if (!meetingId || !participants || participants.length === 0) {
      return NextResponse.json(
        { error: 'Meeting ID and participants are required' },
        { status: 400 }
      )
    }
    
    // Get template if specified
    let template = undefined
    if (templateId) {
      const templateManager = new MeetingTemplateManager()
      template = await templateManager.getTemplate(templateId)
    }
    
    // Generate comprehensive pre-meeting brief with custom context
    const context = {
      meetingId,
      organizationId: profile.organization_id,
      participants,
      meetingType,
      template: template || undefined,
      scheduledDuration,
      ...customContext
    }
    
    const brief = await meetingPreparationService.generatePreMeetingBrief(context)
    
    // Optionally save the brief for future reference
    if (body.saveBrief) {
      const { error: saveError } = await supabase
        .from('meeting_briefs')
        .insert({
          meeting_id: meetingId,
          organization_id: profile.organization_id,
          brief_data: brief,
          created_by: user.id
        })
      
      if (saveError) {
        console.error('Error saving brief:', saveError)
      }
    }
    
    return NextResponse.json(brief)
  } catch (error) {
    console.error('Error generating meeting brief:', error)
    return NextResponse.json(
      { error: 'Failed to generate meeting brief' },
      { status: 500 }
    )
  }
}