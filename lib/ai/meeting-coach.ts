import { EventEmitter } from 'events'
import { trackMetric } from '@/lib/monitoring'

export interface CoachingSuggestion {
  type: 'speaking_time' | 'participation' | 'pace' | 'engagement' | 'structure'
  message: string
  severity: 'info' | 'warning' | 'suggestion'
  timestamp: Date
}

export interface ParticipantMetrics {
  email: string
  name?: string
  speakingTime: number
  lastSpoke: Date
  turnCount: number
  averageTurnLength: number
  isActive: boolean
}

export interface MeetingMetrics {
  totalDuration: number
  participantMetrics: Map<string, ParticipantMetrics>
  currentSpeaker?: string
  currentTurnStart?: Date
  suggestionHistory: CoachingSuggestion[]
  paceMetrics: {
    wordsPerMinute: number
    silenceRatio: number
  }
}

export class MeetingCoach extends EventEmitter {
  private metrics: MeetingMetrics
  private startTime: Date
  private checkInterval?: NodeJS.Timeout
  private isActive: boolean = false
  
  // Thresholds for suggestions
  private readonly LONG_MONOLOGUE_THRESHOLD = 300 // 5 minutes
  private readonly SILENCE_THRESHOLD = 30 // 30 seconds
  private readonly PARTICIPATION_CHECK_INTERVAL = 600 // 10 minutes
  private readonly IDEAL_TURN_LENGTH = 120 // 2 minutes
  private readonly MIN_PARTICIPATION_RATIO = 0.1 // 10% minimum
  
  constructor() {
    super()
    this.metrics = this.initializeMetrics()
    this.startTime = new Date()
  }
  
  /**
   * Start coaching session
   */
  start(participants: string[]): void {
    this.isActive = true
    this.startTime = new Date()
    this.metrics = this.initializeMetrics()
    
    // Initialize participant metrics
    participants.forEach(participant => {
      this.metrics.participantMetrics.set(participant, {
        email: participant,
        speakingTime: 0,
        lastSpoke: new Date(),
        turnCount: 0,
        averageTurnLength: 0,
        isActive: false
      })
    })
    
    // Start periodic checks
    this.checkInterval = setInterval(() => {
      this.performPeriodicChecks()
    }, 30000) // Check every 30 seconds
    
    trackMetric('meeting_coach.session_started', 1, {
      participants: participants.length
    })
  }
  
  /**
   * Stop coaching session
   */
  stop(): void {
    this.isActive = false
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
    
    // Generate final summary
    const summary = this.generateSessionSummary()
    this.emit('sessionComplete', summary)
    
    trackMetric('meeting_coach.session_completed', 1, {
      duration: this.metrics.totalDuration,
      suggestions: this.metrics.suggestionHistory.length
    })
  }
  
  /**
   * Update speaker change
   */
  updateSpeaker(speaker: string): void {
    if (!this.isActive) return
    
    const now = new Date()
    
    // Update previous speaker's metrics
    if (this.metrics.currentSpeaker && this.metrics.currentTurnStart) {
      const turnDuration = (now.getTime() - this.metrics.currentTurnStart.getTime()) / 1000
      this.updateParticipantMetrics(this.metrics.currentSpeaker, turnDuration)
      
      // Check for long monologue
      if (turnDuration > this.LONG_MONOLOGUE_THRESHOLD) {
        this.addSuggestion({
          type: 'speaking_time',
          message: `${this.metrics.currentSpeaker} ${Math.round(turnDuration / 60)} perce beszél. Ideje másokat is bevonni.`,
          severity: 'warning',
          timestamp: now
        })
      }
    }
    
    // Set new speaker
    this.metrics.currentSpeaker = speaker
    this.metrics.currentTurnStart = now
    
    const participant = this.metrics.participantMetrics.get(speaker)
    if (participant) {
      participant.isActive = true
      participant.lastSpoke = now
    }
  }
  
  /**
   * Track silence periods
   */
  trackSilence(duration: number): void {
    if (!this.isActive || duration < this.SILENCE_THRESHOLD) return
    
    this.addSuggestion({
      type: 'engagement',
      message: `${Math.round(duration)} másodperc csend volt. Tegyen fel egy kérdést a beszélgetés újraindításához.`,
      severity: 'suggestion',
      timestamp: new Date()
    })
  }
  
  /**
   * Update meeting pace metrics
   */
  updatePaceMetrics(wordsPerMinute: number, silenceRatio: number): void {
    if (!this.isActive) return
    
    this.metrics.paceMetrics = { wordsPerMinute, silenceRatio }
    
    // Check for issues
    if (wordsPerMinute > 200) {
      this.addSuggestion({
        type: 'pace',
        message: 'A beszéd tempója túl gyors. Lassítson egy kicsit a jobb érthetőség érdekében.',
        severity: 'suggestion',
        timestamp: new Date()
      })
    } else if (wordsPerMinute < 80 && silenceRatio < 0.2) {
      this.addSuggestion({
        type: 'pace',
        message: 'A beszéd tempója túl lassú. Próbáljon dinamikusabban beszélni.',
        severity: 'suggestion',
        timestamp: new Date()
      })
    }
    
    if (silenceRatio > 0.4) {
      this.addSuggestion({
        type: 'engagement',
        message: 'Sok a szünet a beszélgetésben. Tegyen fel nyitott kérdéseket a részvétel növeléséhez.',
        severity: 'info',
        timestamp: new Date()
      })
    }
  }
  
  /**
   * Suggest asking for input from specific participant
   */
  suggestParticipantInput(): string | null {
    if (!this.isActive) return null
    
    const now = new Date()
    const meetingDuration = (now.getTime() - this.startTime.getTime()) / 1000
    
    // Find least active participants
    const participants = Array.from(this.metrics.participantMetrics.values())
    const leastActive = participants
      .filter(p => {
        const participationRatio = p.speakingTime / meetingDuration
        const timeSinceLastSpoke = (now.getTime() - p.lastSpoke.getTime()) / 1000
        return participationRatio < this.MIN_PARTICIPATION_RATIO && timeSinceLastSpoke > 300
      })
      .sort((a, b) => a.speakingTime - b.speakingTime)
    
    if (leastActive.length > 0) {
      const participant = leastActive[0]
      this.addSuggestion({
        type: 'participation',
        message: `${participant.email} még keveset szólt. Kérdezze meg a véleményét!`,
        severity: 'suggestion',
        timestamp: now
      })
      return participant.email
    }
    
    return null
  }
  
  /**
   * Get real-time coaching suggestions
   */
  getCurrentSuggestions(): CoachingSuggestion[] {
    const recentSuggestions = this.metrics.suggestionHistory
      .filter(s => {
        const age = (new Date().getTime() - s.timestamp.getTime()) / 1000
        return age < 60 // Show suggestions from last minute
      })
      .slice(-3) // Show max 3 suggestions
    
    return recentSuggestions
  }
  
  /**
   * Get participant statistics
   */
  getParticipantStats(): ParticipantMetrics[] {
    return Array.from(this.metrics.participantMetrics.values())
      .sort((a, b) => b.speakingTime - a.speakingTime)
  }
  
  /**
   * Perform periodic checks
   */
  private performPeriodicChecks(): void {
    const now = new Date()
    this.metrics.totalDuration = (now.getTime() - this.startTime.getTime()) / 1000
    
    // Check participation balance
    this.checkParticipationBalance()
    
    // Check for inactive participants
    this.checkInactiveParticipants()
    
    // Check meeting structure
    if (this.metrics.totalDuration > this.PARTICIPATION_CHECK_INTERVAL) {
      this.checkMeetingStructure()
    }
  }
  
  /**
   * Check participation balance
   */
  private checkParticipationBalance(): void {
    const participants = Array.from(this.metrics.participantMetrics.values())
    if (participants.length < 2) return
    
    const totalSpeakingTime = participants.reduce((sum, p) => sum + p.speakingTime, 0)
    if (totalSpeakingTime === 0) return
    
    // Calculate Gini coefficient for speaking time distribution
    const sortedTimes = participants.map(p => p.speakingTime).sort((a, b) => a - b)
    let sumOfDifferences = 0
    let sumOfValues = 0
    
    for (let i = 0; i < sortedTimes.length; i++) {
      sumOfDifferences += (2 * i - sortedTimes.length + 1) * sortedTimes[i]
      sumOfValues += sortedTimes[i]
    }
    
    const gini = sumOfDifferences / (sortedTimes.length * sumOfValues)
    
    // High Gini coefficient indicates unequal distribution
    if (gini > 0.5) {
      const dominant = participants.sort((a, b) => b.speakingTime - a.speakingTime)[0]
      const dominanceRatio = dominant.speakingTime / totalSpeakingTime
      
      if (dominanceRatio > 0.6) {
        this.addSuggestion({
          type: 'participation',
          message: `${dominant.email} a beszélgetés ${Math.round(dominanceRatio * 100)}%-át uralta. Vonja be a többi résztvevőt is!`,
          severity: 'warning',
          timestamp: new Date()
        })
      }
    }
  }
  
  /**
   * Check for inactive participants
   */
  private checkInactiveParticipants(): void {
    const now = new Date()
    const inactiveThreshold = 600000 // 10 minutes
    
    this.metrics.participantMetrics.forEach(participant => {
      const timeSinceLastSpoke = now.getTime() - participant.lastSpoke.getTime()
      
      if (timeSinceLastSpoke > inactiveThreshold && participant.turnCount < 3) {
        this.addSuggestion({
          type: 'participation',
          message: `${participant.email} több mint 10 perce nem szólt. Vonja be a beszélgetésbe!`,
          severity: 'info',
          timestamp: now
        })
      }
    })
  }
  
  /**
   * Check meeting structure
   */
  private checkMeetingStructure(): void {
    const duration = this.metrics.totalDuration / 60 // Convert to minutes
    
    // Suggest break for long meetings
    if (duration > 60 && duration < 65) {
      this.addSuggestion({
        type: 'structure',
        message: 'A meeting már egy órája tart. Fontolja meg egy rövid szünet tartását.',
        severity: 'suggestion',
        timestamp: new Date()
      })
    }
    
    // Suggest wrap-up for very long meetings
    if (duration > 90) {
      this.addSuggestion({
        type: 'structure',
        message: 'A meeting már másfél órája tart. Ideje összefoglalni és lezárni.',
        severity: 'warning',
        timestamp: new Date()
      })
    }
  }
  
  /**
   * Update participant metrics
   */
  private updateParticipantMetrics(email: string, turnDuration: number): void {
    const participant = this.metrics.participantMetrics.get(email)
    if (!participant) return
    
    participant.speakingTime += turnDuration
    participant.turnCount++
    participant.averageTurnLength = participant.speakingTime / participant.turnCount
    
    // Emit event for UI updates
    this.emit('metricsUpdated', this.getParticipantStats())
  }
  
  /**
   * Add suggestion and emit event
   */
  private addSuggestion(suggestion: CoachingSuggestion): void {
    this.metrics.suggestionHistory.push(suggestion)
    this.emit('newSuggestion', suggestion)
    
    trackMetric('meeting_coach.suggestion_generated', 1, {
      type: suggestion.type,
      severity: suggestion.severity
    })
  }
  
  /**
   * Initialize metrics
   */
  private initializeMetrics(): MeetingMetrics {
    return {
      totalDuration: 0,
      participantMetrics: new Map(),
      suggestionHistory: [],
      paceMetrics: {
        wordsPerMinute: 0,
        silenceRatio: 0
      }
    }
  }
  
  /**
   * Generate session summary
   */
  private generateSessionSummary(): any {
    const participants = Array.from(this.metrics.participantMetrics.values())
    const totalSpeakingTime = participants.reduce((sum, p) => sum + p.speakingTime, 0)
    
    return {
      duration: Math.round(this.metrics.totalDuration / 60),
      participantStats: participants.map(p => ({
        email: p.email,
        speakingTimeMinutes: Math.round(p.speakingTime / 60),
        speakingTimePercentage: totalSpeakingTime > 0 
          ? Math.round((p.speakingTime / totalSpeakingTime) * 100)
          : 0,
        turnCount: p.turnCount,
        averageTurnLength: Math.round(p.averageTurnLength)
      })),
      totalSuggestions: this.metrics.suggestionHistory.length,
      suggestionsByType: this.groupSuggestionsByType(),
      meetingBalance: this.calculateMeetingBalance(participants, totalSpeakingTime)
    }
  }
  
  /**
   * Group suggestions by type
   */
  private groupSuggestionsByType(): Record<string, number> {
    const groups: Record<string, number> = {}
    
    this.metrics.suggestionHistory.forEach(suggestion => {
      groups[suggestion.type] = (groups[suggestion.type] || 0) + 1
    })
    
    return groups
  }
  
  /**
   * Calculate meeting balance score
   */
  private calculateMeetingBalance(
    participants: ParticipantMetrics[],
    totalSpeakingTime: number
  ): number {
    if (participants.length < 2 || totalSpeakingTime === 0) return 100
    
    // Calculate standard deviation of speaking times
    const mean = totalSpeakingTime / participants.length
    const variance = participants.reduce((sum, p) => {
      return sum + Math.pow(p.speakingTime - mean, 2)
    }, 0) / participants.length
    const stdDev = Math.sqrt(variance)
    
    // Convert to balance score (0-100)
    const coefficientOfVariation = stdDev / mean
    const balanceScore = Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 50)))
    
    return Math.round(balanceScore)
  }
}

// Export factory function
export function createMeetingCoach(): MeetingCoach {
  return new MeetingCoach()
}