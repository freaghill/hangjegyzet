import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { notificationManager } from '@/lib/notifications/manager'

interface MentionPayload {
  type: 'INSERT'
  table: 'annotation_mentions'
  record: {
    id: string
    annotation_id?: string
    thread_id?: string
    mentioned_user_id: string
    mentioned_by_user_id: string
    notified: boolean
    created_at: string
  }
  schema: 'public'
}

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const expectedSignature = hmac.digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(request: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('SUPABASE_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    // Verify webhook signature
    const signature = headers().get('x-webhook-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    const body = await request.text()
    const isValid = verifyWebhookSignature(body, signature, webhookSecret)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse payload
    const payload: MentionPayload = JSON.parse(body)
    
    if (payload.type !== 'INSERT' || payload.table !== 'annotation_mentions') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const mention = payload.record
    const supabase = await createClient()

    // Get mentioned user details
    const { data: mentionedUser } = await supabase
      .from('profiles')
      .select('name, organization_id')
      .eq('id', mention.mentioned_user_id)
      .single()

    // Get mentioning user details
    const { data: mentioningUser } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', mention.mentioned_by_user_id)
      .single()

    // Get context (annotation or thread)
    let context = ''
    let meetingTitle = ''
    let meetingId = ''
    let timestamp = ''
    
    if (mention.annotation_id) {
      const { data: annotation } = await supabase
        .from('annotations')
        .select(`
          content,
          timestamp_seconds,
          meeting_id,
          meetings (
            title
          )
        `)
        .eq('id', mention.annotation_id)
        .single()
      
      if (annotation) {
        context = annotation.content.substring(0, 200)
        meetingTitle = annotation.meetings?.title || 'Ismeretlen meeting'
        meetingId = annotation.meeting_id
        timestamp = annotation.timestamp_seconds?.toString() || '0'
      }
    } else if (mention.thread_id) {
      const { data: thread } = await supabase
        .from('annotation_threads')
        .select(`
          content,
          annotations (
            timestamp_seconds,
            meeting_id,
            meetings (
              title
            )
          )
        `)
        .eq('id', mention.thread_id)
        .single()
      
      if (thread) {
        context = thread.content.substring(0, 200)
        meetingTitle = thread.annotations?.meetings?.title || 'Ismeretlen meeting'
        meetingId = thread.annotations?.meeting_id || ''
        timestamp = thread.annotations?.timestamp_seconds?.toString() || '0'
      }
    }

    // Get mentioned user's email
    const { data: { user: mentionedAuthUser } } = await supabase.auth.admin.getUserById(
      mention.mentioned_user_id
    )

    if (!mentionedAuthUser?.email) {
      console.error('Mentioned user email not found')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Send email notification using the existing email webhook
    const emailPayload = {
      to: mentionedAuthUser.email,
      subject: `${mentioningUser?.name || 'Valaki'} megemlített téged - ${meetingTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Új említés a HangJegyzet alkalmazásban</h2>
          <p><strong>${mentioningUser?.name || 'Valaki'}</strong> megemlített téged egy meeting jegyzetben:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666;">Meeting: ${meetingTitle}</p>
            <p style="margin: 10px 0 0 0;">${context}</p>
          </div>
          
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/meetings/${mention.annotation_id ? 'annotation' : 'thread'}/${mention.annotation_id || mention.thread_id}" 
               style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Megtekintés
            </a>
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Ez egy automatikus értesítés a HangJegyzet alkalmazásból.
          </p>
        </div>
      `,
      text: `${mentioningUser?.name || 'Valaki'} megemlített téged a következő meetingben: ${meetingTitle}\n\n${context}\n\nMegtekintés: ${process.env.NEXT_PUBLIC_APP_URL}/meetings/${mention.annotation_id ? 'annotation' : 'thread'}/${mention.annotation_id || mention.thread_id}`
    }

    // Send email via the existing email webhook
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/webhooks/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_WEBHOOK_SECRET}`
      },
      body: JSON.stringify(emailPayload)
    })

    if (!emailResponse.ok) {
      console.error('Failed to send email notification')
      // Don't fail the webhook, just log the error
    }

    // Send Slack/Teams notification
    if (mentionedUser?.organization_id && meetingId) {
      try {
        await notificationManager.sendNotification({
          eventType: 'user_mentioned',
          organizationId: mentionedUser.organization_id,
          meetingId: meetingId,
          data: {
            meetingTitle,
            meetingId,
            mentionedBy: mentioningUser?.name || 'Ismeretlen felhasználó',
            context,
            timestamp,
            mentionedUser: mentionedUser.name || mention.mentioned_user_id
          }
        })
      } catch (notificationError) {
        console.error('Failed to send Slack/Teams notification:', notificationError)
        // Don't fail the webhook if notification fails
      }
    }

    // Mark mention as notified
    await supabase
      .from('annotation_mentions')
      .update({ notified: true })
      .eq('id', mention.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}