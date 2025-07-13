import { Registry, Counter, Histogram, Gauge } from 'prom-client'

// Create a Registry
export const register = new Registry()

// Define metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
})

export const activeTranscriptions = new Gauge({
  name: 'active_transcriptions',
  help: 'Number of active transcriptions',
})

export const transcriptionDuration = new Histogram({
  name: 'transcription_duration_seconds',
  help: 'Duration of transcriptions in seconds',
  labelNames: ['mode'],
  buckets: [30, 60, 120, 300, 600],
})

export const aiProcessingDuration = new Histogram({
  name: 'ai_processing_duration_seconds',
  help: 'Duration of AI processing in seconds',
  labelNames: ['type'],
  buckets: [1, 5, 10, 30, 60],
})

export const queueSize = new Gauge({
  name: 'queue_size',
  help: 'Current size of job queues',
  labelNames: ['queue_name'],
})

export const databaseConnections = new Gauge({
  name: 'database_connections',
  help: 'Number of database connections',
  labelNames: ['state'],
})

export const cacheHitRate = new Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage',
})

export const organizationCount = new Gauge({
  name: 'organization_count',
  help: 'Total number of organizations',
})

export const monthlyActiveUsers = new Gauge({
  name: 'monthly_active_users',
  help: 'Monthly active users',
})

export const totalMeetingMinutes = new Counter({
  name: 'total_meeting_minutes',
  help: 'Total meeting minutes processed',
  labelNames: ['organization_id'],
})

// Register metrics
register.registerMetric(httpRequestDuration)
register.registerMetric(activeTranscriptions)
register.registerMetric(transcriptionDuration)
register.registerMetric(aiProcessingDuration)
register.registerMetric(queueSize)
register.registerMetric(databaseConnections)
register.registerMetric(cacheHitRate)
register.registerMetric(organizationCount)
register.registerMetric(monthlyActiveUsers)
register.registerMetric(totalMeetingMinutes)

// Export metrics for use in other parts of the app
export const metrics = {
  httpRequestDuration,
  activeTranscriptions,
  transcriptionDuration,
  aiProcessingDuration,
  totalMeetingMinutes,
}