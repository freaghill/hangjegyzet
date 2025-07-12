export interface NotificationWebhook {
  id: string
  organization_id: string
  name: string
  type: 'slack' | 'teams'
  webhook_url: string
  channel?: string | null
  is_active: boolean
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface NotificationPreference {
  id: string
  organization_id: string
  webhook_id: string
  event_type: NotificationEventType
  enabled: boolean
  filters: NotificationFilters
  created_at: string
  updated_at: string
}

export interface NotificationFilters {
  min_duration?: number
  keywords?: string[]
  users?: string[]
}

export interface NotificationLog {
  id: string
  organization_id: string
  webhook_id?: string | null
  meeting_id?: string | null
  event_type: string
  status: 'pending' | 'sent' | 'failed' | 'retrying'
  payload: any
  response?: any
  error?: string | null
  retries: number
  sent_at?: string | null
  created_at: string
}

export type NotificationEventType = 
  | 'meeting_completed'
  | 'meeting_failed'
  | 'action_items_created'
  | 'user_mentioned'
  | 'highlight_created'
  | 'transcription_ready'
  | 'summary_ready'

export interface NotificationPayload {
  eventType: NotificationEventType
  organizationId: string
  meetingId?: string
  data: any
}

// Slack types
export interface SlackWebhookPayload {
  text?: string
  blocks?: any[]
  channel?: string
  username?: string
  icon_emoji?: string
  attachments?: any[]
}

// Teams types
export interface TeamsWebhookPayload {
  '@type': 'MessageCard'
  '@context': 'https://schema.org/extensions'
  themeColor?: string
  summary: string
  sections?: any[]
  potentialAction?: any[]
}