import axios from 'axios'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'

export interface SlackMessage {
  text?: string
  blocks?: SlackBlock[]
  channel?: string
  username?: string
  icon_emoji?: string
  attachments?: SlackAttachment[]
}

export interface SlackBlock {
  type: 'section' | 'header' | 'divider' | 'context' | 'actions'
  text?: {
    type: 'mrkdwn' | 'plain_text'
    text: string
    emoji?: boolean
  }
  fields?: Array<{
    type: 'mrkdwn' | 'plain_text'
    text: string
  }>
  accessory?: {
    type: 'button'
    text: {
      type: 'plain_text'
      text: string
      emoji?: boolean
    }
    url: string
    style?: 'primary' | 'danger'
  }
  elements?: Array<{
    type: 'mrkdwn' | 'plain_text'
    text: string
  }>
}

export interface SlackAttachment {
  color?: string
  title?: string
  title_link?: string
  text?: string
  fields?: Array<{
    title: string
    value: string
    short?: boolean
  }>
  footer?: string
  footer_icon?: string
  ts?: number
}

export class SlackNotificationService {
  /**
   * Send a notification to Slack webhook
   */
  static async send(webhookUrl: string, message: SlackMessage): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post(webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      })

      return { success: response.status === 200 }
    } catch (error: any) {
      console.error('Slack notification error:', error.response?.data || error.message)
      return { 
        success: false, 
        error: error.response?.data || error.message || 'Failed to send notification'
      }
    }
  }

  /**
   * Test webhook connectivity
   */
  static async testWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
    const testMessage: SlackMessage = {
      text: 'HangJegyzet webhook teszt',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'HangJegyzet Webhook Teszt',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'A webhook sikeresen konfigurálva lett! Mostantól értesítéseket fogsz kapni a HangJegyzet alkalmazásból.'
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Teszt időpont: ${format(new Date(), 'yyyy. MMMM d. HH:mm', { locale: hu })}`
            }
          ]
        }
      ]
    }

    return await SlackNotificationService.send(webhookUrl, testMessage)
  }

  /**
   * Format meeting completed notification
   */
  static formatMeetingCompleted(meeting: {
    id: string
    title: string
    duration_seconds: number
    summary?: string
    action_items?: any[]
    speakers?: string[]
    appUrl: string
  }): SlackMessage {
    const duration = Math.floor(meeting.duration_seconds / 60)
    const actionItemCount = meeting.action_items?.length || 0
    
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Megbeszélés feldolgozva',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${meeting.title || 'Névtelen megbeszélés'}*\nIdőtartam: ${duration} perc`
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Megnyitás',
            emoji: true
          },
          url: `${meeting.appUrl}/meetings/${meeting.id}`,
          style: 'primary'
        }
      }
    ]

    // Add summary if available
    if (meeting.summary) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Összefoglaló:*\n${meeting.summary.substring(0, 500)}${meeting.summary.length > 500 ? '...' : ''}`
        }
      })
    }

    // Add action items if any
    if (actionItemCount > 0) {
      blocks.push(
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Teendők (${actionItemCount} db):*`
          }
        }
      )

      meeting.action_items?.slice(0, 5).forEach((item, index) => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${index + 1}. ${item.description}${item.assignee ? ` - _${item.assignee}_` : ''}`
          }
        })
      })

      if (actionItemCount > 5) {
        blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_És még ${actionItemCount - 5} további teendő..._`
            }
          ]
        })
      }
    }

    // Add participants
    if (meeting.speakers && meeting.speakers.length > 0) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Résztvevők: ${meeting.speakers.join(', ')}`
          }
        ]
      })
    }

    return { blocks }
  }

  /**
   * Format action items notification
   */
  static formatActionItems(data: {
    meetingTitle: string
    meetingId: string
    actionItems: Array<{
      description: string
      assignee?: string
      dueDate?: string
      priority?: string
    }>
    appUrl: string
  }): SlackMessage {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Új teendők létrehozva',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${data.meetingTitle}*\n${data.actionItems.length} új teendő`
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Megtekintés',
            emoji: true
          },
          url: `${data.appUrl}/meetings/${data.meetingId}#action-items`
        }
      },
      {
        type: 'divider'
      }
    ]

    // Add each action item
    data.actionItems.forEach((item, index) => {
      let itemText = `*${index + 1}.* ${item.description}`
      
      const details = []
      if (item.assignee) details.push(`Felelős: _${item.assignee}_`)
      if (item.dueDate) details.push(`Határidő: _${item.dueDate}_`)
      if (item.priority) details.push(`Prioritás: _${item.priority}_`)
      
      if (details.length > 0) {
        itemText += `\n   ${details.join(' | ')}`
      }

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: itemText
        }
      })
    })

    return { blocks }
  }

  /**
   * Format mention notification
   */
  static formatMention(data: {
    meetingTitle: string
    meetingId: string
    mentionedBy: string
    context: string
    timestamp: string
    appUrl: string
  }): SlackMessage {
    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Említve lettél egy megbeszélésen',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${data.meetingTitle}*\n_${data.mentionedBy}_ megemlített téged`
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Ugrás',
              emoji: true
            },
            url: `${data.appUrl}/meetings/${data.meetingId}?t=${data.timestamp}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `> ${data.context}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Időpont: ${format(new Date(), 'yyyy. MMMM d. HH:mm', { locale: hu })}`
            }
          ]
        }
      ]
    }
  }

  /**
   * Format meeting failed notification
   */
  static formatMeetingFailed(data: {
    meetingTitle: string
    meetingId: string
    error: string
    appUrl: string
  }): SlackMessage {
    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Megbeszélés feldolgozása sikertelen',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${data.meetingTitle}*\nHiba történt a feldolgozás során`
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Részletek',
              emoji: true
            },
            url: `${data.appUrl}/meetings/${data.meetingId}`,
            style: 'danger'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Hiba:* ${data.error}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'Kérjük, próbáld újra feldolgozni a megbeszélést, vagy lépj kapcsolatba a támogatással.'
            }
          ]
        }
      ],
      attachments: [
        {
          color: 'danger',
          footer: 'HangJegyzet',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    }
  }
}