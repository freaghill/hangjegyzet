import { WebClient } from '@slack/web-api'
import { createClient } from '@/lib/supabase/server'

export interface SlackMessage {
  channel: string
  text?: string
  blocks?: any[]
  attachments?: any[]
  thread_ts?: string
}

export interface SlackMeetingSummary {
  meetingId: string
  title: string
  summary: string
  keyPoints: string[]
  actionItems: Array<{
    text: string
    assignee?: string
    priority: string
    deadline?: string
  }>
  duration: number
  participants: string[]
  link?: string
}

export class SlackService {
  private client: WebClient | null = null
  
  constructor(private accessToken?: string) {
    if (accessToken) {
      this.client = new WebClient(accessToken)
    }
  }
  
  /**
   * Initialize Slack client with user's token
   */
  async initialize(userId: string) {
    const supabase = await createClient()
    
    // Get user's Slack integration
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('access_token, metadata')
      .eq('user_id', userId)
      .eq('provider', 'slack')
      .single()
    
    if (integration?.access_token) {
      this.client = new WebClient(integration.access_token)
      return true
    }
    
    return false
  }
  
  /**
   * Get available Slack channels
   */
  async getChannels(): Promise<Array<{ id: string; name: string; is_private: boolean }>> {
    if (!this.client) throw new Error('Slack client not initialized')
    
    try {
      const result = await this.client.conversations.list({
        types: 'public_channel,private_channel'
      })
      
      return result.channels?.map(channel => ({
        id: channel.id!,
        name: channel.name!,
        is_private: channel.is_private || false
      })) || []
    } catch (error) {
      console.error('Error fetching Slack channels:', error)
      throw new Error('Failed to fetch Slack channels')
    }
  }
  
  /**
   * Send meeting summary to Slack
   */
  async sendMeetingSummary(channelId: string, summary: SlackMeetingSummary) {
    if (!this.client) throw new Error('Slack client not initialized')
    
    const blocks = this.createMeetingSummaryBlocks(summary)
    
    try {
      const result = await this.client.chat.postMessage({
        channel: channelId,
        text: `Meeting összefoglaló: ${summary.title}`,
        blocks,
        unfurl_links: false,
        unfurl_media: false
      })
      
      return result.ts // Return message timestamp for threading
    } catch (error) {
      console.error('Error sending Slack message:', error)
      throw new Error('Failed to send Slack message')
    }
  }
  
  /**
   * Send action items to Slack
   */
  async sendActionItems(
    channelId: string, 
    meetingTitle: string,
    actionItems: SlackMeetingSummary['actionItems'],
    threadTs?: string
  ) {
    if (!this.client) throw new Error('Slack client not initialized')
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📋 Akció pontok'
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Meeting:* ${meetingTitle}`
          }
        ]
      },
      {
        type: 'divider'
      }
    ]
    
    // Add action items
    actionItems.forEach((item, index) => {
      const priorityEmoji = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢'
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${priorityEmoji} *${index + 1}. ${item.text}*\n${
            item.assignee ? `👤 *Felelős:* ${item.assignee}\n` : ''
          }${
            item.deadline ? `📅 *Határidő:* ${item.deadline}` : ''
          }`
        }
      })
    })
    
    try {
      const result = await this.client.chat.postMessage({
        channel: channelId,
        text: `Akció pontok - ${meetingTitle}`,
        blocks,
        thread_ts: threadTs
      })
      
      return result.ts
    } catch (error) {
      console.error('Error sending action items:', error)
      throw new Error('Failed to send action items to Slack')
    }
  }
  
  /**
   * Create notification for upcoming meeting
   */
  async sendMeetingReminder(
    channelId: string,
    meeting: {
      title: string
      startTime: Date
      participants: string[]
      meetingLink?: string
    }
  ) {
    if (!this.client) throw new Error('Slack client not initialized')
    
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🔔 *Közelgő meeting emlékeztető*\n\n*${meeting.title}*`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Időpont:*\n${meeting.startTime.toLocaleString('hu-HU')}`
          },
          {
            type: 'mrkdwn',
            text: `*Résztvevők:*\n${meeting.participants.join(', ')}`
          }
        ]
      }
    ]
    
    if (meeting.meetingLink) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${meeting.meetingLink}|Csatlakozás a meetinghez>`
        }
      })
    }
    
    try {
      await this.client.chat.postMessage({
        channel: channelId,
        text: `Meeting emlékeztető: ${meeting.title}`,
        blocks
      })
    } catch (error) {
      console.error('Error sending meeting reminder:', error)
      throw new Error('Failed to send meeting reminder')
    }
  }
  
  /**
   * Create blocks for meeting summary
   */
  private createMeetingSummaryBlocks(summary: SlackMeetingSummary) {
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: summary.title,
          emoji: true
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `⏱️ *Időtartam:* ${Math.round(summary.duration / 60)} perc | 👥 *Résztvevők:* ${summary.participants.length}`
          }
        ]
      },
      {
        type: 'divider'
      }
    ]
    
    // Summary section
    if (summary.summary) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📝 Összefoglaló*\n${summary.summary}`
        }
      })
    }
    
    // Key points
    if (summary.keyPoints.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*💡 Főbb pontok*\n${summary.keyPoints.map(point => `• ${point}`).join('\n')}`
        }
      })
    }
    
    // Action items preview
    if (summary.actionItems.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*✅ Akció pontok (${summary.actionItems.length})*\n${
            summary.actionItems.slice(0, 3).map(item => `• ${item.text}`).join('\n')
          }${summary.actionItems.length > 3 ? '\n_...és további ' + (summary.actionItems.length - 3) + ' feladat_' : ''}`
        }
      })
    }
    
    // Link to full details
    if (summary.link) {
      blocks.push({
        type: 'divider'
      })
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Teljes jegyzőkönyv megtekintése'
            },
            url: summary.link,
            style: 'primary'
          }
        ]
      })
    }
    
    return blocks
  }
  
  /**
   * Test Slack connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) return false
    
    try {
      const result = await this.client.auth.test()
      return result.ok || false
    } catch (error) {
      console.error('Slack connection test failed:', error)
      return false
    }
  }
}

// OAuth configuration
export const slackOAuthConfig = {
  clientId: process.env.SLACK_CLIENT_ID!,
  clientSecret: process.env.SLACK_CLIENT_SECRET!,
  redirectUri: process.env.SLACK_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`,
  scopes: [
    'channels:read',
    'chat:write',
    'chat:write.public',
    'files:write',
    'groups:read',
    'users:read'
  ].join(',')
}

// Helper to generate OAuth URL
export function getSlackOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: slackOAuthConfig.clientId,
    scope: slackOAuthConfig.scopes,
    redirect_uri: slackOAuthConfig.redirectUri,
    state
  })
  
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`
}