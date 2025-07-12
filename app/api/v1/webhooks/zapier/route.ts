import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'

// Webhook event types that Zapier can subscribe to
export const WEBHOOK_EVENTS = {
  'meeting.created': 'When a new meeting is created',
  'meeting.completed': 'When a meeting transcription is completed',
  'meeting.failed': 'When a meeting transcription fails',
  'action_items.created': 'When action items are extracted',
  'summary.generated': 'When a meeting summary is generated',
  'organization.created': 'When a new organization is created',
  'user.created': 'When a new user signs up',
  'user.mentioned': 'When a user is mentioned in a meeting',
} as const

// Validation schemas
const subscribeSchema = z.object({
  url: z.string().url(),
  event: z.enum(Object.keys(WEBHOOK_EVENTS) as [keyof typeof WEBHOOK_EVENTS]),
  organizationId: z.string().uuid().optional(),
  secret: z.string().optional(),
})

const unsubscribeSchema = z.object({
  url: z.string().url(),
})

// GET: List available webhook events (for Zapier trigger configuration)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const event = searchParams.get('event')
    
    // If specific event requested, return sample data
    if (event) {
      const sampleData = getSampleData(event as keyof typeof WEBHOOK_EVENTS)
      return NextResponse.json(sampleData)
    }
    
    // Return list of available events
    return NextResponse.json({
      events: Object.entries(WEBHOOK_EVENTS).map(([key, description]) => ({
        key,
        description,
        sample: getSampleData(key as keyof typeof WEBHOOK_EVENTS)
      }))
    })
  } catch (error) {
    console.error('Webhook GET error:', error)
    return NextResponse.json({ error: 'Failed to get webhook info' }, { status: 500 })
  }
}

// POST: Subscribe to webhook (called by Zapier)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const validatedData = subscribeSchema.parse(body)
    
    // Generate webhook secret if not provided
    const webhookSecret = validatedData.secret || crypto.randomBytes(32).toString('hex')
    
    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()
    
    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: 'Only organization owners can create webhooks' }, { status: 403 })
    }
    
    // Create webhook subscription
    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert({
        organization_id: validatedData.organizationId || member.organization_id,
        name: `Zapier - ${validatedData.event}`,
        type: 'zapier',
        webhook_url: validatedData.url,
        secret: webhookSecret,
        events: [validatedData.event],
        is_active: true,
        settings: {
          source: 'zapier',
          event: validatedData.event,
        }
      })
      .select()
      .single()
    
    if (error) {
      console.error('Webhook creation error:', error)
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
    }
    
    // Return webhook details
    return NextResponse.json({
      id: webhook.id,
      url: validatedData.url,
      event: validatedData.event,
      secret: webhookSecret,
      created: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    
    console.error('Webhook subscription error:', error)
    return NextResponse.json({ error: 'Failed to subscribe webhook' }, { status: 500 })
  }
}

// DELETE: Unsubscribe webhook (called by Zapier)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const validatedData = unsubscribeSchema.parse(body)
    
    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()
    
    if (!member) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Delete webhook subscription
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('webhook_url', validatedData.url)
      .eq('organization_id', member.organization_id)
      .eq('type', 'zapier')
    
    if (error) {
      console.error('Webhook deletion error:', error)
      return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    
    console.error('Webhook unsubscribe error:', error)
    return NextResponse.json({ error: 'Failed to unsubscribe webhook' }, { status: 500 })
  }
}

// Helper function to get sample data for each event type
function getSampleData(event: keyof typeof WEBHOOK_EVENTS) {
  const samples = {
    'meeting.created': {
      id: 'meet_123456',
      title: 'Q4 Planning Meeting',
      organizationId: 'org_123456',
      createdBy: 'user_123456',
      createdAt: '2024-01-15T10:00:00Z',
      source: 'upload',
      duration: null,
      status: 'processing'
    },
    'meeting.completed': {
      id: 'meet_123456',
      title: 'Q4 Planning Meeting',
      organizationId: 'org_123456',
      duration: 3600,
      wordCount: 5420,
      speakerCount: 4,
      transcriptUrl: 'https://app.hangjegyzet.ai/meetings/meet_123456',
      summary: 'The team discussed Q4 objectives including...',
      completedAt: '2024-01-15T11:00:00Z'
    },
    'meeting.failed': {
      id: 'meet_123456',
      title: 'Q4 Planning Meeting',
      organizationId: 'org_123456',
      error: 'Audio quality too low for transcription',
      failedAt: '2024-01-15T10:30:00Z'
    },
    'action_items.created': {
      meetingId: 'meet_123456',
      meetingTitle: 'Q4 Planning Meeting',
      organizationId: 'org_123456',
      actionItems: [
        {
          id: 'action_123',
          task: 'Review Q3 financial reports',
          assignee: 'John Doe',
          dueDate: '2024-01-20',
          priority: 'high'
        },
        {
          id: 'action_124',
          task: 'Schedule follow-up with marketing team',
          assignee: 'Jane Smith',
          dueDate: '2024-01-18',
          priority: 'medium'
        }
      ],
      createdAt: '2024-01-15T11:05:00Z'
    },
    'summary.generated': {
      meetingId: 'meet_123456',
      meetingTitle: 'Q4 Planning Meeting',
      organizationId: 'org_123456',
      summary: {
        overview: 'The team met to discuss Q4 objectives and strategy...',
        keyPoints: [
          'Budget allocation for new initiatives',
          'Timeline for product launch',
          'Resource planning for Q4'
        ],
        decisions: [
          'Approved $50k budget for marketing campaign',
          'Set product launch date for November 15'
        ],
        nextSteps: [
          'Finance team to prepare detailed budget by Jan 20',
          'Product team to finalize launch checklist'
        ]
      },
      generatedAt: '2024-01-15T11:10:00Z'
    },
    'organization.created': {
      id: 'org_789012',
      name: 'Acme Corporation',
      slug: 'acme-corp',
      ownerId: 'user_123456',
      subscriptionTier: 'professional',
      createdAt: '2024-01-15T09:00:00Z'
    },
    'user.created': {
      id: 'user_789012',
      email: 'newuser@example.com',
      fullName: 'New User',
      organizationId: 'org_123456',
      role: 'member',
      createdAt: '2024-01-15T09:30:00Z'
    },
    'user.mentioned': {
      meetingId: 'meet_123456',
      meetingTitle: 'Q4 Planning Meeting',
      organizationId: 'org_123456',
      mentionedUserId: 'user_789012',
      mentionedUserEmail: 'john@example.com',
      context: 'John will handle the marketing campaign coordination',
      timestamp: '2024-01-15T10:45:00Z'
    }
  }
  
  return samples[event] || {}
}