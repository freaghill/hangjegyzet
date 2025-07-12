import Imap from 'node-imap'
import { simpleParser } from 'mailparser'
import { createClient } from '@/lib/supabase/admin'
import { Queue } from 'bullmq'
import { redisClients } from '@/lib/cache/redis-sentinel'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { nanoid } from 'nanoid'

interface EmailConfig {
  user: string
  password: string
  host: string
  port: number
  tls: boolean
  organizationId: string
  allowedSenders?: string[]
  autoDelete?: boolean
}

export class EmailMonitor {
  private imap: Imap
  private config: EmailConfig
  private importQueue: Queue
  private supabase = createClient()
  private isRunning = false

  constructor(config: EmailConfig) {
    this.config = config
    
    this.imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls,
      tlsOptions: { rejectUnauthorized: false },
    })

    this.importQueue = new Queue('import-processing', {
      connection: redisClients.queue,
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.imap.on('ready', () => {
      console.log('Email monitor connected')
      this.startMonitoring()
    })

    this.imap.on('error', (err: Error) => {
      console.error('IMAP error:', err)
    })

    this.imap.on('end', () => {
      console.log('Email monitor disconnected')
      this.isRunning = false
    })

    this.imap.on('mail', () => {
      console.log('New email detected')
      this.checkNewEmails()
    })
  }

  async connect() {
    if (!this.isRunning) {
      this.imap.connect()
      this.isRunning = true
    }
  }

  disconnect() {
    if (this.isRunning) {
      this.imap.end()
      this.isRunning = false
    }
  }

  private async startMonitoring() {
    this.imap.openBox('INBOX', false, (err) => {
      if (err) {
        console.error('Error opening inbox:', err)
        return
      }

      // Check for unread emails
      this.checkNewEmails()
    })
  }

  private async checkNewEmails() {
    const searchCriteria = ['UNSEEN']
    
    this.imap.search(searchCriteria, (err, uids) => {
      if (err) {
        console.error('Search error:', err)
        return
      }

      if (uids.length === 0) {
        return
      }

      const fetch = this.imap.fetch(uids, {
        bodies: '',
        markSeen: true,
      })

      fetch.on('message', (msg) => {
        msg.on('body', (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) {
              console.error('Parse error:', err)
              return
            }

            await this.processEmail(parsed)
          })
        })
      })

      fetch.on('error', (err) => {
        console.error('Fetch error:', err)
      })
    })
  }

  private async processEmail(email: any) {
    // Check if sender is allowed
    if (this.config.allowedSenders && this.config.allowedSenders.length > 0) {
      const senderEmail = email.from?.value[0]?.address
      if (!senderEmail || !this.config.allowedSenders.includes(senderEmail)) {
        console.log(`Ignoring email from unauthorized sender: ${senderEmail}`)
        return
      }
    }

    // Process attachments
    if (!email.attachments || email.attachments.length === 0) {
      return
    }

    const supportedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4',
      'audio/ogg', 'audio/webm', 'video/mp4', 'video/quicktime'
    ]

    for (const attachment of email.attachments) {
      if (!supportedTypes.includes(attachment.contentType)) {
        continue
      }

      try {
        await this.importAttachment(attachment, email)
      } catch (error) {
        console.error('Error importing attachment:', error)
      }
    }
  }

  private async importAttachment(attachment: any, email: any) {
    // Create upload directory
    const uploadDir = join(process.cwd(), 'uploads', this.config.organizationId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save attachment
    const fileId = nanoid()
    const fileName = `${fileId}_${attachment.filename}`
    const filePath = join(uploadDir, fileName)
    
    await writeFile(filePath, attachment.content)

    // Create meeting record
    const { data: meeting, error } = await this.supabase
      .from('meetings')
      .insert({
        organization_id: this.config.organizationId,
        title: email.subject || attachment.filename.replace(/\.[^/.]+$/, ''),
        description: `Imported from email: ${email.from?.text}`,
        created_by: this.config.user, // System user ID
        status: 'processing',
        processing_mode: 'balanced',
        file_path: filePath,
        file_size: attachment.size,
        metadata: {
          original_filename: attachment.filename,
          file_type: attachment.contentType,
          import_source: 'email',
          import_date: new Date().toISOString(),
          email_from: email.from?.text,
          email_subject: email.subject,
          email_date: email.date,
        },
      })
      .select()
      .single()

    if (error || !meeting) {
      console.error('Error creating meeting:', error)
      return
    }

    // Add to processing queue
    const isVideo = attachment.contentType.includes('video')
    
    if (isVideo) {
      await this.importQueue.add('extract-audio', {
        meetingId: meeting.id,
        videoPath: filePath,
        audioPath: filePath.replace(/\.[^/.]+$/, '.mp3'),
        organizationId: this.config.organizationId,
        userId: this.config.user,
      })
    } else {
      await this.importQueue.add('process-audio', {
        meetingId: meeting.id,
        audioPath: filePath,
        organizationId: this.config.organizationId,
        userId: this.config.user,
        language: 'hu',
        mode: 'balanced',
      })
    }

    console.log(`Imported ${attachment.filename} from email`)

    // Send notification
    await this.sendImportNotification(meeting.id, attachment.filename, email.from?.text)
  }

  private async sendImportNotification(meetingId: string, filename: string, sender: string) {
    // Create notification for organization admins
    const { data: admins } = await this.supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', this.config.organizationId)
      .in('role', ['admin', 'owner'])

    if (admins) {
      for (const admin of admins) {
        await this.supabase
          .from('notifications')
          .insert({
            user_id: admin.user_id,
            type: 'email_import',
            title: 'Új meeting importálva emailből',
            content: `${filename} importálva ${sender} feladótól`,
            metadata: {
              meeting_id: meetingId,
              sender,
              filename,
            },
          })
      }
    }
  }
}

// Factory function to create email monitors for organizations
export async function createEmailMonitor(organizationId: string): Promise<EmailMonitor | null> {
  const supabase = createClient()
  
  // Get email configuration for organization
  const { data: config, error } = await supabase
    .from('organization_email_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  if (error || !config) {
    return null
  }

  // Decrypt password (would use proper encryption in production)
  const decryptedPassword = config.encrypted_password // TODO: Decrypt

  return new EmailMonitor({
    user: config.email,
    password: decryptedPassword,
    host: config.imap_host,
    port: config.imap_port,
    tls: config.use_tls,
    organizationId,
    allowedSenders: config.allowed_senders,
    autoDelete: config.auto_delete,
  })
}