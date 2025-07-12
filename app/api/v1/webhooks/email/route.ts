import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processTranscriptionJob } from '@/lib/jobs/transcription-processor'
import { createHash } from 'crypto'

/**
 * POST /api/v1/webhooks/email - Process email attachments
 * 
 * This webhook is designed to work with email forwarding services
 * like SendGrid Inbound Parse or AWS SES
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-webhook-signature')
    if (!signature || !verifyWebhookSignature(request, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }
    
    // Parse email data
    const formData = await request.formData()
    const from = formData.get('from') as string
    const subject = formData.get('subject') as string
    const text = formData.get('text') as string
    const attachments = formData.getAll('attachments') as File[]
    
    if (!from || attachments.length === 0) {
      return NextResponse.json(
        { error: 'No attachments found' },
        { status: 400 }
      )
    }
    
    // Find organization by email domain
    const emailDomain = from.split('@')[1]
    const supabase = await createClient()
    
    // Check if email is authorized
    const { data: emailAuth } = await supabase
      .from('email_integrations')
      .select('organization_id, allowed_senders')
      .eq('domain', emailDomain)
      .eq('is_active', true)
      .single()
    
    if (!emailAuth) {
      return NextResponse.json(
        { error: 'Email domain not authorized' },
        { status: 403 }
      )
    }
    
    // Check if sender is allowed
    if (emailAuth.allowed_senders && !emailAuth.allowed_senders.includes(from)) {
      return NextResponse.json(
        { error: 'Sender not authorized' },
        { status: 403 }
      )
    }
    
    // Process each audio/video attachment
    const processedFiles = []
    
    for (const attachment of attachments) {
      if (!isAudioVideoFile(attachment.type)) {
        continue
      }
      
      // Upload to storage
      const fileName = `email-attachments/${Date.now()}-${attachment.name}`
      const { data: upload, error: uploadError } = await supabase.storage
        .from('meetings')
        .upload(fileName, attachment)
      
      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('meetings')
        .getPublicUrl(fileName)
      
      // Create meeting record
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          organization_id: emailAuth.organization_id,
          title: subject || `Email from ${from}`,
          status: 'processing',
          metadata: {
            source: 'email',
            sender: from,
            emailSubject: subject,
            emailBody: text?.substring(0, 500),
            fileName: attachment.name
          }
        })
        .select()
        .single()
      
      if (meetingError) {
        console.error('Meeting creation error:', meetingError)
        continue
      }
      
      // Queue transcription
      processTranscriptionJob({
        meetingId: meeting.id,
        fileUrl: publicUrl,
        organizationId: emailAuth.organization_id,
        options: {
          language: detectLanguage(text || subject || '')
        }
      }).catch(console.error)
      
      processedFiles.push({
        meetingId: meeting.id,
        fileName: attachment.name
      })
    }
    
    if (processedFiles.length === 0) {
      return NextResponse.json(
        { error: 'No valid audio/video attachments found' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      message: 'Email processed successfully',
      processed: processedFiles.length,
      meetings: processedFiles
    })
  } catch (error) {
    console.error('Email webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(request: NextRequest, signature: string): boolean {
  // In production, implement proper signature verification
  // based on your email service provider
  const secret = process.env.EMAIL_WEBHOOK_SECRET || ''
  if (!secret) return false
  
  // Example implementation for HMAC verification
  const payload = request.headers.get('x-webhook-payload') || ''
  const expectedSignature = createHash('sha256')
    .update(secret + payload)
    .digest('hex')
  
  return signature === expectedSignature
}

/**
 * Check if file is audio/video
 */
function isAudioVideoFile(mimeType: string): boolean {
  const allowedTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo'
  ]
  return allowedTypes.includes(mimeType)
}

/**
 * Simple language detection
 */
function detectLanguage(text: string): string {
  // Simple Hungarian detection
  const hungarianWords = ['és', 'vagy', 'hogy', 'nem', 'az', 'ez', 'egy']
  const words = text.toLowerCase().split(/\s+/)
  const hungarianCount = words.filter(word => hungarianWords.includes(word)).length
  
  return hungarianCount > 2 ? 'hu' : 'en'
}