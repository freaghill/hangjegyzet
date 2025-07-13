export type EventType = 
  | 'user_action'
  | 'meeting_action'
  | 'search_action'
  | 'team_action'
  | 'system_event'

export interface AnalyticsEvent {
  eventType: EventType
  eventName: string
  properties?: Record<string, any>
  userId?: string
  teamId?: string
}

export type MetricType = 
  | 'transcription'
  | 'search'
  | 'upload'
  | 'processing'
  | 'api_call'

export interface PerformanceMetric {
  metricType: MetricType
  metricName: string
  value: number
  unit: string
  metadata?: Record<string, any>
}

export type BusinessMetricType = 
  | 'usage'
  | 'engagement'
  | 'retention'
  | 'growth'
  | 'conversion'

export interface BusinessMetric {
  metricDate: Date
  metricType: BusinessMetricType
  metricName: string
  value: number
  metadata?: Record<string, any>
}

// Usage Analytics
export interface UsageStats {
  totalUsers: number
  activeUsers: {
    daily: number
    weekly: number
    monthly: number
  }
  newUsers: {
    daily: number
    weekly: number
    monthly: number
  }
  meetings: {
    total: number
    totalDuration: number
    averageDuration: number
    byStatus: Record<string, number>
  }
  transcriptions: {
    total: number
    totalWords: number
    byLanguage: Record<string, number>
    byMode: Record<string, number>
  }
  teams: {
    total: number
    averageSize: number
    activeTeams: number
  }
}

// Performance Analytics
export interface PerformanceStats {
  transcription: {
    averageTime: number
    successRate: number
    queueLength: number
    processingSpeed: number // words per minute
  }
  upload: {
    averageTime: number
    averageSize: number
    successRate: number
    bandwidth: number // MB/s
  }
  search: {
    averageLatency: number
    queriesPerMinute: number
    cacheHitRate: number
  }
  api: {
    averageLatency: number
    requestsPerMinute: number
    errorRate: number
    uptime: number
  }
}

// Business Analytics
export interface BusinessStats {
  growth: {
    userGrowthRate: number
    meetingGrowthRate: number
    revenueGrowthRate?: number
  }
  engagement: {
    dau: number // Daily Active Users
    wau: number // Weekly Active Users
    mau: number // Monthly Active Users
    stickiness: number // DAU/MAU ratio
    sessionDuration: number
    sessionsPerUser: number
  }
  retention: {
    day1: number
    day7: number
    day30: number
    churnRate: number
  }
  conversion: {
    signupToFirstMeeting: number
    freeToProConversion?: number
    inviteAcceptanceRate: number
  }
  usage: {
    topFeatures: Array<{ feature: string; usage: number }>
    topSearchQueries: Array<{ query: string; count: number }>
    peakUsageHours: Array<{ hour: number; usage: number }>
    averageMeetingsPerUser: number
  }
}