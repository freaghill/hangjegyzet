import { EmailData, EmailDeliveryStatus, EmailTemplateType } from './types'
import { SendGridService } from './sendgrid-service'
import { EmailQueueService } from './queue-service'
import { EmailTemplateService } from './template-service'

export class EmailService {
  private sendGridService: SendGridService
  private queueService: EmailQueueService
  private templateService: EmailTemplateService

  constructor() {
    this.sendGridService = new SendGridService()
    this.queueService = new EmailQueueService()
    this.templateService = new EmailTemplateService()
  }

  /**
   * Send an email immediately
   */
  async send(emailData: EmailData): Promise<EmailDeliveryStatus> {
    return this.sendGridService.send(emailData)
  }

  /**
   * Queue an email for later sending
   */
  async queue(emailData: EmailData, options?: {
    priority?: number
    scheduledAt?: Date
    maxAttempts?: number
  }): Promise<string> {
    return this.queueService.enqueue(emailData, options)
  }

  /**
   * Send a welcome email to a new user
   */
  async sendWelcomeEmail(user: {
    email: string
    name: string
  }): Promise<EmailDeliveryStatus> {
    return this.send({
      to: user.email,
      template: 'welcome',
      variables: {
        userName: user.name,
        userEmail: user.email,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@hangjegyzet.hu',
        docsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/docs`
      }
    })
  }

  /**
   * Send transcription complete notification
   */
  async sendTranscriptionCompleteEmail(data: {
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
  }): Promise<EmailDeliveryStatus> {
    return this.send({
      to: data.userEmail,
      template: 'transcription-complete',
      variables: {
        userName: data.userName,
        meetingTitle: data.meetingTitle,
        meetingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/meetings/${data.meetingId}`,
        duration: data.duration,
        language: data.language === 'hu' ? 'Magyar' : data.language === 'en' ? 'Angol' : data.language,
        transcriptionMode: 
          data.transcriptionMode === 'fast' ? 'Gyors' :
          data.transcriptionMode === 'balanced' ? 'Kiegyensúlyozott' :
          'Precíz',
        processingTime: data.processingTime,
        summary: data.summary,
        keyPoints: data.keyPoints,
        speakers: data.speakers,
        speakerCount: data.speakers?.length || 0,
        wordCount: data.wordCount,
        sentenceCount: data.sentenceCount,
        paragraphCount: data.paragraphCount
      }
    })
  }

  /**
   * Send payment receipt
   */
  async sendPaymentReceipt(data: {
    userEmail: string
    userName: string
    invoiceNumber: string
    invoiceDate: string
    invoiceUrl: string
    paymentMethod: string
    transactionId?: string
    items: Array<{
      name: string
      quantity: number
      unitPrice: number
      total: number
    }>
    discount?: number
    netAmount: number
    vatRate: number
    vatAmount: number
    totalAmount: number
    billingAddress?: {
      name: string
      taxNumber?: string
      address: string
      city: string
      postalCode: string
      country: string
    }
    subscription?: {
      planName: string
      period: string
      nextBillingDate: string
      features?: string[]
    }
  }): Promise<EmailDeliveryStatus> {
    return this.send({
      to: data.userEmail,
      template: 'payment-receipt',
      variables: data
    })
  }

  /**
   * Send team invitation
   */
  async sendTeamInvitation(data: {
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
  }): Promise<EmailDeliveryStatus> {
    const roleDisplay = 
      data.role === 'owner' ? 'tulajdonos' :
      data.role === 'admin' ? 'adminisztrátor' :
      data.role === 'member' ? 'tag' :
      'megtekintő'

    return this.send({
      to: data.inviteeEmail,
      template: 'team-invitation',
      variables: {
        inviteeName: data.inviteeName,
        inviterName: data.inviterName,
        teamName: data.teamName,
        role: roleDisplay,
        acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/teams/accept-invite?token=${data.invitationToken}`,
        expiryDate: data.expiryDate,
        message: data.message,
        isAdmin: data.role === 'admin' || data.role === 'owner',
        hasAccount: data.hasAccount
      }
    })
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(data: {
    userEmail: string
    userName: string
    resetToken: string
    ipAddress?: string
    userAgent?: string
  }): Promise<EmailDeliveryStatus> {
    return this.send({
      to: data.userEmail,
      template: 'password-reset',
      variables: {
        userName: data.userName,
        resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${data.resetToken}`,
        expiryHours: 24,
        ipAddress: data.ipAddress || 'Ismeretlen',
        userAgent: data.userAgent || 'Ismeretlen',
        requestTime: new Date().toLocaleString('hu-HU'),
        supportEmail: process.env.SUPPORT_EMAIL || 'support@hangjegyzet.hu'
      }
    })
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(data: {
    userEmail: string
    userName: string
    verificationToken: string
    verificationCode: string
  }): Promise<EmailDeliveryStatus> {
    return this.send({
      to: data.userEmail,
      template: 'email-verification',
      variables: {
        userName: data.userName,
        userEmail: data.userEmail,
        verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${data.verificationToken}`,
        verificationCode: data.verificationCode
      }
    })
  }

  /**
   * Get email delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<EmailDeliveryStatus | null> {
    return this.sendGridService.getDeliveryStatus(messageId)
  }

  /**
   * Get email statistics
   */
  async getEmailStats(days: number = 30): Promise<any> {
    return this.sendGridService.getEmailStats(days)
  }

  /**
   * Preview an email template
   */
  async previewTemplate(
    template: EmailTemplateType, 
    variables: Record<string, any>,
    language: string = 'hu'
  ): Promise<{
    subject: string
    htmlContent: string
    textContent: string
  }> {
    const emailTemplate = await this.templateService.getTemplate(template, language)
    return this.templateService.processTemplate(emailTemplate, variables)
  }

  /**
   * Validate template variables
   */
  validateTemplateVariables(
    template: EmailTemplateType,
    variables: Record<string, any>,
    language: string = 'hu'
  ): { valid: boolean; errors: string[] } {
    return this.templateService.validateVariables(template, variables, language)
  }

  /**
   * Start queue processing
   */
  startQueueProcessing(intervalMs?: number) {
    this.queueService.startProcessing(intervalMs)
  }

  /**
   * Stop queue processing
   */
  stopQueueProcessing() {
    this.queueService.stopProcessing()
  }

  /**
   * Get queue status
   */
  async getQueueStatus() {
    return this.queueService.getQueueStatus()
  }

  /**
   * Process SendGrid webhook
   */
  async processWebhook(body: any, signature: string): Promise<void> {
    return this.sendGridService.processWebhook(body, signature)
  }
}

// Create a singleton instance
let emailServiceInstance: EmailService | null = null

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService()
  }
  return emailServiceInstance
}

// Export sendEmail function for compatibility
export async function sendEmail(data: EmailData): Promise<EmailDeliveryStatus> {
  const service = getEmailService()
  return service.send(data)
}