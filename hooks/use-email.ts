import { EmailService } from '@/lib/email/email-service'
import { toast } from 'sonner'

export function useEmail() {
  const emailService = new EmailService()

  const sendWelcomeEmail = async (user: { email: string; name: string }) => {
    try {
      const result = await emailService.sendWelcomeEmail(user)
      if (result.status === 'sent' || result.status === 'delivered') {
        console.log('Welcome email sent successfully')
      } else {
        console.error('Failed to send welcome email:', result.error)
      }
    } catch (error) {
      console.error('Error sending welcome email:', error)
    }
  }

  const sendTranscriptionCompleteEmail = async (data: {
    userEmail: string
    userName: string
    meetingId: string
    meetingTitle: string
    duration: string
    language: string
    transcriptionMode: string
    processingTime: string
    summary?: string
    keyPoints?: string[]
    speakers?: { name: string; duration: string }[]
    wordCount?: number
    sentenceCount?: number
    paragraphCount?: number
  }) => {
    try {
      const result = await emailService.sendTranscriptionCompleteEmail(data)
      if (result.status === 'sent' || result.status === 'delivered') {
        console.log('Transcription complete email sent successfully')
      } else {
        console.error('Failed to send transcription complete email:', result.error)
      }
    } catch (error) {
      console.error('Error sending transcription complete email:', error)
    }
  }

  const queuePaymentReceipt = async (data: any) => {
    try {
      const queueId = await emailService.queue({
        to: data.userEmail,
        template: 'payment-receipt',
        variables: data
      }, {
        priority: 8 // High priority for payment receipts
      })
      console.log('Payment receipt queued:', queueId)
    } catch (error) {
      console.error('Error queuing payment receipt:', error)
    }
  }

  const sendTeamInvitation = async (data: {
    inviteeEmail: string
    inviteeName: string
    inviterName: string
    teamName: string
    teamId: string
    invitationToken: string
    role: string
    expiryDate: string
    message?: string
    hasAccount: boolean
  }) => {
    try {
      const result = await emailService.sendTeamInvitation(data)
      if (result.status === 'sent' || result.status === 'delivered') {
        toast.success('Meghívó sikeresen elküldve')
      } else {
        toast.error('Hiba történt a meghívó küldése során')
      }
    } catch (error) {
      toast.error('Hiba történt a meghívó küldése során')
    }
  }

  return {
    sendWelcomeEmail,
    sendTranscriptionCompleteEmail,
    queuePaymentReceipt,
    sendTeamInvitation
  }
}