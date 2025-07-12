import { Client } from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
import { ClientSecretCredential } from '@azure/identity'
import { OnlineMeeting, User, ChatMessage } from '@microsoft/microsoft-graph-types'
import { createClient } from '@/lib/supabase/server'
import { encryptToken, decryptToken, validateEncryptionSetup } from '@/lib/crypto/token-encryption'

interface TeamsIntegrationConfig {
  tenantId: string
  clientId: string
  clientSecret: string
  redirectUri: string
}

export class TeamsIntegrationService {
  private client: Client
  private config: TeamsIntegrationConfig

  constructor(config: TeamsIntegrationConfig) {
    this.config = config
    
    // Create credential for app-only auth
    const credential = new ClientSecretCredential(
      config.tenantId,
      config.clientId,
      config.clientSecret
    )

    // Create authentication provider
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: [
        'https://graph.microsoft.com/.default'
      ]
    })

    // Initialize Graph client
    this.client = Client.initWithMiddleware({
      authProvider
    })
  }

  /**
   * Get OAuth authorization URL for user consent
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      response_mode: 'query',
      scope: [
        'OnlineMeetings.ReadWrite',
        'OnlineMeetingRecording.Read.All',
        'Calendars.ReadWrite',
        'User.Read',
        'Chat.ReadWrite'
      ].join(' '),
      state
    })

    return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${params}`
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
  }> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code'
    })

    const response = await fetch(
      `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      }
    )

    if (!response.ok) {
      throw new Error('Failed to exchange code for token')
    }

    return response.json()
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
  }> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })

    const response = await fetch(
      `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      }
    )

    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }

    return response.json()
  }

  /**
   * Create a user-specific client
   */
  createUserClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken)
      }
    })
  }

  /**
   * Get user meetings
   */
  async getUserMeetings(accessToken: string): Promise<OnlineMeeting[]> {
    const userClient = this.createUserClient(accessToken)
    
    try {
      const response = await userClient
        .api('/me/onlineMeetings')
        .get()
      
      return response.value || []
    } catch (error) {
      console.error('Failed to get user meetings:', error)
      throw error
    }
  }

  /**
   * Create online meeting
   */
  async createMeeting(
    accessToken: string,
    subject: string,
    startDateTime: string,
    endDateTime: string,
    attendees?: string[]
  ): Promise<OnlineMeeting> {
    const userClient = this.createUserClient(accessToken)
    
    const meeting: Partial<OnlineMeeting> = {
      subject,
      startDateTime,
      endDateTime,
      participants: attendees ? {
        attendees: attendees.map(email => ({
          upn: email,
          role: 'attendee'
        }))
      } : undefined
    }

    try {
      const response = await userClient
        .api('/me/onlineMeetings')
        .post(meeting)
      
      return response
    } catch (error) {
      console.error('Failed to create meeting:', error)
      throw error
    }
  }

  /**
   * Get meeting recordings
   */
  async getMeetingRecordings(
    accessToken: string,
    meetingId: string
  ): Promise<any[]> {
    const userClient = this.createUserClient(accessToken)
    
    try {
      const response = await userClient
        .api(`/me/onlineMeetings/${meetingId}/recordings`)
        .get()
      
      return response.value || []
    } catch (error) {
      console.error('Failed to get recordings:', error)
      return []
    }
  }

  /**
   * Get meeting transcripts
   */
  async getMeetingTranscripts(
    accessToken: string,
    meetingId: string
  ): Promise<any[]> {
    const userClient = this.createUserClient(accessToken)
    
    try {
      const response = await userClient
        .api(`/me/onlineMeetings/${meetingId}/transcripts`)
        .get()
      
      return response.value || []
    } catch (error) {
      console.error('Failed to get transcripts:', error)
      return []
    }
  }

  /**
   * Download meeting recording
   */
  async downloadRecording(
    accessToken: string,
    recordingUrl: string
  ): Promise<ArrayBuffer> {
    const userClient = this.createUserClient(accessToken)
    
    try {
      const response = await userClient
        .api(recordingUrl)
        .get()
      
      return response
    } catch (error) {
      console.error('Failed to download recording:', error)
      throw error
    }
  }

  /**
   * Send chat message to meeting
   */
  async sendChatMessage(
    accessToken: string,
    chatId: string,
    message: string
  ): Promise<ChatMessage> {
    const userClient = this.createUserClient(accessToken)
    
    const chatMessage: Partial<ChatMessage> = {
      body: {
        content: message,
        contentType: 'text'
      }
    }

    try {
      const response = await userClient
        .api(`/chats/${chatId}/messages`)
        .post(chatMessage)
      
      return response
    } catch (error) {
      console.error('Failed to send chat message:', error)
      throw error
    }
  }

  /**
   * Get meeting attendance reports
   */
  async getAttendanceReports(
    accessToken: string,
    meetingId: string
  ): Promise<any[]> {
    const userClient = this.createUserClient(accessToken)
    
    try {
      const response = await userClient
        .api(`/me/onlineMeetings/${meetingId}/attendanceReports`)
        .get()
      
      return response.value || []
    } catch (error) {
      console.error('Failed to get attendance reports:', error)
      return []
    }
  }

  /**
   * Subscribe to meeting events via webhooks
   */
  async subscribeToMeetingEvents(
    accessToken: string,
    meetingId: string,
    webhookUrl: string
  ): Promise<any> {
    const userClient = this.createUserClient(accessToken)
    
    const subscription = {
      changeType: 'created,updated',
      notificationUrl: webhookUrl,
      resource: `/me/onlineMeetings/${meetingId}`,
      expirationDateTime: new Date(Date.now() + 4230 * 60000).toISOString(), // 3 days
      clientState: 'hangjegyzet-teams-integration'
    }

    try {
      const response = await userClient
        .api('/subscriptions')
        .post(subscription)
      
      return response
    } catch (error) {
      console.error('Failed to subscribe to events:', error)
      throw error
    }
  }
}

/**
 * Create Teams integration service instance
 */
export function createTeamsIntegrationService(): TeamsIntegrationService {
  const config: TeamsIntegrationConfig = {
    tenantId: process.env.TEAMS_TENANT_ID!,
    clientId: process.env.TEAMS_CLIENT_ID!,
    clientSecret: process.env.TEAMS_CLIENT_SECRET!,
    redirectUri: process.env.TEAMS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/teams/callback`
  }

  return new TeamsIntegrationService(config)
}

/**
 * Save Teams integration to database
 */
export async function saveTeamsIntegration(
  userId: string,
  organizationId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  // Validate encryption setup
  validateEncryptionSetup()
  
  // Encrypt tokens before storage
  const encryptedAccess = encryptToken(accessToken)
  const encryptedRefresh = encryptToken(refreshToken)
  
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('teams_integrations')
    .upsert({
      user_id: userId,
      organization_id: organizationId,
      access_token: encryptedAccess.encrypted,
      access_token_iv: encryptedAccess.iv,
      refresh_token: encryptedRefresh.encrypted,
      refresh_token_iv: encryptedRefresh.iv,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
  
  if (error) {
    console.error('Failed to save Teams integration:', error)
    throw error
  }
}

/**
 * Get Teams integration from database
 */
export async function getTeamsIntegration(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('teams_integrations')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error || !data) {
    return null
  }

  // Decrypt tokens
  let decryptedAccessToken: string
  let decryptedRefreshToken: string
  
  try {
    decryptedAccessToken = decryptToken({
      encrypted: data.access_token,
      iv: data.access_token_iv
    })
    decryptedRefreshToken = decryptToken({
      encrypted: data.refresh_token,
      iv: data.refresh_token_iv
    })
  } catch (error) {
    console.error('Failed to decrypt tokens:', error)
    throw new Error('Token decryption failed')
  }

  // Check if token needs refresh
  const expiresAt = new Date(data.expires_at)
  if (expiresAt <= new Date()) {
    try {
      const service = createTeamsIntegrationService()
      const newTokens = await service.refreshAccessToken(decryptedRefreshToken)
      
      await saveTeamsIntegration(
        userId,
        data.organization_id,
        newTokens.access_token,
        newTokens.refresh_token,
        newTokens.expires_in
      )
      
      decryptedAccessToken = newTokens.access_token
    } catch (error) {
      console.error('Failed to refresh Teams token:', error)
      throw error
    }
  }

  return {
    ...data,
    access_token: decryptedAccessToken,
    refresh_token: decryptedRefreshToken
  }
}