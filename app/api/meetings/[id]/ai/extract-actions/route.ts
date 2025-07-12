import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { actionItemExtractor } from '@/lib/ai/action-item-extractor'
import { z } from 'zod'

const RequestSchema = z.object({
  useReasoning: z.boolean().optional().default(false),
  includeContext: z.boolean().optional().default(true),
  generateEmail: z.boolean().optional().default(false),
  provider: z.enum(['openai', 'anthropic']).optional().default('openai')
})

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
    const { useReasoning, includeContext, generateEmail, provider } = RequestSchema.parse(body)
    
    // Get meeting data
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        *,
        organization_id,
        meeting_segments(
          speaker,
          content,
          start_time,
          end_time
        ),
        meeting_participants(
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
    
    // Get transcript
    const transcript = meeting.transcript?.text || meeting.meeting_segments
      ?.map((seg: any) => `${seg.speaker}: ${seg.content}`)
      .join('\n')
    
    if (!transcript) {
      return NextResponse.json({ error: 'No transcript available' }, { status: 400 })
    }
    
    // Prepare metadata
    const metadata = {
      title: meeting.title,
      participants: meeting.meeting_participants?.map((p: any) => p.name) || [],
      duration: meeting.duration_seconds,
      language: 'hu'
    }
    
    // Initialize extractor with selected provider
    const extractor = new (await import('@/lib/ai/action-item-extractor')).ActionItemExtractor(provider)
    
    let insights
    let reasoning
    
    if (useReasoning && includeContext) {
      // Get previous meetings for context
      const { data: previousMeetings } = await supabase
        .from('meetings')
        .select(`
          title,
          meeting_action_items(
            text,
            assignee_name,
            priority,
            status
          )
        `)
        .eq('organization_id', meeting.organization_id)
        .neq('id', meetingId)
        .order('created_at', { ascending: false })
        .limit(5)
      
      const context = {
        previousMeetings: previousMeetings?.map((m: any) => ({
          title: m.title,
          action_items: m.meeting_action_items
        })) || [],
        templateType: meeting.template_id
      }
      
      const result = await extractor.extractWithReasoning(transcript, context)
      insights = result.insights
      reasoning = result.reasoning
    } else {
      insights = await extractor.extractFromTranscript(transcript, metadata)
    }
    
    // Validate action items
    const validation = extractor.validateActionItems(insights.action_items)
    
    // Save extracted action items to database
    if (insights.action_items.length > 0) {
      const actionItemsToInsert = insights.action_items.map((item, index) => ({
        meeting_id: meetingId,
        organization_id: meeting.organization_id,
        text: item.text,
        assignee_name: item.assignee,
        priority: item.priority,
        category: item.category,
        deadline: item.deadline,
        context: item.context,
        confidence_score: item.confidence,
        order_index: index,
        created_by: user.id,
        is_ai_generated: true
      }))
      
      await supabase
        .from('meeting_action_items')
        .insert(actionItemsToInsert)
    }
    
    // Save other insights
    await supabase
      .from('meeting_ai_summaries')
      .upsert({
        meeting_id: meetingId,
        key_points: insights.follow_up_topics,
        decisions: insights.key_decisions,
        next_steps: insights.next_meeting_agenda,
        insights: {
          blockers: insights.blockers,
          participants_mentioned: insights.participants_mentioned,
          metrics_kpis: insights.metrics_kpis
        },
        updated_at: new Date().toISOString()
      })
    
    // Generate follow-up email if requested
    let emailContent
    if (generateEmail) {
      emailContent = await extractor.generateFollowUpEmail(
        insights,
        meeting.title,
        new Date(meeting.created_at)
      )
    }
    
    return NextResponse.json({
      success: true,
      insights,
      reasoning,
      validation,
      emailContent,
      stats: {
        totalActionItems: insights.action_items.length,
        validActionItems: validation.valid.length,
        qualityScore: validation.score,
        decisions: insights.key_decisions.length,
        blockers: insights.blockers.length
      }
    })
    
  } catch (error) {
    console.error('AI extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract action items' },
      { status: 500 }
    )
  }
}