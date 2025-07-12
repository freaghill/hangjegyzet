import { EventEmitter } from 'events'

interface TimeSeriesDataPoint {
  timestamp: number
  value: number
  metadata?: Record<string, any>
}

interface MetricDefinition {
  name: string
  type: 'gauge' | 'counter' | 'histogram'
  unit: string
  description: string
  aggregations: ('sum' | 'avg' | 'min' | 'max' | 'count')[]
}

interface AggregatedMetric {
  metric: string
  period: 'minute' | 'hour' | 'day'
  startTime: number
  endTime: number
  aggregations: {
    sum?: number
    avg?: number
    min?: number
    max?: number
    count?: number
  }
}

interface MeetingAnalytics {
  meetingId: string
  startTime: number
  endTime?: number
  metrics: Map<string, TimeSeriesDataPoint[]>
  aggregations: Map<string, AggregatedMetric[]>
}

interface ExportFormat {
  type: 'json' | 'csv' | 'excel'
  includeRawData: boolean
  includeAggregations: boolean
  metrics?: string[]
  timeRange?: { start: number; end: number }
}

export class AnalyticsStore extends EventEmitter {
  private meetings: Map<string, MeetingAnalytics> = new Map()
  private metricDefinitions: Map<string, MetricDefinition> = new Map()
  private retentionPeriodMs = 7 * 24 * 60 * 60 * 1000 // 7 days
  private aggregationInterval: NodeJS.Timeout | null = null
  private compressionInterval: NodeJS.Timeout | null = null
  
  constructor() {
    super()
    this.initializeMetricDefinitions()
    this.startBackgroundTasks()
  }
  
  // Initialize standard metric definitions
  private initializeMetricDefinitions(): void {
    const metrics: MetricDefinition[] = [
      {
        name: 'sentiment_score',
        type: 'gauge',
        unit: 'score',
        description: 'Sentiment score from -1 (negative) to 1 (positive)',
        aggregations: ['avg', 'min', 'max']
      },
      {
        name: 'energy_level',
        type: 'gauge',
        unit: 'percentage',
        description: 'Meeting energy level from 0 to 100',
        aggregations: ['avg', 'min', 'max']
      },
      {
        name: 'speaking_time',
        type: 'counter',
        unit: 'milliseconds',
        description: 'Total speaking time per participant',
        aggregations: ['sum', 'avg']
      },
      {
        name: 'word_count',
        type: 'counter',
        unit: 'words',
        description: 'Number of words spoken',
        aggregations: ['sum', 'avg']
      },
      {
        name: 'interruptions',
        type: 'counter',
        unit: 'count',
        description: 'Number of interruptions detected',
        aggregations: ['sum', 'count']
      },
      {
        name: 'questions_asked',
        type: 'counter',
        unit: 'count',
        description: 'Number of questions asked',
        aggregations: ['sum', 'count']
      },
      {
        name: 'topic_changes',
        type: 'counter',
        unit: 'count',
        description: 'Number of topic changes',
        aggregations: ['sum', 'count']
      },
      {
        name: 'engagement_score',
        type: 'gauge',
        unit: 'percentage',
        description: 'Participant engagement score from 0 to 100',
        aggregations: ['avg', 'min', 'max']
      },
      {
        name: 'response_time',
        type: 'histogram',
        unit: 'milliseconds',
        description: 'Time between question and answer',
        aggregations: ['avg', 'min', 'max', 'count']
      },
      {
        name: 'monologue_duration',
        type: 'histogram',
        unit: 'milliseconds',
        description: 'Duration of uninterrupted speaking',
        aggregations: ['avg', 'max', 'count']
      }
    ]
    
    for (const metric of metrics) {
      this.metricDefinitions.set(metric.name, metric)
    }
  }
  
  // Initialize meeting analytics
  public initializeMeeting(meetingId: string): void {
    if (!this.meetings.has(meetingId)) {
      const analytics: MeetingAnalytics = {
        meetingId,
        startTime: Date.now(),
        metrics: new Map(),
        aggregations: new Map()
      }
      
      // Initialize metric storage
      for (const [name] of this.metricDefinitions) {
        analytics.metrics.set(name, [])
        analytics.aggregations.set(name, [])
      }
      
      this.meetings.set(meetingId, analytics)
      this.emit('meeting:initialized', { meetingId })
    }
  }
  
  // Record metric value
  public recordMetric(
    meetingId: string,
    metricName: string,
    value: number,
    metadata?: Record<string, any>
  ): void {
    const meeting = this.meetings.get(meetingId)
    if (!meeting) {
      this.initializeMeeting(meetingId)
      return this.recordMetric(meetingId, metricName, value, metadata)
    }
    
    const metric = this.metricDefinitions.get(metricName)
    if (!metric) {
      console.warn(`Unknown metric: ${metricName}`)
      return
    }
    
    const dataPoint: TimeSeriesDataPoint = {
      timestamp: Date.now(),
      value,
      metadata
    }
    
    const series = meeting.metrics.get(metricName) || []
    series.push(dataPoint)
    meeting.metrics.set(metricName, series)
    
    // Emit for real-time monitoring
    this.emit('metric:recorded', {
      meetingId,
      metric: metricName,
      value,
      timestamp: dataPoint.timestamp
    })
    
    // Check for anomalies
    this.checkForAnomalies(meetingId, metricName, value)
  }
  
  // Record multiple metrics at once
  public recordMetrics(
    meetingId: string,
    metrics: Record<string, number>,
    metadata?: Record<string, any>
  ): void {
    for (const [name, value] of Object.entries(metrics)) {
      this.recordMetric(meetingId, name, value, metadata)
    }
  }
  
  // Get current metric value
  public getCurrentMetric(meetingId: string, metricName: string): number | null {
    const meeting = this.meetings.get(meetingId)
    if (!meeting) return null
    
    const series = meeting.metrics.get(metricName)
    if (!series || series.length === 0) return null
    
    return series[series.length - 1].value
  }
  
  // Get metric time series
  public getTimeSeries(
    meetingId: string,
    metricName: string,
    timeRange?: { start: number; end: number }
  ): TimeSeriesDataPoint[] {
    const meeting = this.meetings.get(meetingId)
    if (!meeting) return []
    
    const series = meeting.metrics.get(metricName) || []
    
    if (timeRange) {
      return series.filter(point => 
        point.timestamp >= timeRange.start && 
        point.timestamp <= timeRange.end
      )
    }
    
    return series
  }
  
  // Get aggregated metrics
  public getAggregatedMetrics(
    meetingId: string,
    metricName: string,
    period: 'minute' | 'hour' | 'day' = 'minute'
  ): AggregatedMetric[] {
    const meeting = this.meetings.get(meetingId)
    if (!meeting) return []
    
    const aggregations = meeting.aggregations.get(metricName) || []
    return aggregations.filter(agg => agg.period === period)
  }
  
  // Perform aggregation for a metric
  private aggregateMetric(
    meetingId: string,
    metricName: string,
    period: 'minute' | 'hour' | 'day'
  ): void {
    const meeting = this.meetings.get(meetingId)
    if (!meeting) return
    
    const metric = this.metricDefinitions.get(metricName)
    if (!metric) return
    
    const series = meeting.metrics.get(metricName) || []
    if (series.length === 0) return
    
    const periodMs = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000
    }[period]
    
    const now = Date.now()
    const startTime = Math.floor(now / periodMs) * periodMs
    const endTime = startTime + periodMs
    
    // Get data points for current period
    const periodData = series.filter(point =>
      point.timestamp >= startTime && point.timestamp < endTime
    )
    
    if (periodData.length === 0) return
    
    const values = periodData.map(p => p.value)
    const aggregation: AggregatedMetric = {
      metric: metricName,
      period,
      startTime,
      endTime,
      aggregations: {}
    }
    
    // Calculate requested aggregations
    if (metric.aggregations.includes('sum')) {
      aggregation.aggregations.sum = values.reduce((a, b) => a + b, 0)
    }
    
    if (metric.aggregations.includes('avg')) {
      aggregation.aggregations.avg = values.reduce((a, b) => a + b, 0) / values.length
    }
    
    if (metric.aggregations.includes('min')) {
      aggregation.aggregations.min = Math.min(...values)
    }
    
    if (metric.aggregations.includes('max')) {
      aggregation.aggregations.max = Math.max(...values)
    }
    
    if (metric.aggregations.includes('count')) {
      aggregation.aggregations.count = values.length
    }
    
    // Store aggregation
    const aggregations = meeting.aggregations.get(metricName) || []
    
    // Remove existing aggregation for same period if exists
    const existingIndex = aggregations.findIndex(agg =>
      agg.period === period &&
      agg.startTime === startTime
    )
    
    if (existingIndex >= 0) {
      aggregations[existingIndex] = aggregation
    } else {
      aggregations.push(aggregation)
    }
    
    meeting.aggregations.set(metricName, aggregations)
  }
  
  // Check for anomalies in metrics
  private checkForAnomalies(meetingId: string, metricName: string, value: number): void {
    const series = this.getTimeSeries(meetingId, metricName)
    if (series.length < 10) return // Need enough data
    
    // Calculate statistics for anomaly detection
    const recentValues = series.slice(-20).map(p => p.value)
    const mean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length
    const stdDev = Math.sqrt(variance)
    
    // Check if value is an outlier (> 2 standard deviations)
    if (Math.abs(value - mean) > 2 * stdDev) {
      this.emit('anomaly:detected', {
        meetingId,
        metric: metricName,
        value,
        mean,
        stdDev,
        severity: Math.abs(value - mean) > 3 * stdDev ? 'high' : 'medium'
      })
    }
  }
  
  // Start background tasks
  private startBackgroundTasks(): void {
    // Aggregation task - runs every minute
    this.aggregationInterval = setInterval(() => {
      for (const [meetingId, meeting] of this.meetings) {
        if (!meeting.endTime) { // Only for active meetings
          for (const [metricName] of this.metricDefinitions) {
            this.aggregateMetric(meetingId, metricName, 'minute')
          }
        }
      }
    }, 60 * 1000)
    
    // Compression task - runs every hour
    this.compressionInterval = setInterval(() => {
      this.compressOldData()
    }, 60 * 60 * 1000)
  }
  
  // Compress old data to save memory
  private compressOldData(): void {
    const now = Date.now()
    const compressionThreshold = 60 * 60 * 1000 // 1 hour
    
    for (const [meetingId, meeting] of this.meetings) {
      for (const [metricName, series] of meeting.metrics) {
        if (series.length < 1000) continue // Don't compress small datasets
        
        // Group old data points by minute
        const compressed: TimeSeriesDataPoint[] = []
        const recent: TimeSeriesDataPoint[] = []
        
        for (const point of series) {
          if (now - point.timestamp > compressionThreshold) {
            // Compress old data
            const minuteKey = Math.floor(point.timestamp / 60000) * 60000
            const existing = compressed.find(p => p.timestamp === minuteKey)
            
            if (existing) {
              // Average values for same minute
              existing.value = (existing.value + point.value) / 2
            } else {
              compressed.push({
                timestamp: minuteKey,
                value: point.value,
                metadata: { compressed: true }
              })
            }
          } else {
            recent.push(point)
          }
        }
        
        // Replace series with compressed + recent data
        meeting.metrics.set(metricName, [...compressed, ...recent])
      }
    }
  }
  
  // Export analytics data
  public async exportAnalytics(
    meetingId: string,
    format: ExportFormat
  ): Promise<string | Buffer> {
    const meeting = this.meetings.get(meetingId)
    if (!meeting) {
      throw new Error('Meeting not found')
    }
    
    const data: any = {
      meetingId,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      metrics: {}
    }
    
    // Filter metrics if specified
    const metricsToExport = format.metrics || Array.from(this.metricDefinitions.keys())
    
    for (const metricName of metricsToExport) {
      const metricData: any = {
        definition: this.metricDefinitions.get(metricName)
      }
      
      if (format.includeRawData) {
        let series = meeting.metrics.get(metricName) || []
        
        // Apply time range filter if specified
        if (format.timeRange) {
          series = series.filter(point =>
            point.timestamp >= format.timeRange!.start &&
            point.timestamp <= format.timeRange!.end
          )
        }
        
        metricData.timeSeries = series
      }
      
      if (format.includeAggregations) {
        metricData.aggregations = meeting.aggregations.get(metricName) || []
      }
      
      data.metrics[metricName] = metricData
    }
    
    switch (format.type) {
      case 'json':
        return JSON.stringify(data, null, 2)
      
      case 'csv':
        return this.exportToCSV(data)
      
      case 'excel':
        // Would use a library like xlsx
        throw new Error('Excel export not implemented')
      
      default:
        throw new Error(`Unknown export format: ${format.type}`)
    }
  }
  
  // Export to CSV format
  private exportToCSV(data: any): string {
    const lines: string[] = []
    
    // Header
    lines.push('Meeting Analytics Export')
    lines.push(`Meeting ID: ${data.meetingId}`)
    lines.push(`Start Time: ${new Date(data.startTime).toISOString()}`)
    lines.push(`End Time: ${data.endTime ? new Date(data.endTime).toISOString() : 'Ongoing'}`)
    lines.push('')
    
    // Metrics data
    for (const [metricName, metricData] of Object.entries(data.metrics)) {
      lines.push(`Metric: ${metricName}`)
      
      if (metricData.timeSeries) {
        lines.push('Timestamp,Value')
        for (const point of metricData.timeSeries as TimeSeriesDataPoint[]) {
          lines.push(`${new Date(point.timestamp).toISOString()},${point.value}`)
        }
      }
      
      if (metricData.aggregations && metricData.aggregations.length > 0) {
        lines.push('')
        lines.push('Period,Start,End,Sum,Avg,Min,Max,Count')
        
        for (const agg of metricData.aggregations as AggregatedMetric[]) {
          const row = [
            agg.period,
            new Date(agg.startTime).toISOString(),
            new Date(agg.endTime).toISOString(),
            agg.aggregations.sum || '',
            agg.aggregations.avg || '',
            agg.aggregations.min || '',
            agg.aggregations.max || '',
            agg.aggregations.count || ''
          ]
          lines.push(row.join(','))
        }
      }
      
      lines.push('')
    }
    
    return lines.join('\n')
  }
  
  // Get meeting summary
  public getMeetingSummary(meetingId: string): any {
    const meeting = this.meetings.get(meetingId)
    if (!meeting) return null
    
    const summary: any = {
      meetingId,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      duration: meeting.endTime ? meeting.endTime - meeting.startTime : Date.now() - meeting.startTime,
      metrics: {}
    }
    
    // Calculate summary statistics for each metric
    for (const [metricName, series] of meeting.metrics) {
      if (series.length === 0) continue
      
      const values = series.map(p => p.value)
      summary.metrics[metricName] = {
        count: values.length,
        last: values[values.length - 1],
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length
      }
    }
    
    return summary
  }
  
  // End meeting and finalize analytics
  public endMeeting(meetingId: string): void {
    const meeting = this.meetings.get(meetingId)
    if (!meeting) return
    
    meeting.endTime = Date.now()
    
    // Perform final aggregations
    for (const [metricName] of this.metricDefinitions) {
      this.aggregateMetric(meetingId, metricName, 'minute')
      this.aggregateMetric(meetingId, metricName, 'hour')
    }
    
    this.emit('meeting:ended', {
      meetingId,
      summary: this.getMeetingSummary(meetingId)
    })
  }
  
  // Clean up old meetings
  public cleanupOldMeetings(): void {
    const cutoff = Date.now() - this.retentionPeriodMs
    
    for (const [meetingId, meeting] of this.meetings) {
      if (meeting.endTime && meeting.endTime < cutoff) {
        this.meetings.delete(meetingId)
        this.emit('meeting:cleaned', { meetingId })
      }
    }
  }
  
  // Set retention period
  public setRetentionPeriod(days: number): void {
    this.retentionPeriodMs = days * 24 * 60 * 60 * 1000
  }
  
  // Get all active meetings
  public getActiveMeetings(): string[] {
    return Array.from(this.meetings.entries())
      .filter(([, meeting]) => !meeting.endTime)
      .map(([id]) => id)
  }
  
  // Clean up resources
  public destroy(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval)
    }
    
    if (this.compressionInterval) {
      clearInterval(this.compressionInterval)
    }
    
    this.meetings.clear()
    this.metricDefinitions.clear()
    this.removeAllListeners()
  }
}

// Export singleton instance
let analyticsStore: AnalyticsStore | null = null

export function getAnalyticsStore(): AnalyticsStore {
  if (!analyticsStore) {
    analyticsStore = new AnalyticsStore()
  }
  return analyticsStore
}