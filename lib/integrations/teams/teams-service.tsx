import { Client } from '@microsoft/microsoft-graph-client'
import { createClient } from '@/lib/supabase/server'

export interface TeamsMeetingSummary {
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
}

export class TeamsService {
  private client: Client | null = null
  
  constructor(private accessToken?: string) {
    if (accessToken) {
      this.initializeClient(accessToken)
    }
  }
  
  private initializeClient(accessToken: string) {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken)
      }
    })
  }
  
  /**
   * Initialize Teams client with user's token
   */
  async initialize(userId: string): Promise<boolean> {
    const supabase = await createClient()
    
    // Get user's Teams integration
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('access_token, metadata')
      .eq('user_id', userId)
      .eq('provider', 'teams')
      .single()
    
    if (integration?.access_token) {
      this.initializeClient(integration.access_token)
      return true
    }
    
    return false
  }
  
  /**
   * Get user's Teams and channels
   */
  async getTeamsAndChannels(): Promise<Array<{
    teamId: string
    teamName: string
    channels: Array<{ id: string; name: string; description?: string }>
  }>> {
    if (!this.client) throw new Error('Teams client not initialized')
    
    try {
      // Get joined teams
      const teams = await this.client
        .api('/me/joinedTeams')
        .get()
      
      const teamsWithChannels = []
      
      // Get channels for each team
      for (const team of teams.value) {
        const channels = await this.client
          .api(`/teams/${team.id}/channels`)
          .get()
        
        teamsWithChannels.push({
          teamId: team.id,
          teamName: team.displayName,
          channels: channels.value.map((channel: any) => ({
            id: channel.id,
            name: channel.displayName,
            description: channel.description
          }))
        })
      }
      
      return teamsWithChannels
    } catch (error) {
      console.error('Error fetching Teams data:', error)
      throw new Error('Failed to fetch Teams and channels')
    }
  }
  
  /**
   * Send meeting summary to Teams channel
   */
  async sendMeetingSummary(
    teamId: string,
    channelId: string,
    summary: TeamsMeetingSummary
  ): Promise<string> {
    if (!this.client) throw new Error('Teams client not initialized')
    
    const card = this.createMeetingSummaryCard(summary)
    
    try {
      const result = await this.client
        .api(`/teams/${teamId}/channels/${channelId}/messages`)
        .post({
          body: {
            contentType: 'html',
            content: `<h3>${summary.title}</h3><p>Meeting összefoglaló létrehozva</p>`
          },
          attachments: [
            {
              contentType: 'application/vnd.microsoft.card.adaptive',
              content: card
            }
          ]
        })
      
      return result.id
    } catch (error) {
      console.error('Error sending Teams message:', error)
      throw new Error('Failed to send Teams message')
    }
  }
  
  /**
   * Create task in Teams Planner
   */
  async createPlannerTask(
    planId: string,
    task: {
      title: string
      dueDateTime?: string
      assigneeId?: string
      priority?: number
      notes?: string
    }
  ): Promise<string> {
    if (!this.client) throw new Error('Teams client not initialized')
    
    try {
      const result = await this.client
        .api('/planner/tasks')
        .post({
          planId,
          title: task.title,
          dueDateTime: task.dueDateTime,
          assignments: task.assigneeId ? {
            [task.assigneeId]: {
              '@odata.type': '#microsoft.graph.plannerAssignment',
              orderHint: ' !'
            }
          } : {},
          priority: task.priority,
          details: {
            description: task.notes
          }
        })
      
      return result.id
    } catch (error) {
      console.error('Error creating Planner task:', error)
      throw new Error('Failed to create Planner task')
    }
  }
  
  /**
   * Send meeting recording notification
   */
  async sendRecordingNotification(
    teamId: string,
    channelId: string,
    meeting: {
      title: string
      recordingUrl: string
      duration: number
      date: Date
    }
  ) {
    if (!this.client) throw new Error('Teams client not initialized')
    
    const card = {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'TextBlock',
          size: 'Medium',
          weight: 'Bolder',
          text: '🎥 Meeting felvétel elérhető'
        },
        {
          type: 'TextBlock',
          text: meeting.title,
          wrap: true,
          size: 'Large'
        },
        {
          type: 'FactSet',
          facts: [
            {
              title: 'Dátum:',
              value: meeting.date.toLocaleDateString('hu-HU')
            },
            {
              title: 'Időtartam:',
              value: `${Math.round(meeting.duration / 60)} perc`
            }
          ]
        },
        {
          type: 'ActionSet',
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'Felvétel megtekintése',
              url: meeting.recordingUrl
            }
          ]
        }
      ],
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4'
    }
    
    try {
      await this.client
        .api(`/teams/${teamId}/channels/${channelId}/messages`)
        .post({
          body: {
            contentType: 'html',
            content: '<p>Új meeting felvétel érhető el</p>'
          },
          attachments: [
            {
              contentType: 'application/vnd.microsoft.card.adaptive',
              content: card
            }
          ]
        })
    } catch (error) {
      console.error('Error sending recording notification:', error)
      throw new Error('Failed to send recording notification')
    }
  }
  
  /**
   * Create adaptive card for meeting summary
   */
  private createMeetingSummaryCard(summary: TeamsMeetingSummary) {
    const card: any = {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'TextBlock',
          size: 'Large',
          weight: 'Bolder',
          text: summary.title
        },
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              items: [
                {
                  type: 'TextBlock',
                  text: `⏱️ ${Math.round(summary.duration / 60)} perc`,
                  isSubtle: true
                }
              ],
              width: 'auto'
            },
            {
              type: 'Column',
              items: [
                {
                  type: 'TextBlock',
                  text: `👥 ${summary.participants.length} résztvevő`,
                  isSubtle: true
                }
              ],
              width: 'auto'
            }
          ]
        },
        {
          type: 'TextBlock',
          text: '**Összefoglaló**',
          wrap: true,
          spacing: 'Medium'
        },
        {
          type: 'TextBlock',
          text: summary.summary,
          wrap: true
        }
      ],
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4'
    }
    
    // Add key points if available
    if (summary.keyPoints.length > 0) {
      card.body.push({
        type: 'TextBlock',
        text: '**Főbb pontok**',
        wrap: true,
        spacing: 'Medium'
      })
      
      summary.keyPoints.forEach(point => {
        card.body.push({
          type: 'TextBlock',
          text: `• ${point}`,
          wrap: true
        })
      })
    }
    
    // Add action items if available
    if (summary.actionItems.length > 0) {
      card.body.push({
        type: 'TextBlock',
        text: `**Akció pontok (${summary.actionItems.length})**`,
        wrap: true,
        spacing: 'Medium'
      })
      
      const actionItemsContainer: any = {
        type: 'Container',
        items: []
      }
      
      summary.actionItems.slice(0, 5).forEach(item => {
        const priorityColor = item.priority === 'high' ? 'Attention' : 
                             item.priority === 'medium' ? 'Warning' : 'Good'
        
        actionItemsContainer.items.push({
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              width: 'stretch',
              items: [
                {
                  type: 'TextBlock',
                  text: item.text,
                  wrap: true
                },
                {
                  type: 'TextBlock',
                  text: `${item.assignee ? `Felelős: ${item.assignee}` : ''} ${item.deadline ? `| Határidő: ${item.deadline}` : ''}`,
                  isSubtle: true,
                  size: 'Small'
                }
              ]
            },
            {
              type: 'Column',
              width: 'auto',
              items: [
                {
                  type: 'TextBlock',
                  text: item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢',
                  color: priorityColor
                }
              ]
            }
          ]
        })
      })
      
      card.body.push(actionItemsContainer)
      
      if (summary.actionItems.length > 5) {
        card.body.push({
          type: 'TextBlock',
          text: `_...és további ${summary.actionItems.length - 5} feladat_`,
          isSubtle: true,
          size: 'Small'
        })
      }
    }
    
    return card
  }
  
  /**
   * Test Teams connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) return false
    
    try {
      await this.client.api('/me').get()
      return true
    } catch (error) {
      console.error('Teams connection test failed:', error)
      return false
    }
  }
}

// OAuth configuration for Teams (using Azure AD)
export const teamsOAuthConfig = {
  clientId: process.env.AZURE_AD_CLIENT_ID!,
  clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
  tenantId: process.env.AZURE_AD_TENANT_ID!,
  redirectUri: process.env.TEAMS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/teams/callback`,
  scopes: [
    'User.Read',
    'Team.ReadBasic.All',
    'Channel.ReadBasic.All',
    'ChannelMessage.Send',
    'Tasks.ReadWrite',
    'Files.ReadWrite.All'
  ]
}

// Helper to generate OAuth URL
export function getTeamsOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: teamsOAuthConfig.clientId,
    response_type: 'code',
    redirect_uri: teamsOAuthConfig.redirectUri,
    response_mode: 'query',
    scope: teamsOAuthConfig.scopes.join(' '),
    state
  })
  
  return `https://login.microsoftonline.com/${teamsOAuthConfig.tenantId}/oauth2/v2.0/authorize?${params.toString()}`
}