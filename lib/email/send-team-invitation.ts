import { render } from '@react-email/render'
import { TeamInvitationEmail } from './templates/team-invitation'
import sgMail from '@sendgrid/mail'

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

interface SendTeamInvitationParams {
  to: string
  teamName: string
  inviterName: string
  inviterEmail: string
  role: string
  inviteUrl: string
  message?: string
  expiresAt: string
}

export async function sendTeamInvitation({
  to,
  teamName,
  inviterName,
  inviterEmail,
  role,
  inviteUrl,
  message,
  expiresAt
}: SendTeamInvitationParams) {
  const emailHtml = render(
    TeamInvitationEmail({
      inviteUrl,
      teamName,
      inviterName,
      inviterEmail,
      recipientEmail: to,
      role,
      message,
      expiresAt
    })
  )

  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@hangjegyzet.hu',
    subject: `Meghívó a ${teamName} csapatba`,
    html: emailHtml,
  }

  try {
    if (process.env.SENDGRID_API_KEY) {
      await sgMail.send(msg)
    } else {
      console.log('Email would be sent:', msg)
    }
  } catch (error) {
    console.error('Error sending team invitation email:', error)
    throw error
  }
}