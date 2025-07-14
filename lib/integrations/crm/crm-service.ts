import { createClient } from '@/lib/supabase/server'

export interface CRMContact {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  title?: string
  lastContact?: Date
}

export interface CRMDeal {
  id: string
  name: string
  value: number
  stage: string
  probability?: number
  closeDate?: Date
  contactIds: string[]
}

export interface CRMMeetingData {
  meetingId: string
  title: string
  date: Date
  duration: number
  participants: string[]
  summary: string
  keyPoints: string[]
  actionItems: Array<{
    text: string
    assignee?: string
    deadline?: string
  }>
  sentiment?: string
  nextSteps?: string[]
}

export abstract class BaseCRMService {
  protected apiKey: string = ''
  protected baseUrl: string = ''
  
  abstract getName(): string
  abstract initialize(credentials: any): Promise<boolean>
  abstract getContacts(query?: string): Promise<CRMContact[]>
  abstract getDeals(contactId?: string): Promise<CRMDeal[]>
  abstract createActivity(data: CRMMeetingData, contactIds: string[]): Promise<string>
  abstract updateDeal(dealId: string, updates: Partial<CRMDeal>): Promise<boolean>
  abstract testConnection(): Promise<boolean>
  
  /**
   * Common method to sync meeting data to CRM
   */
  async syncMeetingToCRM(meetingData: CRMMeetingData, contactIds: string[]): Promise<{
    activityId?: string
    error?: string
  }> {
    try {
      const activityId = await this.createActivity(meetingData, contactIds)
      return { activityId }
    } catch (error) {
      console.error(`Error syncing to ${this.getName()}:`, error)
      return { error: error instanceof Error ? error.message : 'Sync failed' }
    }
  }
  
  /**
   * Format meeting data for CRM
   */
  protected formatMeetingNote(data: CRMMeetingData): string {
    let note = `Meeting: ${data.title}\n`
    note += `Date: ${data.date.toLocaleDateString()}\n`
    note += `Duration: ${Math.round(data.duration / 60)} minutes\n`
    note += `Participants: ${data.participants.join(', ')}\n\n`
    
    if (data.summary) {
      note += `Summary:\n${data.summary}\n\n`
    }
    
    if (data.keyPoints.length > 0) {
      note += `Key Points:\n${data.keyPoints.map(p => `• ${p}`).join('\n')}\n\n`
    }
    
    if (data.actionItems.length > 0) {
      note += `Action Items:\n`
      data.actionItems.forEach((item, i) => {
        note += `${i + 1}. ${item.text}`
        if (item.assignee) note += ` (Assigned to: ${item.assignee})`
        if (item.deadline) note += ` (Due: ${item.deadline})`
        note += '\n'
      })
      note += '\n'
    }
    
    if (data.nextSteps && data.nextSteps.length > 0) {
      note += `Next Steps:\n${data.nextSteps.map(s => `• ${s}`).join('\n')}`
    }
    
    return note
  }
}

/**
 * HubSpot CRM Integration
 */
export class HubSpotCRMService extends BaseCRMService {
  getName() { return 'HubSpot' }
  
  async initialize(credentials: { apiKey: string }): Promise<boolean> {
    this.apiKey = credentials.apiKey
    this.baseUrl = 'https://api.hubapi.com'
    return this.testConnection()
  }
  
  async getContacts(query?: string): Promise<CRMContact[]> {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts${query ? `/search` : ''}`, {
      method: query ? 'POST' : 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: query ? JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'CONTAINS_TOKEN',
            value: query
          }]
        }]
      }) : undefined
    })
    
    if (!response.ok) throw new Error('Failed to fetch contacts')
    
    const data = await response.json()
    return (data.results || []).map((contact: any) => ({
      id: contact.id,
      name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
      email: contact.properties.email,
      phone: contact.properties.phone,
      company: contact.properties.company,
      title: contact.properties.jobtitle
    }))
  }
  
  async getDeals(contactId?: string): Promise<CRMDeal[]> {
    let url = `${this.baseUrl}/crm/v3/objects/deals`
    
    if (contactId) {
      // Get deals associated with contact
      url = `${this.baseUrl}/crm/v3/objects/contacts/${contactId}/associations/deals`
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })
    
    if (!response.ok) throw new Error('Failed to fetch deals')
    
    const data = await response.json()
    
    // If we got associations, fetch the actual deal data
    if (contactId && data.results) {
      const dealIds = data.results.map((r: any) => r.id)
      const dealsResponse = await fetch(`${this.baseUrl}/crm/v3/objects/deals/batch/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids: dealIds,
          properties: ['dealname', 'amount', 'dealstage', 'closedate', 'hs_probability']
        })
      })
      
      const dealsData = await dealsResponse.json()
      return this.mapDeals(dealsData.results || [])
    }
    
    return this.mapDeals(data.results || [])
  }
  
  private mapDeals(deals: any[]): CRMDeal[] {
    return deals.map(deal => ({
      id: deal.id,
      name: deal.properties.dealname,
      value: parseFloat(deal.properties.amount || '0'),
      stage: deal.properties.dealstage,
      probability: parseFloat(deal.properties.hs_probability || '0'),
      closeDate: deal.properties.closedate ? new Date(deal.properties.closedate) : undefined,
      contactIds: []
    }))
  }
  
  async createActivity(data: CRMMeetingData, contactIds: string[]): Promise<string> {
    const note = this.formatMeetingNote(data)
    
    // Create engagement (note)
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          hs_timestamp: data.date.toISOString(),
          hs_note_body: note
        }
      })
    })
    
    if (!response.ok) throw new Error('Failed to create activity')
    
    const result = await response.json()
    const noteId = result.id
    
    // Associate with contacts
    for (const contactId of contactIds) {
      await fetch(`${this.baseUrl}/crm/v3/objects/notes/${noteId}/associations/contacts/${contactId}/note_to_contact`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })
    }
    
    return noteId
  }
  
  async updateDeal(dealId: string, updates: Partial<CRMDeal>): Promise<boolean> {
    const properties: any = {}
    
    if (updates.name) properties.dealname = updates.name
    if (updates.value) properties.amount = updates.value.toString()
    if (updates.stage) properties.dealstage = updates.stage
    if (updates.probability) properties.hs_probability = updates.probability.toString()
    if (updates.closeDate) properties.closedate = updates.closeDate.toISOString()
    
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/deals/${dealId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ properties })
    })
    
    return response.ok
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts?limit=1`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })
      return response.ok
    } catch {
      return false
    }
  }
}

/**
 * Salesforce CRM Integration
 */
export class SalesforceCRMService extends BaseCRMService {
  private instanceUrl: string = ''
  
  getName() { return 'Salesforce' }
  
  async initialize(credentials: { accessToken: string; instanceUrl: string }): Promise<boolean> {
    this.apiKey = credentials.accessToken
    this.instanceUrl = credentials.instanceUrl
    this.baseUrl = `${credentials.instanceUrl}/services/data/v59.0`
    return this.testConnection()
  }
  
  async getContacts(query?: string): Promise<CRMContact[]> {
    // Use SOSL (Salesforce Object Search Language) for safer searching
    let endpoint: string
    
    if (query) {
      // Sanitize input and use SOSL for search
      const sanitizedQuery = query.replace(/['"\\]/g, '\\$&').trim()
      if (!sanitizedQuery) {
        // Empty query, return default list
        endpoint = `${this.baseUrl}/query?q=${encodeURIComponent('SELECT Id, Name, Email, Phone, Account.Name, Title FROM Contact LIMIT 50')}`
      } else {
        // Use SOSL for safer searching - automatically handles escaping
        const sosl = `FIND {${sanitizedQuery}*} IN EMAIL FIELDS RETURNING Contact(Id, Name, Email, Phone, Account.Name, Title) LIMIT 50`
        endpoint = `${this.baseUrl}/search?q=${encodeURIComponent(sosl)}`
      }
    } else {
      // No query provided, get default list
      const soql = 'SELECT Id, Name, Email, Phone, Account.Name, Title FROM Contact LIMIT 50'
      endpoint = `${this.baseUrl}/query?q=${encodeURIComponent(soql)}`
    }
    
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })
    
    if (!response.ok) throw new Error('Failed to fetch contacts')
    
    const data = await response.json()
    
    // Handle different response formats (SOSL vs SOQL)
    let records: any[] = []
    if (query && data.searchRecords) {
      // SOSL response format
      records = data.searchRecords || []
    } else if (data.records) {
      // SOQL response format
      records = data.records
    }
    
    return records.map((contact: any) => ({
      id: contact.Id,
      name: contact.Name,
      email: contact.Email,
      phone: contact.Phone,
      company: contact.Account?.Name,
      title: contact.Title
    }))
  }
  
  async getDeals(contactId?: string): Promise<CRMDeal[]> {
    let soql: string
    
    if (contactId) {
      // Validate contactId format (Salesforce IDs are 15 or 18 characters, alphanumeric)
      if (!/^[a-zA-Z0-9]{15,18}$/.test(contactId)) {
        throw new Error('Invalid contact ID format')
      }
      
      // Use parameterized subquery - Salesforce doesn't support parameters, but we validated the input
      soql = `SELECT Id, Name, Amount, StageName, Probability, CloseDate FROM Opportunity WHERE Id IN (SELECT OpportunityId FROM OpportunityContactRole WHERE ContactId = '${contactId}') LIMIT 50`
    } else {
      soql = 'SELECT Id, Name, Amount, StageName, Probability, CloseDate FROM Opportunity LIMIT 50'
    }
    
    const response = await fetch(`${this.baseUrl}/query?q=${encodeURIComponent(soql)}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })
    
    if (!response.ok) throw new Error('Failed to fetch opportunities')
    
    const data = await response.json()
    return (data.records || []).map((opp: any) => ({
      id: opp.Id,
      name: opp.Name,
      value: opp.Amount || 0,
      stage: opp.StageName,
      probability: opp.Probability,
      closeDate: opp.CloseDate ? new Date(opp.CloseDate) : undefined,
      contactIds: []
    }))
  }
  
  async createActivity(data: CRMMeetingData, contactIds: string[]): Promise<string> {
    const note = this.formatMeetingNote(data)
    
    // Create Task
    const response = await fetch(`${this.baseUrl}/sobjects/Task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Subject: `Meeting: ${data.title}`,
        Description: note,
        ActivityDate: data.date.toISOString().split('T')[0],
        Status: 'Completed',
        Priority: 'Normal',
        WhoId: contactIds[0] // Primary contact
      })
    })
    
    if (!response.ok) throw new Error('Failed to create task')
    
    const result = await response.json()
    return result.id
  }
  
  async updateDeal(dealId: string, updates: Partial<CRMDeal>): Promise<boolean> {
    const body: any = {}
    
    if (updates.name) body.Name = updates.name
    if (updates.value) body.Amount = updates.value
    if (updates.stage) body.StageName = updates.stage
    if (updates.probability) body.Probability = updates.probability
    if (updates.closeDate) body.CloseDate = updates.closeDate.toISOString().split('T')[0]
    
    const response = await fetch(`${this.baseUrl}/sobjects/Opportunity/${dealId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    
    return response.ok || response.status === 204
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/limits`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })
      return response.ok
    } catch {
      return false
    }
  }
}

/**
 * CRM Factory
 */
export class CRMServiceFactory {
  static async create(provider: 'hubspot' | 'salesforce', userId: string): Promise<BaseCRMService | null> {
    const supabase = await createClient()
    
    // Get user's CRM integration
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('access_token, metadata')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single()
    
    if (!integration) return null
    
    let service: BaseCRMService
    
    switch (provider) {
      case 'hubspot':
        service = new HubSpotCRMService()
        await service.initialize({ apiKey: integration.access_token })
        break
        
      case 'salesforce':
        service = new SalesforceCRMService()
        await service.initialize({
          accessToken: integration.access_token,
          instanceUrl: integration.metadata?.instance_url
        })
        break
        
      default:
        return null
    }
    
    return service
  }
}