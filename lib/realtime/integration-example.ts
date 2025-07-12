/**
 * Real-time Meeting Intelligence Integration Example
 * 
 * This file demonstrates how to integrate all real-time features:
 * - Live Coaching
 * - Suggestion Engine
 * - Fact Checker
 * - Decision Tracker
 */

import { EventEmitter } from 'events'
import { getLiveCoach } from './live-coach'
import { getSuggestionEngine } from './suggestion-engine'
import { getFactChecker } from './fact-checker'
import { getDecisionTracker } from './decision-tracker'

interface TranscriptSegment {
  id: string
  meetingId: string
  speaker: string
  text: string
  startTime: number
  endTime: number
  confidence: number
}

interface MeetingIntelligenceEvent {
  type: 'coaching' | 'suggestion' | 'factcheck' | 'decision' | 'alert'
  severity: 'info' | 'warning' | 'error'
  title: string
  message: string
  data?: any
  timestamp: number
}

export class MeetingIntelligenceOrchestrator extends EventEmitter {
  private liveCoach = getLiveCoach()
  private suggestionEngine = getSuggestionEngine()
  private factChecker = getFactChecker()
  private decisionTracker = getDecisionTracker()
  private events: MeetingIntelligenceEvent[] = []
  private meetingId: string
  private isActive = false

  constructor(meetingId: string, meetingType: 'sales' | 'team' | 'review' | 'planning' | 'general' = 'general') {
    super()
    this.meetingId = meetingId
    
    // Initialize engines
    this.suggestionEngine = getSuggestionEngine(meetingType)
    
    // Setup event listeners
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Live Coach events
    this.liveCoach.on('coaching:tip', (tip) => {
      this.addEvent({
        type: 'coaching',
        severity: tip.severity,
        title: tip.title,
        message: tip.message,
        data: tip
      })
    })

    this.liveCoach.on('pace:update', (metrics) => {
      if (metrics.currentPace !== 'normal') {
        this.addEvent({
          type: 'coaching',
          severity: 'info',
          title: 'Meeting pace update',
          message: `Current pace is ${metrics.currentPace}`,
          data: metrics
        })
      }
    })

    this.liveCoach.on('energy:update', (metrics) => {
      if (metrics.suggestBreak) {
        this.addEvent({
          type: 'alert',
          severity: 'warning',
          title: 'Break recommended',
          message: 'Consider taking a short break to maintain energy',
          data: metrics
        })
      }
    })

    // Suggestion Engine events
    this.suggestionEngine.on('suggestion:new', (suggestion) => {
      this.addEvent({
        type: 'suggestion',
        severity: suggestion.priority === 'high' ? 'warning' : 'info',
        title: suggestion.title,
        message: suggestion.content,
        data: suggestion
      })
    })

    this.suggestionEngine.on('action-item:detected', (actionItem) => {
      this.addEvent({
        type: 'suggestion',
        severity: actionItem.needsClarification ? 'warning' : 'info',
        title: 'Action item detected',
        message: actionItem.description,
        data: actionItem
      })
    })

    // Fact Checker events
    this.factChecker.on('fact-check:result', (result) => {
      this.addEvent({
        type: 'factcheck',
        severity: result.severity,
        title: `Fact check: ${result.type}`,
        message: result.issue,
        data: result
      })
    })

    this.factChecker.on('commitment:detected', (commitment) => {
      this.addEvent({
        type: 'factcheck',
        severity: 'info',
        title: 'Commitment detected',
        message: `${commitment.madeBy}: ${commitment.description}`,
        data: commitment
      })
    })

    this.factChecker.on('commitment:overdue', (commitment) => {
      this.addEvent({
        type: 'alert',
        severity: 'error',
        title: 'Overdue commitment',
        message: `Commitment by ${commitment.madeBy} is overdue: ${commitment.description}`,
        data: commitment
      })
    })

    // Decision Tracker events
    this.decisionTracker.on('decision:proposed', (decision) => {
      this.addEvent({
        type: 'decision',
        severity: 'info',
        title: 'Decision proposed',
        message: decision.description,
        data: decision
      })
    })

    this.decisionTracker.on('decision:finalized', (decision) => {
      this.addEvent({
        type: 'decision',
        severity: decision.status === 'agreed' ? 'info' : 'warning',
        title: `Decision ${decision.status}`,
        message: decision.description,
        data: decision
      })
    })

    this.decisionTracker.on('decision:conflict', (conflict) => {
      this.addEvent({
        type: 'alert',
        severity: conflict.severity,
        title: 'Decision conflict detected',
        message: conflict.description,
        data: conflict
      })
    })

    this.decisionTracker.on('decision:low-quality', ({ decision, suggestions }) => {
      this.addEvent({
        type: 'alert',
        severity: 'warning',
        title: 'Low quality decision',
        message: `Decision needs improvement: ${suggestions.join(', ')}`,
        data: { decision, suggestions }
      })
    })
  }

  private addEvent(event: Omit<MeetingIntelligenceEvent, 'timestamp'>): void {
    const fullEvent: MeetingIntelligenceEvent = {
      ...event,
      timestamp: Date.now()
    }
    
    this.events.push(fullEvent)
    this.emit('intelligence:event', fullEvent)
    
    // Keep events manageable
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500)
    }
  }

  public async processSegment(segment: TranscriptSegment): Promise<void> {
    if (!this.isActive) {
      throw new Error('Meeting intelligence is not active')
    }

    // Process through all engines in parallel
    await Promise.all([
      this.liveCoach.processSegment(segment),
      this.suggestionEngine.processSegment(segment),
      this.factChecker.processSegment(segment),
      this.decisionTracker.processSegment(segment)
    ])

    // Cross-engine intelligence
    this.performCrossEngineAnalysis(segment)
  }

  private performCrossEngineAnalysis(segment: TranscriptSegment): void {
    // Example: Combine insights from multiple engines
    
    // If a decision is being discussed and fact checker finds issues
    const activeDecision = this.decisionTracker.getActiveDiscussion()
    if (activeDecision) {
      const recentFactChecks = this.factChecker.getResults()
        .filter(r => r.timestamp > activeDecision.timestamp)
      
      if (recentFactChecks.some(r => r.severity === 'error')) {
        this.addEvent({
          type: 'alert',
          severity: 'warning',
          title: 'Decision based on incorrect facts',
          message: 'Current decision discussion contains factual errors that should be addressed',
          data: { decision: activeDecision, factChecks: recentFactChecks }
        })
      }
    }

    // If coaching detects imbalance and suggestion engine has unanswered questions
    const coachingSummary = this.liveCoach.getMetricsSummary()
    const unansweredQuestions = this.suggestionEngine.getUnansweredQuestions()
    
    if (coachingSummary.silenceRatio > 0.2 && unansweredQuestions.length > 0) {
      this.addEvent({
        type: 'suggestion',
        severity: 'warning',
        title: 'Address unanswered questions',
        message: `There are ${unansweredQuestions.length} unanswered questions and high silence in the meeting`,
        data: { questions: unansweredQuestions, silenceRatio: coachingSummary.silenceRatio }
      })
    }
  }

  public start(): void {
    this.isActive = true
    this.reset()
    this.emit('intelligence:started', { meetingId: this.meetingId })
  }

  public stop(): void {
    this.isActive = false
    this.emit('intelligence:stopped', { 
      meetingId: this.meetingId,
      summary: this.getSummary()
    })
  }

  public getSummary() {
    return {
      meetingId: this.meetingId,
      duration: this.liveCoach.getMetricsSummary().meetingDuration,
      coaching: {
        tips: this.liveCoach.getRecentTips(),
        metrics: this.liveCoach.getMetricsSummary()
      },
      suggestions: {
        total: this.suggestionEngine.getSuggestions().length,
        actionItems: this.suggestionEngine.getActionItems(),
        unansweredQuestions: this.suggestionEngine.getUnansweredQuestions()
      },
      factChecking: {
        issues: this.factChecker.getResults(),
        commitments: this.factChecker.getCommitments()
      },
      decisions: {
        total: this.decisionTracker.getDecisions().length,
        agreed: this.decisionTracker.getDecisions('agreed'),
        conflicts: this.decisionTracker.getConflicts()
      },
      events: this.events.slice(-50) // Last 50 events
    }
  }

  public getRecentEvents(limit = 10): MeetingIntelligenceEvent[] {
    return this.events.slice(-limit)
  }

  public recordBreak(): void {
    this.liveCoach.recordBreak()
    this.addEvent({
      type: 'alert',
      severity: 'info',
      title: 'Break recorded',
      message: 'Meeting break has been recorded'
    })
  }

  public reset(): void {
    this.liveCoach.reset()
    this.suggestionEngine.reset()
    this.factChecker.reset()
    this.decisionTracker.reset()
    this.events = []
  }

  public destroy(): void {
    this.isActive = false
    this.liveCoach.destroy()
    this.suggestionEngine.destroy()
    this.factChecker.destroy()
    this.decisionTracker.destroy()
    this.removeAllListeners()
  }
}

// Usage example
export function createMeetingIntelligence(
  meetingId: string, 
  meetingType?: 'sales' | 'team' | 'review' | 'planning' | 'general'
): MeetingIntelligenceOrchestrator {
  return new MeetingIntelligenceOrchestrator(meetingId, meetingType)
}

// Example integration with WebSocket for real-time streaming
export class RealTimeMeetingProcessor {
  private intelligence: MeetingIntelligenceOrchestrator
  private websocket: WebSocket | null = null

  constructor(meetingId: string, meetingType?: 'sales' | 'team' | 'review' | 'planning' | 'general') {
    this.intelligence = createMeetingIntelligence(meetingId, meetingType)
    
    // Listen for intelligence events
    this.intelligence.on('intelligence:event', (event) => {
      this.broadcastEvent(event)
    })
  }

  public connect(wsUrl: string): void {
    this.websocket = new WebSocket(wsUrl)
    
    this.websocket.onmessage = async (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'transcript') {
        await this.intelligence.processSegment(data.segment)
      }
    }
    
    this.websocket.onopen = () => {
      this.intelligence.start()
    }
    
    this.websocket.onclose = () => {
      this.intelligence.stop()
    }
  }

  private broadcastEvent(event: MeetingIntelligenceEvent): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'intelligence',
        event
      }))
    }
  }

  public disconnect(): void {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
    this.intelligence.destroy()
  }
}