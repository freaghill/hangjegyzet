import axios from 'axios'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'

export interface TeamsMessage {
  '@type': 'MessageCard'
  '@context': 'https://schema.org/extensions'
  themeColor?: string
  summary: string
  sections?: TeamsSection[]
  potentialAction?: TeamsAction[]
}

export interface TeamsSection {
  activityTitle?: string
  activitySubtitle?: string
  activityImage?: string
  facts?: TeamsFact[]
  text?: string
  markdown?: boolean
  heroImage?: {
    image: string
    title?: string
  }
}

export interface TeamsFact {
  name: string
  value: string
}

export interface TeamsAction {
  '@type': 'OpenUri' | 'HttpPOST' | 'ActionCard'
  name: string
  targets?: Array<{
    os: 'default' | 'iOS' | 'android' | 'windows'
    uri: string
  }>
  target?: string
  body?: string
  headers?: Record<string, string>
  bodyContentType?: string
  inputs?: any[]
  actions?: TeamsAction[]
}

export class TeamsNotificationService {
  /**
   * Send a notification to Teams webhook
   */
  static async send(webhookUrl: string, message: TeamsMessage): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post(webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      })

      // Teams returns '1' as text on success
      return { success: response.status === 200 && response.data === 1 }
    } catch (error: any) {
      console.error('Teams notification error:', error.response?.data || error.message)
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
    const testMessage: TeamsMessage = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor: '0078D4',
      summary: 'HangJegyzet webhook teszt',
      sections: [
        {
          activityTitle: 'HangJegyzet Webhook Teszt',
          activitySubtitle: 'A webhook sikeresen konfigurálva lett!',
          facts: [
            {
              name: 'Állapot',
              value: 'Sikeres'
            },
            {
              name: 'Időpont',
              value: format(new Date(), 'yyyy. MMMM d. HH:mm', { locale: hu })
            }
          ],
          text: 'Mostantól értesítéseket fogsz kapni a HangJegyzet alkalmazásból.',
          markdown: true
        }
      ]
    }

    return await TeamsNotificationService.send(webhookUrl, testMessage)
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
  }): TeamsMessage {
    const duration = Math.floor(meeting.duration_seconds / 60)
    const actionItemCount = meeting.action_items?.length || 0
    
    const sections: TeamsSection[] = [
      {
        activityTitle: 'Megbeszélés feldolgozva',
        activitySubtitle: meeting.title || 'Névtelen megbeszélés',
        facts: [
          {
            name: 'Időtartam',
            value: `${duration} perc`
          },
          {
            name: 'Teendők',
            value: `${actionItemCount} db`
          }
        ]
      }
    ]

    // Add summary if available
    if (meeting.summary) {
      sections.push({
        text: `**Összefoglaló:**\n\n${meeting.summary.substring(0, 500)}${meeting.summary.length > 500 ? '...' : ''}`,
        markdown: true
      })
    }

    // Add action items if any
    if (actionItemCount > 0) {
      let actionItemsText = '**Teendők:**\n\n'
      meeting.action_items?.slice(0, 5).forEach((item, index) => {
        actionItemsText += `${index + 1}. ${item.description}`
        if (item.assignee) {
          actionItemsText += ` - *${item.assignee}*`
        }
        actionItemsText += '\n'
      })

      if (actionItemCount > 5) {
        actionItemsText += `\n*És még ${actionItemCount - 5} további teendő...*`
      }

      sections.push({
        text: actionItemsText,
        markdown: true
      })
    }

    // Add participants
    if (meeting.speakers && meeting.speakers.length > 0) {
      sections.push({
        facts: [
          {
            name: 'Résztvevők',
            value: meeting.speakers.join(', ')
          }
        ]
      })
    }

    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor: '00a656', // Green for success
      summary: `Megbeszélés feldolgozva: ${meeting.title}`,
      sections,
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'Megnyitás a HangJegyzetben',
          targets: [
            {
              os: 'default',
              uri: `${meeting.appUrl}/meetings/${meeting.id}`
            }
          ]
        }
      ]
    }
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
  }): TeamsMessage {
    const sections: TeamsSection[] = [
      {
        activityTitle: 'Új teendők létrehozva',
        activitySubtitle: data.meetingTitle,
        facts: [
          {
            name: 'Teendők száma',
            value: `${data.actionItems.length} db`
          }
        ]
      }
    ]

    // Format action items
    let actionItemsText = '**Teendők:**\n\n'
    data.actionItems.forEach((item, index) => {
      actionItemsText += `**${index + 1}.** ${item.description}\n`
      
      const details = []
      if (item.assignee) details.push(`Felelős: *${item.assignee}*`)
      if (item.dueDate) details.push(`Határidő: *${item.dueDate}*`)
      if (item.priority) details.push(`Prioritás: *${item.priority}*`)
      
      if (details.length > 0) {
        actionItemsText += `   ${details.join(' | ')}\n`
      }
      actionItemsText += '\n'
    })

    sections.push({
      text: actionItemsText,
      markdown: true
    })

    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor: '0078D4', // Blue
      summary: `Új teendők: ${data.meetingTitle}`,
      sections,
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'Teendők megtekintése',
          targets: [
            {
              os: 'default',
              uri: `${data.appUrl}/meetings/${data.meetingId}#action-items`
            }
          ]
        }
      ]
    }
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
  }): TeamsMessage {
    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor: 'FF6900', // Orange for attention
      summary: `Említve lettél: ${data.meetingTitle}`,
      sections: [
        {
          activityTitle: 'Említve lettél egy megbeszélésen',
          activitySubtitle: data.meetingTitle,
          facts: [
            {
              name: 'Említette',
              value: data.mentionedBy
            },
            {
              name: 'Időpont',
              value: format(new Date(), 'yyyy. MMMM d. HH:mm', { locale: hu })
            }
          ]
        },
        {
          text: `**Kontextus:**\n\n> ${data.context}`,
          markdown: true
        }
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'Ugrás a megjegyzéshez',
          targets: [
            {
              os: 'default',
              uri: `${data.appUrl}/meetings/${data.meetingId}?t=${data.timestamp}`
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
  }): TeamsMessage {
    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor: 'CC0000', // Red for error
      summary: `Feldolgozás sikertelen: ${data.meetingTitle}`,
      sections: [
        {
          activityTitle: 'Megbeszélés feldolgozása sikertelen',
          activitySubtitle: data.meetingTitle,
          facts: [
            {
              name: 'Állapot',
              value: 'Sikertelen'
            },
            {
              name: 'Időpont',
              value: format(new Date(), 'yyyy. MMMM d. HH:mm', { locale: hu })
            }
          ]
        },
        {
          text: `**Hiba:** ${data.error}\n\nKérjük, próbáld újra feldolgozni a megbeszélést, vagy lépj kapcsolatba a támogatással.`,
          markdown: true
        }
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'Részletek megtekintése',
          targets: [
            {
              os: 'default',
              uri: `${data.appUrl}/meetings/${data.meetingId}`
            }
          ]
        }
      ]
    }
  }

  /**
   * Format highlight created notification
   */
  static formatHighlightCreated(data: {
    meetingTitle: string
    meetingId: string
    highlights: Array<{
      text: string
      speaker?: string
      timestamp: string
    }>
    appUrl: string
  }): TeamsMessage {
    const sections: TeamsSection[] = [
      {
        activityTitle: 'Új kiemelések hozzáadva',
        activitySubtitle: data.meetingTitle,
        facts: [
          {
            name: 'Kiemelések száma',
            value: `${data.highlights.length} db`
          }
        ]
      }
    ]

    // Format highlights
    let highlightsText = '**Kiemelések:**\n\n'
    data.highlights.slice(0, 5).forEach((highlight, index) => {
      highlightsText += `${index + 1}. "${highlight.text}"\n`
      if (highlight.speaker) {
        highlightsText += `   *- ${highlight.speaker}*\n`
      }
      highlightsText += '\n'
    })

    if (data.highlights.length > 5) {
      highlightsText += `*És még ${data.highlights.length - 5} további kiemelés...*`
    }

    sections.push({
      text: highlightsText,
      markdown: true
    })

    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor: '7B68EE', // Purple for highlights
      summary: `Új kiemelések: ${data.meetingTitle}`,
      sections,
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'Kiemelések megtekintése',
          targets: [
            {
              os: 'default',
              uri: `${data.appUrl}/meetings/${data.meetingId}#highlights`
            }
          ]
        }
      ]
    }
  }
}