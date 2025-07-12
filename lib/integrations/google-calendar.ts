import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { createClient } from '@/lib/supabase/server'

export interface GoogleCalendarTokens {
  access_token?: string | null
  refresh_token?: string | null
  expiry_date?: number | null
  scope?: string
  token_type?: string
}

export interface CalendarList {
  id: string
  summary: string
  description?: string
  primary?: boolean
  selected?: boolean
  backgroundColor?: string
  foregroundColor?: string
}

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: string
  }>
  location?: string
  hangoutLink?: string
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string
      uri: string
      label?: string
    }>
  }
  recurringEventId?: string
  recurrence?: string[]
}

export class GoogleCalendarIntegration {
  private oauth2Client: OAuth2Client

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI
    )
  }

  /**
   * Get authorization URL for user to grant permissions
   */
  getAuthUrl(state: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ]

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state,
      prompt: 'consent',
    })
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code)
    return tokens
  }

  /**
   * Create Calendar client with user tokens
   */
  getCalendarClient(tokens: GoogleCalendarTokens) {
    this.oauth2Client.setCredentials(tokens)
    return google.calendar({ version: 'v3', auth: this.oauth2Client })
  }

  /**
   * List user's calendars
   */
  async listCalendars(tokens: any): Promise<CalendarList[]> {
    const calendar = this.getCalendarClient(tokens)
    
    const response = await calendar.calendarList.list({
      showDeleted: false,
      showHidden: false,
    })

    return response.data.items || []
  }

  /**
   * List upcoming events from specific calendars
   */
  async listUpcomingEvents(
    tokens: any, 
    calendarIds: string[], 
    timeMin?: Date,
    timeMax?: Date,
    maxResults: number = 10
  ): Promise<CalendarEvent[]> {
    const calendar = this.getCalendarClient(tokens)
    const events: CalendarEvent[] = []

    // Default to next 7 days if not specified
    const startTime = timeMin || new Date()
    const endTime = timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Fetch events from each calendar
    for (const calendarId of calendarIds) {
      try {
        const response = await calendar.events.list({
          calendarId,
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          maxResults,
          singleEvents: true,
          orderBy: 'startTime',
        })

        if (response.data.items) {
          events.push(...response.data.items)
        }
      } catch (error) {
        console.error(`Error fetching events from calendar ${calendarId}:`, error)
      }
    }

    // Sort all events by start time
    events.sort((a, b) => {
      const aTime = new Date(a.start.dateTime || a.start.date || '')
      const bTime = new Date(b.start.dateTime || b.start.date || '')
      return aTime.getTime() - bTime.getTime()
    })

    return events.slice(0, maxResults)
  }

  /**
   * Get single event details
   */
  async getEvent(tokens: any, calendarId: string, eventId: string): Promise<CalendarEvent | null> {
    const calendar = this.getCalendarClient(tokens)
    
    try {
      const response = await calendar.events.get({
        calendarId,
        eventId,
      })

      return response.data as CalendarEvent
    } catch (error) {
      console.error('Error fetching event:', error)
      return null
    }
  }

  /**
   * Create a new calendar event
   */
  async createEvent(
    tokens: any,
    calendarId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent | null> {
    const calendar = this.getCalendarClient(tokens)
    
    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
        conferenceDataVersion: 1, // Enable conference data
      })

      return response.data as CalendarEvent
    } catch (error) {
      console.error('Error creating event:', error)
      return null
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    tokens: any,
    calendarId: string,
    eventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<CalendarEvent | null> {
    const calendar = this.getCalendarClient(tokens)
    
    try {
      const response = await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: updates,
      })

      return response.data as CalendarEvent
    } catch (error) {
      console.error('Error updating event:', error)
      return null
    }
  }

  /**
   * Add meeting summary to calendar event description
   */
  async addMeetingSummaryToEvent(
    tokens: any,
    calendarId: string,
    eventId: string,
    summary: string,
    actionItems?: string[],
    meetingUrl?: string
  ): Promise<CalendarEvent | null> {
    // Get existing event
    const event = await this.getEvent(tokens, calendarId, eventId)
    if (!event) return null

    // Prepare updated description
    let updatedDescription = event.description || ''
    
    // Add separator if there's existing content
    if (updatedDescription) {
      updatedDescription += '\n\n---\n\n'
    }

    // Add meeting summary
    updatedDescription += `📝 Meeting összefoglaló (HangJegyzet):\n\n${summary}`

    // Add action items if any
    if (actionItems && actionItems.length > 0) {
      updatedDescription += '\n\n✅ Teendők:\n'
      actionItems.forEach(item => {
        updatedDescription += `• ${item}\n`
      })
    }

    // Add link to full transcript
    if (meetingUrl) {
      updatedDescription += `\n\n🔗 Teljes átírat: ${meetingUrl}`
    }

    // Update the event
    return this.updateEvent(tokens, calendarId, eventId, {
      description: updatedDescription,
    })
  }

  /**
   * Extract meeting link from calendar event
   */
  extractMeetingLink(event: CalendarEvent): string | null {
    // Check for Google Meet link
    if (event.hangoutLink) {
      return event.hangoutLink
    }

    // Check conference data
    if (event.conferenceData?.entryPoints) {
      const videoEntry = event.conferenceData.entryPoints.find(
        entry => entry.entryPointType === 'video'
      )
      if (videoEntry?.uri) {
        return videoEntry.uri
      }
    }

    // Check location for Zoom or other meeting links
    if (event.location) {
      // Common meeting URL patterns
      const patterns = [
        /https?:\/\/[\w-]+\.zoom\.us\/j\/\d+/i,
        /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s]+/i,
        /https?:\/\/meet\.google\.com\/[\w-]+/i,
      ]

      for (const pattern of patterns) {
        const match = event.location.match(pattern)
        if (match) {
          return match[0]
        }
      }
    }

    // Check description for meeting links
    if (event.description) {
      const patterns = [
        /https?:\/\/[\w-]+\.zoom\.us\/j\/\d+/i,
        /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s]+/i,
        /https?:\/\/meet\.google\.com\/[\w-]+/i,
      ]

      for (const pattern of patterns) {
        const match = event.description.match(pattern)
        if (match) {
          return match[0]
        }
      }
    }

    return null
  }

  /**
   * Watch calendar for changes
   */
  async watchCalendar(
    tokens: any,
    calendarId: string,
    webhookUrl: string
  ): Promise<any> {
    const calendar = this.getCalendarClient(tokens)
    
    const response = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: `calendar-${calendarId}-${Date.now()}`,
        type: 'web_hook',
        address: webhookUrl,
        expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(), // 7 days
      },
    })

    return response.data
  }

  /**
   * Stop watching calendar
   */
  async stopWatchingCalendar(tokens: any, channelId: string, resourceId: string): Promise<void> {
    const calendar = this.getCalendarClient(tokens)
    
    await calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId: resourceId,
      },
    })
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleCalendarTokens> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    const { credentials } = await this.oauth2Client.refreshAccessToken()
    return credentials
  }

  /**
   * Revoke access
   */
  async revokeAccess(tokens: any) {
    this.oauth2Client.setCredentials(tokens)
    await this.oauth2Client.revokeCredentials()
  }
}

// Export singleton
export const googleCalendar = new GoogleCalendarIntegration()