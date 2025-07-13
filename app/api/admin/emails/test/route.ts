import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email/email-service'
import { EmailTemplateType } from '@/lib/email/types'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Check admin permission
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: request.headers.get('Authorization')! }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Check if user has admin role
    
    const { template, variables, to } = await request.json()

    // Add test prefix to subject
    const testVariables = {
      ...variables,
      subject: `[TESZT] ${variables.subject || ''}`
    }

    const emailService = new EmailService()
    const result = await emailService.send({
      to,
      template: template as EmailTemplateType,
      variables: testVariables,
      metadata: {
        isTest: true,
        sentBy: user.email
      }
    })

    return NextResponse.json({ 
      success: true, 
      messageId: result.messageId,
      status: result.status 
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    )
  }
}