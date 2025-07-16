import sgMail from '@sendgrid/mail'
import { renderAsync } from '@react-email/components'
import * as React from 'react'

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY
if (apiKey) {
  sgMail.setApiKey(apiKey)
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  attachments?: Array<{
    content: string
    filename: string
    type?: string
    disposition?: string
  }>
}

export class EmailService {
  private static instance: EmailService
  private fromEmail: string
  private fromName: string

  private constructor() {
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@hangjegyzet.ai'
    this.fromName = process.env.SENDGRID_FROM_NAME || 'HangJegyzet'
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!apiKey) {
      console.error('SendGrid API key not configured')
      throw new Error('Email service not configured')
    }

    try {
      const msg = {
        to: options.to,
        from: {
          email: options.from || this.fromEmail,
          name: this.fromName,
        },
        subject: options.subject,
        text: options.text || '',
        html: options.html || '',
        replyTo: options.replyTo,
        attachments: options.attachments,
      }

      await sgMail.send(msg)
      console.log('Email sent successfully to:', options.to)
    } catch (error) {
      console.error('Failed to send email:', error)
      throw error
    }
  }

  async sendReactEmail(
    to: string | string[],
    subject: string,
    reactElement: React.ReactElement,
    options?: Partial<EmailOptions>
  ): Promise<void> {
    try {
      const html = await renderAsync(reactElement)
      const text = await renderAsync(reactElement, { plainText: true })

      await this.sendEmail({
        to,
        subject,
        html,
        text,
        ...options,
      })
    } catch (error) {
      console.error('Failed to render and send React email:', error)
      throw error
    }
  }

  // Common email sending methods
  async sendWelcomeEmail(user: { email: string; name?: string }): Promise<void> {
    const WelcomeEmail = (await import('@/emails/welcome')).default
    
    await this.sendReactEmail(
      user.email,
      'Üdvözöljük a HangJegyzetben! 🎉',
      React.createElement(WelcomeEmail, {
        userEmail: user.email,
        userName: user.name
      })
    )
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Jelszó visszaállítás - HangJegyzet',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Jelszó visszaállítás</h2>
          <p>Kérést kaptunk a jelszava visszaállítására.</p>
          <p>Az új jelszó beállításához kattintson az alábbi linkre:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Új jelszó beállítása
          </a>
          <p>A link 1 órán belül lejár biztonsági okokból.</p>
          <p>Ha nem Ön kérte a jelszó visszaállítást, hagyja figyelmen kívül ezt az emailt.</p>
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e5e5;">
          <p style="color: #666; font-size: 14px;">
            HangJegyzet - AI-alapú meeting jegyzetelés<br>
            <a href="https://hangjegyzet.ai" style="color: #2563eb;">hangjegyzet.ai</a>
          </p>
        </div>
      `,
      text: `
        Jelszó visszaállítás

        Kérést kaptunk a jelszava visszaállítására.
        
        Az új jelszó beállításához látogasson el erre a linkre:
        ${resetUrl}
        
        A link 1 órán belül lejár biztonsági okokból.
        
        Ha nem Ön kérte a jelszó visszaállítást, hagyja figyelmen kívül ezt az emailt.
        
        HangJegyzet - AI-alapú meeting jegyzetelés
        https://hangjegyzet.ai
      `,
    })
  }

  async sendMeetingSummaryEmail(
    to: string | string[],
    meeting: {
      title: string
      date: Date
      duration: number
      summaryUrl: string
      keyPoints?: string[]
      actionItems?: string[]
      participants?: string[]
    }
  ): Promise<void> {
    const MeetingSummaryEmail = (await import('@/emails/meeting-summary')).default
    
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    }
    
    const formatDuration = (seconds: number) => {
      const minutes = Math.round(seconds / 60)
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      if (hours > 0) {
        return `${hours} óra ${mins} perc`
      }
      return `${mins} perc`
    }
    
    await this.sendReactEmail(
      to,
      `Meeting összefoglaló: ${meeting.title}`,
      React.createElement(MeetingSummaryEmail, {
        userName: "",
        meetingTitle: meeting.title,
        meetingDate: formatDate(meeting.date),
        duration: formatDuration(meeting.duration),
        participants: meeting.participants || [],
        keyPoints: meeting.keyPoints || [],
        actionItems: meeting.actionItems?.map(item => 
          typeof item === 'string' ? { text: item } : item
        ) || [],
        meetingUrl: meeting.summaryUrl
      })
    )
  }

  async sendTeamInviteEmail(
    email: string,
    inviter: string,
    teamName: string,
    inviteUrl: string
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `${inviter} meghívta Önt a ${teamName} csapatba`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Csapat meghívó</h2>
          <p><strong>${inviter}</strong> meghívta Önt, hogy csatlakozzon a <strong>${teamName}</strong> csapathoz a HangJegyzet platformon.</p>
          <p>A meghívó elfogadásához kattintson az alábbi gombra:</p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Meghívó elfogadása
          </a>
          <p>A HangJegyzet segítségével közösen dolgozhatnak meeting jegyzeteken és átírásokon.</p>
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e5e5;">
          <p style="color: #666; font-size: 14px;">
            HangJegyzet - AI-alapú meeting jegyzetelés<br>
            <a href="https://hangjegyzet.ai" style="color: #2563eb;">hangjegyzet.ai</a>
          </p>
        </div>
      `,
    })
  }

  async sendUsageLimitWarningEmail(
    email: string,
    usage: number,
    limit: number,
    planName: string
  ): Promise<void> {
    const percentage = Math.round((usage / limit) * 100)
    
    await this.sendEmail({
      to: email,
      subject: `Figyelmeztetés: ${percentage}%-os kreditfelhasználás`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Kreditfelhasználási figyelmeztetés</h2>
          <p>Értesítjük, hogy elérte havi kreditkeretének <strong>${percentage}%-át</strong>.</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Jelenlegi csomag:</strong> ${planName}</p>
            <p style="margin: 8px 0 0;"><strong>Felhasznált kredit:</strong> ${usage} / ${limit}</p>
          </div>
          <p>Ha kifogy a kreditjeiből, nem tud majd új meetingeket feldolgozni a következő számlázási ciklusig.</p>
          <p>Javasoljuk, hogy:</p>
          <ul>
            <li>Váltson magasabb csomagra több kredit megszerzéséhez</li>
            <li>Vásároljon extra krediteket az aktuális hónapra</li>
          </ul>
          <a href="https://hangjegyzet.ai/dashboard/settings/billing" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Csomag frissítése
          </a>
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e5e5;">
          <p style="color: #666; font-size: 14px;">
            HangJegyzet - AI-alapú meeting jegyzetelés<br>
            <a href="https://hangjegyzet.ai" style="color: #2563eb;">hangjegyzet.ai</a>
          </p>
        </div>
      `,
    })
  }

  async sendMeetingCompletedEmail(
    email: string,
    meeting: {
      id: string
      title: string
      duration: number
      wordCount: number
      transcriptUrl: string
      summary?: string
      keyPoints?: string[]
      actionItems?: Array<{ task: string; assignee?: string }>
    }
  ): Promise<void> {
    const durationMinutes = Math.round(meeting.duration / 60)
    
    await this.sendEmail({
      to: email,
      subject: `✅ Meeting feldolgozva: ${meeting.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Meeting sikeresen feldolgozva!</h2>
          <p>Az Ön <strong>${meeting.title}</strong> meetingje sikeresen fel lett dolgozva.</p>
          
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Időtartam:</strong> ${durationMinutes} perc</p>
            <p style="margin: 8px 0 0;"><strong>Szavak száma:</strong> ${meeting.wordCount.toLocaleString('hu-HU')}</p>
          </div>

          ${meeting.summary ? `
            <h3>Összefoglaló</h3>
            <p>${meeting.summary}</p>
          ` : ''}

          ${meeting.keyPoints && meeting.keyPoints.length > 0 ? `
            <h3>Főbb pontok</h3>
            <ul>
              ${meeting.keyPoints.map(point => `<li>${point}</li>`).join('')}
            </ul>
          ` : ''}

          ${meeting.actionItems && meeting.actionItems.length > 0 ? `
            <h3>Teendők</h3>
            <ul>
              ${meeting.actionItems.map(item => 
                `<li>${item.task}${item.assignee ? ` - ${item.assignee}` : ''}</li>`
              ).join('')}
            </ul>
          ` : ''}

          <a href="${meeting.transcriptUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Átírás megtekintése
          </a>

          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e5e5;">
          <p style="color: #666; font-size: 14px;">
            HangJegyzet - AI-alapú meeting jegyzetelés<br>
            <a href="https://hangjegyzet.ai" style="color: #2563eb;">hangjegyzet.ai</a>
          </p>
        </div>
      `,
      text: `
        Meeting sikeresen feldolgozva!
        
        Az Ön "${meeting.title}" meetingje sikeresen fel lett dolgozva.
        
        Időtartam: ${durationMinutes} perc
        Szavak száma: ${meeting.wordCount.toLocaleString('hu-HU')}
        
        ${meeting.summary ? `Összefoglaló:\n${meeting.summary}\n\n` : ''}
        
        Az átírás megtekintéséhez látogasson el ide:
        ${meeting.transcriptUrl}
        
        HangJegyzet - AI-alapú meeting jegyzetelés
        https://hangjegyzet.ai
      `,
    })
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance()