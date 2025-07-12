import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email/sendgrid'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type = 'welcome', email } = body
    
    const targetEmail = email || user.email
    if (!targetEmail) {
      return NextResponse.json(
        { error: 'No email address provided' },
        { status: 400 }
      )
    }

    switch (type) {
      case 'welcome':
        await emailService.sendWelcomeEmail({
          email: targetEmail,
          name: user.user_metadata?.name || 'Felhasználó'
        })
        break
        
      case 'meeting-completed':
        await emailService.sendMeetingCompletedEmail(
          targetEmail,
          {
            id: 'test-meeting-id',
            title: 'Teszt Meeting - Email Ellenőrzés',
            duration: 3600, // 1 hour in seconds
            wordCount: 5432,
            transcriptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/meetings/test-meeting-id`,
            summary: 'Ez egy teszt meeting összefoglaló az email működésének ellenőrzésére. A valódi meetingek esetén itt jelenik meg az AI által generált összefoglaló.',
            keyPoints: [
              'Email értesítések sikeresen beállítva',
              'SendGrid integráció működik',
              'Meeting befejezési értesítések aktívak'
            ],
            actionItems: [
              { task: 'Email sablon véglegesítése', assignee: 'Fejlesztő csapat' },
              { task: 'Értesítési beállítások tesztelése', assignee: 'QA csapat' },
              { task: 'Dokumentáció frissítése' }
            ]
          }
        )
        break
        
      case 'meeting-summary':
        await emailService.sendMeetingSummaryEmail(
          targetEmail,
          {
            title: 'Heti Csapat Meeting',
            date: new Date(),
            duration: 2700, // 45 minutes
            summaryUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/meetings/test-summary-id`,
            keyPoints: [
              'Q4 célok áttekintése',
              'Új projekt indítása jövő héten',
              'Budget átcsoportosítás szükséges'
            ],
            actionItems: [
              'Projekt terv elkészítése',
              'Stakeholder meeting időpont egyeztetése',
              'Risk assessment dokumentum'
            ],
            participants: ['János', 'Eszter', 'Péter', 'Anna']
          }
        )
        break
        
      case 'usage-warning':
        // Get user's organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id, organizations(name, subscription_plan)')
          .eq('id', user.id)
          .single()
          
        await emailService.sendUsageLimitWarningEmail(
          targetEmail,
          850,
          1000,
          profile?.organizations?.subscription_plan || 'Professional'
        )
        break
        
      case 'password-reset':
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=test-token`
        await emailService.sendPasswordResetEmail(targetEmail, resetUrl)
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Test ${type} email sent to ${targetEmail}`
    })
    
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email test endpoint',
    usage: 'POST with { type: "welcome" | "meeting-completed" | "meeting-summary" | "usage-warning" | "password-reset", email?: "optional@email.com" }',
    types: {
      welcome: 'Welcome email for new users',
      'meeting-completed': 'Meeting processing completed notification',
      'meeting-summary': 'Meeting summary with key points and action items',
      'usage-warning': 'Usage limit warning notification',
      'password-reset': 'Password reset email'
    }
  })
}