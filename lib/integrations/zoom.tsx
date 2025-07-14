import axios, { AxiosInstance } from 'axios'
import { createClient } from '@/lib/supabase/server'

export interface ZoomTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  scope: string
}

export interface ZoomUser {
  id: string
  email: string
  first_name: string
  last_name: string
  type: number
  status: string
}

export interface ZoomRecording {
  uuid: string
  id: string
  topic: string
  start_time: string
  duration: number
  total_size: number
  recording_count: number
  host_email: string
  recording_files: ZoomRecordingFile[]
}

export interface ZoomRecordingFile {
  id: string
  meeting_id: string
  recording_start: string
  recording_end: string
  file_type: string
  file_size: number
  play_url?: string
  download_url: string
  status: string
  recording_type: string
}

export interface ZoomMeetingParticipant {
  id: string
  name: string
  email?: string
  join_time: string
  leave_time: string
  duration: number
}

export class ZoomIntegration {
  private baseURL = 'https://api.zoom.us/v2'
  private oauth2URL = 'https://zoom.us/oauth'
  private client: AxiosInstance

  constructor(accessToken?: string) {
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: accessToken
        ? {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        : {
            'Content-Type': 'application/json',
          },
    })
  }

  /**
   * Get authorization URL for user to grant permissions
   */
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.ZOOM_CLIENT_ID!,
      redirect_uri: process.env.ZOOM_REDIRECT_URI!,
      state: state,
    })

    return `${this.oauth2URL}/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string): Promise<ZoomTokens> {
    const credentials = Buffer.from(
      `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
    ).toString('base64')

    const response = await axios.post(
      `${this.oauth2URL}/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.ZOOM_REDIRECT_URI!,
      }),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    return response.data
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<ZoomTokens> {
    const credentials = Buffer.from(
      `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
    ).toString('base64')

    const response = await axios.post(
      `${this.oauth2URL}/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    return response.data
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<ZoomUser> {
    const response = await this.client.get('/users/me')
    return response.data
  }

  /**
   * List cloud recordings
   */
  async listRecordings(
    userId: string = 'me',
    from?: Date,
    to?: Date,
    pageSize: number = 30
  ): Promise<{ meetings: ZoomRecording[]; next_page_token?: string }> {
    const params: any = {
      page_size: pageSize,
      from: from ? from.toISOString().split('T')[0] : undefined,
      to: to ? to.toISOString().split('T')[0] : undefined,
    }

    const response = await this.client.get(`/users/${userId}/recordings`, { params })
    return response.data
  }

  /**
   * Get specific recording details
   */
  async getRecording(meetingId: string): Promise<ZoomRecording> {
    const response = await this.client.get(`/meetings/${meetingId}/recordings`)
    return response.data
  }

  /**
   * Get meeting participants
   */
  async getMeetingParticipants(
    meetingId: string
  ): Promise<{ participants: ZoomMeetingParticipant[] }> {
    const response = await this.client.get(`/past_meetings/${meetingId}/participants`)
    return response.data
  }

  /**
   * Delete recording
   */
  async deleteRecording(meetingId: string, action: 'trash' | 'delete' = 'trash'): Promise<void> {
    await this.client.delete(`/meetings/${meetingId}/recordings`, {
      params: { action },
    })
  }

  /**
   * Download recording file
   */
  async downloadRecordingFile(downloadUrl: string, accessToken: string): Promise<Buffer> {
    const response = await axios.get(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      responseType: 'arraybuffer',
    })

    return Buffer.from(response.data)
  }

  /**
   * Verify webhook token
   */
  static verifyWebhookToken(
    body: {
      event?: string
      payload?: {
        plainToken?: string
      }
      [key: string]: unknown
    },
    headers: Record<string, string>,
    secret: string
  ): boolean {
    // For initial verification challenge
    if (body.event === 'endpoint.url_validation') {
      return true
    }

    // For actual webhook events
    const message = `v0:${headers['x-zm-request-timestamp']}:${JSON.stringify(body)}`
    const crypto = require('crypto')
    const hashForVerify = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex')
    const signature = `v0=${hashForVerify}`

    return signature === headers['x-zm-signature']
  }

  /**
   * Handle webhook verification challenge
   */
  static handleVerificationChallenge(body: {
    event?: string
    payload?: {
      plainToken?: string
    }
  }): {
    plainToken: string
    encryptedToken: string
  } | null {
    if (body.event === 'endpoint.url_validation') {
      const crypto = require('crypto')
      const hashForValidate = crypto
        .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET!)
        .update(body.payload.plainToken)
        .digest('hex')

      return {
        plainToken: body.payload.plainToken,
        encryptedToken: hashForValidate,
      }
    }
    return null
  }

  /**
   * Revoke app authorization
   */
  async revokeAuthorization(userId: string = 'me'): Promise<void> {
    await this.client.delete(`/users/${userId}/token`)
  }
}

// Helper function to get Zoom client with fresh token
export async function getZoomClient(userId: string): Promise<ZoomIntegration | null> {
  const supabase = await createClient()
  
  const { data: integration, error } = await supabase
    .from('zoom_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (error || !integration) {
    return null
  }

  // Check if token needs refresh
  const now = new Date()
  const tokenExpiry = new Date(integration.token_expiry)
  
  if (tokenExpiry <= now) {
    // Refresh token
    const zoom = new ZoomIntegration()
    try {
      const newTokens = await zoom.refreshAccessToken(integration.refresh_token)
      
      // Update tokens in database
      const { error: updateError } = await supabase
        .from('zoom_integrations')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          token_expiry: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('id', integration.id)

      if (updateError) {
        console.error('Failed to update Zoom tokens:', updateError)
        return null
      }

      return new ZoomIntegration(newTokens.access_token)
    } catch (error) {
      console.error('Failed to refresh Zoom token:', error)
      
      // Deactivate integration if refresh fails
      await supabase
        .from('zoom_integrations')
        .update({ is_active: false })
        .eq('id', integration.id)
      
      return null
    }
  }

  return new ZoomIntegration(integration.access_token)
}

// Export singleton for webhook verification
export const zoom = new ZoomIntegration()