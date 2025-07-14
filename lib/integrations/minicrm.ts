import { createClient } from '@/lib/supabase/server'

export interface MiniCRMTokens {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
}

export interface MiniCRMContact {
  Id: number
  Name: string
  Email?: string
  Phone?: string
  CompanyId?: number
  Type?: string
  StatusId?: number
  CategoryId?: number[]
  [key: string]: string | number | boolean | number[] | null | undefined
}

export interface MiniCRMCompany {
  Id: number
  Name: string
  TaxNumber?: string
  Email?: string
  Phone?: string
  Type?: string
  StatusId?: number
  CategoryId?: number[]
  [key: string]: string | number | boolean | number[] | null | undefined
}

export interface MiniCRMProject {
  Id: number
  Name: string
  StatusId: number
  ContactId?: number
  CompanyId?: number
  Description?: string
  [key: string]: string | number | boolean | null | undefined
}

export interface MiniCRMActivity {
  Id?: number
  ProjectId?: number
  ContactId?: number
  CompanyId?: number
  Subject: string
  Comment?: string
  Type?: number
  Date?: string
  Time?: string
  Duration?: number
  Location?: string
  UserId?: number
  [key: string]: string | number | boolean | null | undefined
}

export interface MiniCRMSearchResult {
  contacts: MiniCRMContact[]
  companies: MiniCRMCompany[]
  projects: MiniCRMProject[]
}

export class MiniCRMIntegration {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    this.clientId = process.env.MINICRM_CLIENT_ID || ''
    this.clientSecret = process.env.MINICRM_CLIENT_SECRET || ''
    this.redirectUri = process.env.MINICRM_REDIRECT_URI || ''
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthUrl(systemId: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: state,
      scope: 'read write'
    })

    return `https://${systemId}.minicrm.hu/oauth/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  async getTokens(systemId: string, code: string): Promise<MiniCRMTokens> {
    const response = await fetch(`https://${systemId}.minicrm.hu/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.redirectUri,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to get tokens: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(systemId: string, refreshToken: string): Promise<MiniCRMTokens> {
    const response = await fetch(`https://${systemId}.minicrm.hu/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest(
    systemId: string,
    accessToken: string,
    endpoint: string,
    options: RequestInit = {}
  ) {
    const url = `https://${systemId}.minicrm.hu/Api/R3/${endpoint}`
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`MiniCRM API error: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Search for contacts by name, email, or phone
   */
  async searchContacts(
    systemId: string,
    accessToken: string,
    query: string
  ): Promise<MiniCRMContact[]> {
    // Sanitize query to prevent injection
    const sanitizedQuery = query
      .replace(/[%_\\]/g, '\\$&')  // Escape SQL wildcards and backslash
      .replace(/['"]/g, '')         // Remove quotes
      .trim()
    
    if (!sanitizedQuery) {
      return []
    }
    
    const filters = {
      $or: [
        { Name: { $like: `%${sanitizedQuery}%` } },
        { Email: { $like: `%${sanitizedQuery}%` } },
        { Phone: { $like: `%${sanitizedQuery}%` } },
      ]
    }

    return this.makeRequest(
      systemId,
      accessToken,
      'Contact',
      {
        method: 'GET',
        headers: {
          'X-Filter': JSON.stringify(filters),
        }
      }
    )
  }

  /**
   * Search for companies by name or tax number
   */
  async searchCompanies(
    systemId: string,
    accessToken: string,
    query: string
  ): Promise<MiniCRMCompany[]> {
    // Sanitize query to prevent injection
    const sanitizedQuery = query
      .replace(/[%_\\]/g, '\\$&')  // Escape SQL wildcards and backslash
      .replace(/['"]/g, '')         // Remove quotes
      .trim()
    
    if (!sanitizedQuery) {
      return []
    }
    
    const filters = {
      $or: [
        { Name: { $like: `%${sanitizedQuery}%` } },
        { TaxNumber: { $like: `%${sanitizedQuery}%` } },
      ]
    }

    return this.makeRequest(
      systemId,
      accessToken,
      'Company',
      {
        method: 'GET',
        headers: {
          'X-Filter': JSON.stringify(filters),
        }
      }
    )
  }

  /**
   * Search for projects by name
   */
  async searchProjects(
    systemId: string,
    accessToken: string,
    query: string
  ): Promise<MiniCRMProject[]> {
    // Sanitize query to prevent injection
    const sanitizedQuery = query
      .replace(/[%_\\]/g, '\\$&')  // Escape SQL wildcards and backslash
      .replace(/['"]/g, '')         // Remove quotes
      .trim()
    
    if (!sanitizedQuery) {
      return []
    }
    
    const filters = {
      Name: { $like: `%${sanitizedQuery}%` }
    }

    return this.makeRequest(
      systemId,
      accessToken,
      'Project',
      {
        method: 'GET',
        headers: {
          'X-Filter': JSON.stringify(filters),
        }
      }
    )
  }

  /**
   * Search across all entity types
   */
  async searchAll(
    systemId: string,
    accessToken: string,
    query: string
  ): Promise<MiniCRMSearchResult> {
    const [contacts, companies, projects] = await Promise.all([
      this.searchContacts(systemId, accessToken, query).catch(() => []),
      this.searchCompanies(systemId, accessToken, query).catch(() => []),
      this.searchProjects(systemId, accessToken, query).catch(() => []),
    ])

    return { contacts, companies, projects }
  }

  /**
   * Get contact by ID
   */
  async getContact(
    systemId: string,
    accessToken: string,
    contactId: number
  ): Promise<MiniCRMContact> {
    return this.makeRequest(systemId, accessToken, `Contact/${contactId}`)
  }

  /**
   * Get company by ID
   */
  async getCompany(
    systemId: string,
    accessToken: string,
    companyId: number
  ): Promise<MiniCRMCompany> {
    return this.makeRequest(systemId, accessToken, `Company/${companyId}`)
  }

  /**
   * Get project by ID
   */
  async getProject(
    systemId: string,
    accessToken: string,
    projectId: number
  ): Promise<MiniCRMProject> {
    return this.makeRequest(systemId, accessToken, `Project/${projectId}`)
  }

  /**
   * Create activity (meeting) in MiniCRM
   */
  async createActivity(
    systemId: string,
    accessToken: string,
    activity: MiniCRMActivity
  ): Promise<number> {
    const response = await this.makeRequest(
      systemId,
      accessToken,
      'Activity',
      {
        method: 'POST',
        body: JSON.stringify(activity),
      }
    )

    return response.Id
  }

  /**
   * Update activity in MiniCRM
   */
  async updateActivity(
    systemId: string,
    accessToken: string,
    activityId: number,
    updates: Partial<MiniCRMActivity>
  ): Promise<void> {
    await this.makeRequest(
      systemId,
      accessToken,
      `Activity/${activityId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    )
  }

  /**
   * Get activity types
   */
  async getActivityTypes(
    systemId: string,
    accessToken: string
  ): Promise<Array<{ Id: number; Name: string }>> {
    return this.makeRequest(systemId, accessToken, 'Schema/Activity/Type')
  }

  /**
   * Get project statuses
   */
  async getProjectStatuses(
    systemId: string,
    accessToken: string
  ): Promise<Array<{ Id: number; Name: string }>> {
    return this.makeRequest(systemId, accessToken, 'Schema/Project/StatusId')
  }

  /**
   * Detect entities in text using regex patterns
   */
  detectEntitiesInText(text: string): Array<{
    type: 'email' | 'phone' | 'person' | 'company'
    value: string
    startPosition: number
    endPosition: number
  }> {
    const entities: Array<{
      type: 'email' | 'phone' | 'person' | 'company'
      value: string
      startPosition: number
      endPosition: number
    }> = []

    // Email detection
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    let match
    while ((match = emailRegex.exec(text)) !== null) {
      entities.push({
        type: 'email',
        value: match[0],
        startPosition: match.index,
        endPosition: match.index + match[0].length,
      })
    }

    // Phone detection (Hungarian formats)
    const phoneRegex = /\b(?:\+36|06)?[-\s]?[1-9]0?[-\s]?[0-9]{3}[-\s]?[0-9]{4}\b/g
    while ((match = phoneRegex.exec(text)) !== null) {
      entities.push({
        type: 'phone',
        value: match[0].replace(/[-\s]/g, ''),
        startPosition: match.index,
        endPosition: match.index + match[0].length,
      })
    }

    // Company detection (basic patterns for Hungarian companies)
    const companyRegex = /\b[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+)*\s+(?:Kft\.|Bt\.|Zrt\.|Nyrt\.|Kkt\.|Ev\.)\b/g
    while ((match = companyRegex.exec(text)) !== null) {
      entities.push({
        type: 'company',
        value: match[0],
        startPosition: match.index,
        endPosition: match.index + match[0].length,
      })
    }

    return entities
  }

  /**
   * Create meeting summary for MiniCRM activity
   */
  formatMeetingSummary(meeting: {
    title: string
    summary: string
    action_items: Array<{ task: string; assignee?: string }>
    duration_seconds: number
    created_at: string
  }): string {
    const duration = Math.round(meeting.duration_seconds / 60)
    const date = new Date(meeting.created_at).toLocaleDateString('hu-HU')
    
    let summary = `Találkozó: ${meeting.title}\n`
    summary += `Dátum: ${date}\n`
    summary += `Időtartam: ${duration} perc\n\n`
    summary += `Összefoglaló:\n${meeting.summary}\n\n`
    
    if (meeting.action_items.length > 0) {
      summary += `Teendők:\n`
      meeting.action_items.forEach((item, index) => {
        summary += `${index + 1}. ${item.task}`
        if (item.assignee) {
          summary += ` (Felelős: ${item.assignee})`
        }
        summary += '\n'
      })
    }
    
    summary += `\n---\nGenerálva: HangJegyzet`
    
    return summary
  }

  /**
   * Check if tokens are expired
   */
  isTokenExpired(expiryDate?: Date | string): boolean {
    if (!expiryDate) return false
    const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate
    return expiry.getTime() < Date.now()
  }

  /**
   * Get fresh tokens (refresh if needed)
   */
  async getFreshTokens(
    systemId: string,
    accessToken: string,
    refreshToken?: string,
    tokenExpiry?: Date | string
  ): Promise<{ accessToken: string; refreshToken?: string; expiryDate?: Date }> {
    if (!this.isTokenExpired(tokenExpiry)) {
      return { accessToken, refreshToken }
    }

    if (!refreshToken) {
      throw new Error('Token expired and no refresh token available')
    }

    const newTokens = await this.refreshAccessToken(systemId, refreshToken)
    
    const expiryDate = newTokens.expires_in
      ? new Date(Date.now() + newTokens.expires_in * 1000)
      : undefined

    return {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token || refreshToken,
      expiryDate,
    }
  }
}

// Export singleton
export const miniCRM = new MiniCRMIntegration()