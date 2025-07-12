import { EventEmitter } from 'events'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getWebSocketManager } from './websocket-manager'
import { getLiveAnalysisEngine } from './live-analysis'
import { getAlertEngine } from './alert-engine'
import { getInsightGenerator } from './insight-generator'
import { getAnalyticsStore } from './analytics-store'

interface TranscriptSegment {
  id: string
  meetingId: string
  text: string
  speaker: string
  startTime: number
  endTime: number
  confidence: number
  language: string
  metadata?: Record<string, any>
}

interface MeetingContext {
  id: string
  organizationId: string
  title: string
  participants: string[]
  startTime: number
  endTime?: number
  language: string
  vocabulary: string[]
  topics: string[]
}

interface ProcessedTranscript {
  segment: TranscriptSegment
  enrichments: {
    sentiment?: 'positive' | 'neutral' | 'negative'
    keywords?: string[]
    actionItems?: string[]
    decisions?: string[]
    topics?: string[]
    speakerTurnCount?: number
  }
}

interface PipelineMetrics {
  totalSegments: number
  averageLatency: number
  errorRate: number
  throughput: number
}

export class RealtimeDataPipeline extends EventEmitter {
  private supabase: SupabaseClient
  private meetingContexts: Map<string, MeetingContext> = new Map()
  private transcriptBuffer: Map<string, TranscriptSegment[]> = new Map()
  private processingQueue: Map<string, Promise<void>> = new Map()
  private metrics: Map<string, PipelineMetrics> = new Map()
  private persistenceInterval: NodeJS.Timeout | null = null
  
  constructor() {
    super()
    
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY! // Service key for server-side operations
    )
    
    this.startPersistenceWorker()
    this.setupEventHandlers()
  }
  
  // Set up internal event handlers
  private setupEventHandlers() {
    this.on('segment:received', (segment: TranscriptSegment) => {
      this.processSegment(segment)
    })
    
    this.on('segment:processed', (processed: ProcessedTranscript) => {
      this.broadcastProcessedSegment(processed)
    })
    
    this.on('error', (error: Error, context: any) => {
      console.error('Pipeline error:', error, context)
      this.updateMetrics(context.meetingId, { error: true })
    })
    
    // Set up listeners for real-time components
    const liveAnalysis = getLiveAnalysisEngine()
    const alertEngine = getAlertEngine()
    const insightGenerator = getInsightGenerator()
    const analyticsStore = getAnalyticsStore()
    
    // Forward analysis updates to WebSocket
    liveAnalysis.on('analysis:update', (analysis) => {
      const wsManager = getWebSocketManager()
      wsManager.broadcast('analysis:update', analysis)
    })
    
    // Forward alerts to WebSocket
    alertEngine.on('alert:triggered', (alert) => {
      const wsManager = getWebSocketManager()
      wsManager.broadcast('alert:triggered', alert)
    })
    
    // Forward insights to WebSocket
    insightGenerator.on('insight:generated', (insight) => {
      const wsManager = getWebSocketManager()
      wsManager.broadcast('insight:generated', insight)
    })
    
    // Record engagement metrics from live analysis
    liveAnalysis.on('analysis:update', (analysis) => {
      if (analysis.engagement) {
        for (const participant of analysis.engagement) {
          analyticsStore.recordMetric(
            participant.participantId,
            'engagement_score',
            participant.engagementLevel,
            { speaker: participant.participantId }
          )
        }
      }
      
      // Record overall energy
      if (analysis.overallEnergy) {
        analyticsStore.recordMetric(
          'meeting',
          'energy_level',
          analysis.overallEnergy
        )
      }
    })
  }
  
  // Initialize meeting context
  public async initializeMeeting(meetingId: string): Promise<void> {
    try {
      // Fetch meeting details
      const { data: meeting, error } = await this.supabase
        .from('meetings')
        .select(`
          id,
          organization_id,
          title,
          language,
          created_by,
          organizations!inner(
            settings
          )
        `)
        .eq('id', meetingId)
        .single()
      
      if (error || !meeting) {
        throw new Error('Meeting not found')
      }
      
      // Load organization vocabulary
      const { data: vocabulary } = await this.supabase
        .from('vocabulary_terms')
        .select('term')
        .eq('organization_id', meeting.organization_id)
        .eq('is_active', true)
      
      // Create meeting context
      const context: MeetingContext = {
        id: meetingId,
        organizationId: meeting.organization_id,
        title: meeting.title || 'Untitled Meeting',
        participants: [],
        startTime: Date.now(),
        language: meeting.language || 'hu',
        vocabulary: vocabulary?.map(v => v.term) || [],
        topics: [],
      }
      
      this.meetingContexts.set(meetingId, context)
      
      // Initialize buffer and metrics
      this.transcriptBuffer.set(meetingId, [])
      this.metrics.set(meetingId, {
        totalSegments: 0,
        averageLatency: 0,
        errorRate: 0,
        throughput: 0,
      })
      
      // Initialize new real-time components
      const alertEngine = getAlertEngine()
      const analyticsStore = getAnalyticsStore()
      
      // Load organization alert rules
      await alertEngine.loadOrganizationRules(meeting.organization_id)
      
      // Initialize analytics for the meeting
      analyticsStore.initializeMeeting(meetingId)
      
      this.emit('meeting:initialized', context)
    } catch (error) {
      this.emit('error', error, { meetingId, operation: 'initializeMeeting' })
      throw error
    }
  }
  
  // Process incoming transcript segment
  public async ingestSegment(segment: TranscriptSegment): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Validate segment
      if (!this.validateSegment(segment)) {
        throw new Error('Invalid segment format')
      }
      
      // Get meeting context
      const context = this.meetingContexts.get(segment.meetingId)
      if (!context) {
        await this.initializeMeeting(segment.meetingId)
      }
      
      // Add to buffer for batch processing
      const buffer = this.transcriptBuffer.get(segment.meetingId) || []
      buffer.push(segment)
      this.transcriptBuffer.set(segment.meetingId, buffer)
      
      // Update metrics
      this.updateMetrics(segment.meetingId, {
        latency: Date.now() - startTime,
        segment: true,
      })
      
      // Emit for processing
      this.emit('segment:received', segment)
    } catch (error) {
      this.emit('error', error, { 
        meetingId: segment.meetingId, 
        operation: 'ingestSegment' 
      })
    }
  }
  
  // Process segment with enrichments
  private async processSegment(segment: TranscriptSegment): Promise<void> {
    const context = this.meetingContexts.get(segment.meetingId)
    if (!context) return
    
    try {
      // Enrich segment data
      const enrichments = await this.enrichSegment(segment, context)
      
      // Create processed transcript
      const processed: ProcessedTranscript = {
        segment,
        enrichments,
      }
      
      // Update meeting context
      this.updateMeetingContext(context, processed)
      
      // Process with new real-time components
      const liveAnalysis = getLiveAnalysisEngine()
      const alertEngine = getAlertEngine()
      const insightGenerator = getInsightGenerator()
      const analyticsStore = getAnalyticsStore()
      
      // Add to live analysis engine
      liveAnalysis.addSegment(segment)
      
      // Process alerts
      await alertEngine.processSegment(segment.meetingId, {
        text: segment.text,
        speaker: segment.speaker,
        timestamp: segment.startTime,
        sentiment: enrichments.sentiment
      })
      
      // Add to insight generator
      insightGenerator.addSegment(segment)
      
      // Record analytics metrics
      analyticsStore.recordMetrics(segment.meetingId, {
        word_count: segment.text.split(/\s+/).length,
        speaking_time: segment.endTime - segment.startTime,
        confidence: segment.confidence * 100
      }, {
        speaker: segment.speaker,
        sentiment: enrichments.sentiment
      })
      
      // Record sentiment score
      if (enrichments.sentiment) {
        const sentimentScore = enrichments.sentiment === 'positive' ? 1 : 
                              enrichments.sentiment === 'negative' ? -1 : 0
        analyticsStore.recordMetric(segment.meetingId, 'sentiment_score', sentimentScore, {
          speaker: segment.speaker
        })
      }
      
      // Emit processed segment
      this.emit('segment:processed', processed)
      
      // Check for real-time alerts
      await this.checkForAlerts(processed, context)
    } catch (error) {
      this.emit('error', error, { 
        meetingId: segment.meetingId, 
        operation: 'processSegment' 
      })
    }
  }
  
  // Enrich segment with additional data
  private async enrichSegment(
    segment: TranscriptSegment, 
    context: MeetingContext
  ): Promise<ProcessedTranscript['enrichments']> {
    const enrichments: ProcessedTranscript['enrichments'] = {}
    
    // Extract keywords using vocabulary
    enrichments.keywords = this.extractKeywords(segment.text, context.vocabulary)
    
    // Detect sentiment (simplified)
    enrichments.sentiment = this.analyzeSentiment(segment.text)
    
    // Extract action items
    enrichments.actionItems = this.extractActionItems(segment.text)
    
    // Extract decisions
    enrichments.decisions = this.extractDecisions(segment.text)
    
    // Identify topics
    enrichments.topics = this.identifyTopics(segment.text, context.topics)
    
    // Track speaker turns
    const buffer = this.transcriptBuffer.get(segment.meetingId) || []
    enrichments.speakerTurnCount = buffer.filter(s => s.speaker === segment.speaker).length
    
    return enrichments
  }
  
  // Extract keywords from text
  private extractKeywords(text: string, vocabulary: string[]): string[] {
    const words = text.toLowerCase().split(/\s+/)
    const keywords = new Set<string>()
    
    // Check vocabulary terms
    for (const term of vocabulary) {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        keywords.add(term)
      }
    }
    
    // Common business keywords
    const businessKeywords = [
      'deadline', 'budget', 'milestone', 'project', 'task',
      'meeting', 'decision', 'action', 'priority', 'risk'
    ]
    
    for (const keyword of businessKeywords) {
      if (words.includes(keyword)) {
        keywords.add(keyword)
      }
    }
    
    return Array.from(keywords)
  }
  
  // Analyze sentiment (simplified)
  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['jó', 'kiváló', 'nagyszerű', 'sikeres', 'örülök', 'good', 'excellent', 'great', 'successful', 'happy']
    const negativeWords = ['rossz', 'probléma', 'nehéz', 'aggódik', 'bad', 'problem', 'difficult', 'worried', 'issue']
    
    const words = text.toLowerCase().split(/\s+/)
    let score = 0
    
    for (const word of words) {
      if (positiveWords.some(p => word.includes(p))) score++
      if (negativeWords.some(n => word.includes(n))) score--
    }
    
    if (score > 0) return 'positive'
    if (score < 0) return 'negative'
    return 'neutral'
  }
  
  // Extract action items
  private extractActionItems(text: string): string[] {
    const actionPatterns = [
      /(?:kell|kellene|fogok|fogunk|meg kell|el kell)\s+([^.!?]+)/gi,
      /(?:need to|will|should|must|have to)\s+([^.!?]+)/gi,
      /(?:feladat|teendő|task|todo):\s*([^.!?]+)/gi,
    ]
    
    const actions = new Set<string>()
    
    for (const pattern of actionPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match[1] && match[1].length > 10) {
          actions.add(match[1].trim())
        }
      }
    }
    
    return Array.from(actions)
  }
  
  // Extract decisions
  private extractDecisions(text: string): string[] {
    const decisionPatterns = [
      /(?:döntöttünk|eldöntöttük|megállapodtunk|decided|agreed)\s+([^.!?]+)/gi,
      /(?:döntés|határozat|decision):\s*([^.!?]+)/gi,
    ]
    
    const decisions = new Set<string>()
    
    for (const pattern of decisionPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match[1] && match[1].length > 10) {
          decisions.add(match[1].trim())
        }
      }
    }
    
    return Array.from(decisions)
  }
  
  // Identify topics
  private identifyTopics(text: string, existingTopics: string[]): string[] {
    const topicKeywords: Record<string, string[]> = {
      'budget': ['budget', 'költségvetés', 'pénz', 'money', 'expense', 'kiadás'],
      'timeline': ['deadline', 'határidő', 'timeline', 'időterv', 'schedule', 'ütemezés'],
      'resources': ['resource', 'erőforrás', 'team', 'csapat', 'capacity', 'kapacitás'],
      'technical': ['technical', 'technikai', 'development', 'fejlesztés', 'code', 'kód'],
      'strategy': ['strategy', 'stratégia', 'plan', 'terv', 'goal', 'cél'],
    }
    
    const topics = new Set<string>(existingTopics)
    const words = text.toLowerCase().split(/\s+/)
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => words.includes(keyword))) {
        topics.add(topic)
      }
    }
    
    return Array.from(topics)
  }
  
  // Update meeting context with processed data
  private updateMeetingContext(context: MeetingContext, processed: ProcessedTranscript) {
    // Update participants
    if (!context.participants.includes(processed.segment.speaker)) {
      context.participants.push(processed.segment.speaker)
    }
    
    // Update topics
    if (processed.enrichments.topics) {
      for (const topic of processed.enrichments.topics) {
        if (!context.topics.includes(topic)) {
          context.topics.push(topic)
        }
      }
    }
    
    // Update end time
    context.endTime = processed.segment.endTime
  }
  
  // Check for real-time alerts
  private async checkForAlerts(processed: ProcessedTranscript, context: MeetingContext) {
    // Check for negative sentiment patterns
    if (processed.enrichments.sentiment === 'negative') {
      const buffer = this.transcriptBuffer.get(context.id) || []
      const recentNegative = buffer
        .slice(-10)
        .filter(s => this.analyzeSentiment(s.text) === 'negative')
        .length
      
      if (recentNegative >= 3) {
        this.emit('alert:negative_sentiment', {
          meetingId: context.id,
          message: 'Multiple negative sentiments detected',
          severity: 'warning',
        })
      }
    }
    
    // Check for long monologues
    if (processed.enrichments.speakerTurnCount && processed.enrichments.speakerTurnCount > 20) {
      this.emit('alert:monologue', {
        meetingId: context.id,
        speaker: processed.segment.speaker,
        message: 'Long monologue detected',
        severity: 'info',
      })
    }
    
    // Check for action items
    if (processed.enrichments.actionItems && processed.enrichments.actionItems.length > 0) {
      this.emit('alert:action_items', {
        meetingId: context.id,
        items: processed.enrichments.actionItems,
        message: 'New action items detected',
        severity: 'info',
      })
    }
  }
  
  // Broadcast processed segment
  private broadcastProcessedSegment(processed: ProcessedTranscript) {
    const wsManager = getWebSocketManager()
    
    // Broadcast enriched transcription
    wsManager.broadcastTranscription({
      id: processed.segment.id,
      meetingId: processed.segment.meetingId,
      text: processed.segment.text,
      speaker: processed.segment.speaker,
      timestamp: processed.segment.startTime,
      confidence: processed.segment.confidence,
      isFinal: true,
      ...processed.enrichments,
    })
  }
  
  // Validate segment format
  private validateSegment(segment: TranscriptSegment): boolean {
    return !!(
      segment.id &&
      segment.meetingId &&
      segment.text &&
      segment.speaker &&
      typeof segment.startTime === 'number' &&
      typeof segment.endTime === 'number' &&
      typeof segment.confidence === 'number'
    )
  }
  
  // Update pipeline metrics
  private updateMetrics(meetingId: string, update: any) {
    const metrics = this.metrics.get(meetingId)
    if (!metrics) return
    
    if (update.segment) {
      metrics.totalSegments++
    }
    
    if (update.latency) {
      metrics.averageLatency = 
        (metrics.averageLatency * (metrics.totalSegments - 1) + update.latency) / 
        metrics.totalSegments
    }
    
    if (update.error) {
      metrics.errorRate = 
        (metrics.errorRate * metrics.totalSegments + 1) / 
        (metrics.totalSegments + 1)
    }
    
    // Calculate throughput (segments per second)
    const runtime = (Date.now() - (this.meetingContexts.get(meetingId)?.startTime || Date.now())) / 1000
    metrics.throughput = metrics.totalSegments / runtime
  }
  
  // Persistence worker
  private startPersistenceWorker() {
    this.persistenceInterval = setInterval(async () => {
      for (const [meetingId, buffer] of this.transcriptBuffer.entries()) {
        if (buffer.length > 0) {
          await this.persistTranscripts(meetingId, buffer)
          this.transcriptBuffer.set(meetingId, [])
        }
      }
    }, 5000) // Persist every 5 seconds
  }
  
  // Persist transcripts to database
  private async persistTranscripts(meetingId: string, segments: TranscriptSegment[]) {
    try {
      // Convert segments to database format
      const transcriptData = segments.map(segment => ({
        meeting_id: meetingId,
        text: segment.text,
        speaker: segment.speaker,
        start_time: segment.startTime,
        end_time: segment.endTime,
        confidence: segment.confidence,
        language: segment.language,
        metadata: segment.metadata,
        created_at: new Date().toISOString(),
      }))
      
      // Batch insert
      const { error } = await this.supabase
        .from('meeting_transcripts')
        .insert(transcriptData)
      
      if (error) {
        throw error
      }
      
      // Update meeting transcript
      await this.updateMeetingTranscript(meetingId)
    } catch (error) {
      this.emit('error', error, { 
        meetingId, 
        operation: 'persistTranscripts',
        segmentCount: segments.length,
      })
    }
  }
  
  // Update meeting transcript
  private async updateMeetingTranscript(meetingId: string) {
    const context = this.meetingContexts.get(meetingId)
    if (!context) return
    
    try {
      // Get all transcripts for the meeting
      const { data: transcripts } = await this.supabase
        .from('meeting_transcripts')
        .select('text, speaker, start_time')
        .eq('meeting_id', meetingId)
        .order('start_time')
      
      if (!transcripts) return
      
      // Format transcript
      const formattedTranscript = transcripts.map(t => ({
        speaker: t.speaker,
        text: t.text,
        timestamp: t.start_time,
      }))
      
      // Update meeting record
      await this.supabase
        .from('meetings')
        .update({
          transcript: formattedTranscript,
          speakers: context.participants,
          duration_seconds: Math.floor((context.endTime || Date.now() - context.startTime) / 1000),
          updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId)
    } catch (error) {
      this.emit('error', error, { 
        meetingId, 
        operation: 'updateMeetingTranscript' 
      })
    }
  }
  
  // Get meeting metrics
  public getMetrics(meetingId: string): PipelineMetrics | undefined {
    return this.metrics.get(meetingId)
  }
  
  // Get meeting context
  public getMeetingContext(meetingId: string): MeetingContext | undefined {
    return this.meetingContexts.get(meetingId)
  }
  
  // End meeting
  public async endMeeting(meetingId: string): Promise<void> {
    const context = this.meetingContexts.get(meetingId)
    if (!context) return
    
    try {
      // Persist any remaining transcripts
      const buffer = this.transcriptBuffer.get(meetingId) || []
      if (buffer.length > 0) {
        await this.persistTranscripts(meetingId, buffer)
      }
      
      // End analytics tracking
      const analyticsStore = getAnalyticsStore()
      analyticsStore.endMeeting(meetingId)
      
      // Get final insights and save them
      const insightGenerator = getInsightGenerator()
      const finalSummary = insightGenerator.getSummary()
      const finalInsights = insightGenerator.getRecentInsights(100)
      
      // Save insights to database
      if (finalInsights.length > 0) {
        await this.supabase
          .from('meeting_insights')
          .insert({
            meeting_id: meetingId,
            insights: finalInsights,
            summary: finalSummary,
            created_at: new Date().toISOString()
          })
      }
      
      // Update meeting status
      await this.supabase
        .from('meetings')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
        })
        .eq('id', meetingId)
      
      // Clean up components
      insightGenerator.reset()
      
      // Clean up
      this.meetingContexts.delete(meetingId)
      this.transcriptBuffer.delete(meetingId)
      this.metrics.delete(meetingId)
      
      this.emit('meeting:ended', { meetingId, context })
    } catch (error) {
      this.emit('error', error, { meetingId, operation: 'endMeeting' })
    }
  }
  
  // Cleanup
  public destroy() {
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval)
    }
    
    // Persist all remaining data
    for (const [meetingId] of this.transcriptBuffer.entries()) {
      this.endMeeting(meetingId)
    }
    
    this.removeAllListeners()
  }
}

// Singleton instance
let dataPipeline: RealtimeDataPipeline | null = null

export function getRealtimeDataPipeline(): RealtimeDataPipeline {
  if (!dataPipeline) {
    dataPipeline = new RealtimeDataPipeline()
  }
  return dataPipeline
}