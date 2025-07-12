import { EventEmitter } from 'events'

interface SpeakerMetrics {
  speakerId: string
  speakerName: string
  totalSpeakingTime: number
  lastSpokeAt: number
  turnCount: number
  averageTurnLength: number
  interruptionCount: number
  interruptedCount: number
  silencePeriods: number
}

interface MeetingPaceMetrics {
  currentPace: 'too-slow' | 'normal' | 'too-fast'
  wordsPerMinute: number
  turnFrequency: number // turns per minute
  silenceRatio: number // percentage of meeting that is silence
}

interface EnergyMetrics {
  currentLevel: number // 0-100
  trend: 'increasing' | 'stable' | 'decreasing'
  lastBreak: number | null
  continuousMeetingTime: number
  suggestBreak: boolean
}

interface CoachingTip {
  id: string
  type: 'balance' | 'participation' | 'pace' | 'energy' | 'interruption' | 'cultural'
  severity: 'info' | 'warning' | 'alert'
  title: string
  message: string
  actionable: string
  timestamp: number
}

interface CulturalContext {
  directnessLevel: number // 1-10 scale for Hungarian business norms
  formalityLevel: number // 1-10 scale
  hierarchyRespect: boolean
  consensusBuilding: boolean
}

interface TranscriptSegment {
  id: string
  speaker: string
  text: string
  startTime: number
  endTime: number
  confidence: number
}

export class LiveCoach extends EventEmitter {
  private speakerMetrics: Map<string, SpeakerMetrics> = new Map()
  private segments: TranscriptSegment[] = []
  private coachingTips: CoachingTip[] = []
  private meetingStartTime: number = Date.now()
  private lastBreakTime: number | null = null
  private currentSpeaker: string | null = null
  private speakerStartTime: number | null = null
  private silenceStartTime: number | null = null
  private totalSilenceTime: number = 0
  
  // Configurable thresholds
  private readonly SILENCE_THRESHOLD = 5000 // 5 seconds
  private readonly PARTICIPATION_WARNING_THRESHOLD = 300000 // 5 minutes
  private readonly MONOLOGUE_WARNING_THRESHOLD = 120000 // 2 minutes
  private readonly INTERRUPTION_THRESHOLD = 500 // 500ms overlap
  private readonly BREAK_SUGGESTION_INTERVAL = 2700000 // 45 minutes
  private readonly OPTIMAL_WPM_RANGE = { min: 140, max: 180 }
  private readonly OPTIMAL_TURN_FREQUENCY = { min: 2, max: 8 } // per minute
  
  // Hungarian business culture norms
  private readonly HUNGARIAN_NORMS: CulturalContext = {
    directnessLevel: 7,
    formalityLevel: 8,
    hierarchyRespect: true,
    consensusBuilding: true
  }
  
  constructor() {
    super()
    this.startMonitoring()
  }
  
  public processSegment(segment: TranscriptSegment): void {
    this.segments.push(segment)
    
    // Update speaker metrics
    this.updateSpeakerMetrics(segment)
    
    // Check for interruptions
    this.checkInterruptions(segment)
    
    // Monitor participation balance
    this.checkParticipationBalance()
    
    // Analyze meeting pace
    this.analyzeMeetingPace()
    
    // Monitor energy levels
    this.monitorEnergyLevels()
    
    // Check cultural norms
    this.checkCulturalNorms(segment)
    
    // Keep segment buffer manageable
    if (this.segments.length > 1000) {
      this.segments = this.segments.slice(-500)
    }
  }
  
  private updateSpeakerMetrics(segment: TranscriptSegment): void {
    let metrics = this.speakerMetrics.get(segment.speaker)
    
    if (!metrics) {
      metrics = {
        speakerId: segment.speaker,
        speakerName: segment.speaker,
        totalSpeakingTime: 0,
        lastSpokeAt: segment.startTime,
        turnCount: 0,
        averageTurnLength: 0,
        interruptionCount: 0,
        interruptedCount: 0,
        silencePeriods: 0
      }
      this.speakerMetrics.set(segment.speaker, metrics)
    }
    
    // Check for speaker change
    if (this.currentSpeaker !== segment.speaker) {
      // Check for silence period
      if (this.speakerStartTime && segment.startTime - this.speakerStartTime > this.SILENCE_THRESHOLD) {
        this.totalSilenceTime += segment.startTime - this.speakerStartTime
        metrics.silencePeriods++
      }
      
      this.currentSpeaker = segment.speaker
      this.speakerStartTime = segment.startTime
      metrics.turnCount++
    }
    
    // Update speaking time
    const turnLength = segment.endTime - segment.startTime
    metrics.totalSpeakingTime += turnLength
    metrics.averageTurnLength = metrics.totalSpeakingTime / metrics.turnCount
    metrics.lastSpokeAt = segment.endTime
    
    // Check for monologue
    if (turnLength > this.MONOLOGUE_WARNING_THRESHOLD) {
      this.generateCoachingTip({
        type: 'balance',
        severity: 'warning',
        title: 'Long monologue detected',
        message: `${segment.speaker} has been speaking for over ${Math.round(turnLength / 60000)} minutes`,
        actionable: 'Consider pausing to invite questions or input from other participants'
      })
    }
  }
  
  private checkInterruptions(segment: TranscriptSegment): void {
    const recentSegments = this.segments.slice(-10)
    
    for (let i = recentSegments.length - 2; i >= 0; i--) {
      const prevSegment = recentSegments[i]
      
      // Check if this segment overlaps with previous
      if (prevSegment.speaker !== segment.speaker &&
          segment.startTime < prevSegment.endTime &&
          prevSegment.endTime - segment.startTime > this.INTERRUPTION_THRESHOLD) {
        
        // Update interruption counts
        const interrupter = this.speakerMetrics.get(segment.speaker)
        const interrupted = this.speakerMetrics.get(prevSegment.speaker)
        
        if (interrupter) interrupter.interruptionCount++
        if (interrupted) interrupted.interruptedCount++
        
        // Generate coaching tip if frequent interruptions
        if (interrupter && interrupter.interruptionCount > 3) {
          this.generateCoachingTip({
            type: 'interruption',
            severity: 'warning',
            title: 'Frequent interruptions detected',
            message: `${segment.speaker} has interrupted others ${interrupter.interruptionCount} times`,
            actionable: 'Allow speakers to finish their thoughts before contributing'
          })
        }
        
        break
      }
    }
  }
  
  private checkParticipationBalance(): void {
    const now = Date.now()
    const meetingDuration = now - this.meetingStartTime
    
    if (meetingDuration < 60000) return // Wait at least 1 minute
    
    const activeSpeakers = Array.from(this.speakerMetrics.values())
    const totalSpeakers = activeSpeakers.length
    
    // Check for silent participants
    for (const metrics of activeSpeakers) {
      const silenceTime = now - metrics.lastSpokeAt
      
      if (silenceTime > this.PARTICIPATION_WARNING_THRESHOLD) {
        this.generateCoachingTip({
          type: 'participation',
          severity: 'alert',
          title: 'Silent participant detected',
          message: `${metrics.speakerName} hasn't spoken for ${Math.round(silenceTime / 60000)} minutes`,
          actionable: `Consider asking ${metrics.speakerName} for their input or perspective`
        })
      }
    }
    
    // Calculate participation imbalance
    if (totalSpeakers >= 3) {
      const totalSpeakingTime = activeSpeakers.reduce((sum, m) => sum + m.totalSpeakingTime, 0)
      const averageSpeakingTime = totalSpeakingTime / totalSpeakers
      
      // Check for dominance
      for (const metrics of activeSpeakers) {
        const participationRatio = metrics.totalSpeakingTime / totalSpeakingTime
        
        if (participationRatio > 0.5 && totalSpeakers > 2) {
          this.generateCoachingTip({
            type: 'balance',
            severity: 'warning',
            title: 'Unbalanced participation',
            message: `${metrics.speakerName} is dominating the conversation (${Math.round(participationRatio * 100)}% of speaking time)`,
            actionable: 'Encourage other participants to share their thoughts'
          })
        }
      }
    }
  }
  
  private analyzeMeetingPace(): void {
    const recentSegments = this.segments.slice(-50)
    if (recentSegments.length < 10) return
    
    // Calculate words per minute
    const totalWords = recentSegments.reduce((sum, seg) => sum + seg.text.split(/\s+/).length, 0)
    const timeSpan = recentSegments[recentSegments.length - 1].endTime - recentSegments[0].startTime
    const wordsPerMinute = (totalWords / timeSpan) * 60000
    
    // Calculate turn frequency
    const speakerChanges = recentSegments.filter((seg, i) => 
      i > 0 && seg.speaker !== recentSegments[i - 1].speaker
    ).length
    const turnFrequency = (speakerChanges / timeSpan) * 60000
    
    // Calculate silence ratio
    const silenceRatio = this.totalSilenceTime / (Date.now() - this.meetingStartTime)
    
    const paceMetrics: MeetingPaceMetrics = {
      currentPace: 'normal',
      wordsPerMinute,
      turnFrequency,
      silenceRatio
    }
    
    // Determine pace
    if (wordsPerMinute < this.OPTIMAL_WPM_RANGE.min) {
      paceMetrics.currentPace = 'too-slow'
      this.generateCoachingTip({
        type: 'pace',
        severity: 'info',
        title: 'Meeting pace is slow',
        message: `Current pace is ${Math.round(wordsPerMinute)} words per minute`,
        actionable: 'Consider moving the discussion forward or checking if participants need clarification'
      })
    } else if (wordsPerMinute > this.OPTIMAL_WPM_RANGE.max) {
      paceMetrics.currentPace = 'too-fast'
      this.generateCoachingTip({
        type: 'pace',
        severity: 'warning',
        title: 'Meeting pace is too fast',
        message: `Current pace is ${Math.round(wordsPerMinute)} words per minute`,
        actionable: 'Slow down to ensure everyone can follow and contribute'
      })
    }
    
    // Check turn frequency
    if (turnFrequency < this.OPTIMAL_TURN_FREQUENCY.min) {
      this.generateCoachingTip({
        type: 'pace',
        severity: 'info',
        title: 'Low interaction frequency',
        message: 'Participants are taking very long turns',
        actionable: 'Encourage more back-and-forth dialogue'
      })
    }
    
    this.emit('pace:update', paceMetrics)
  }
  
  private monitorEnergyLevels(): void {
    const now = Date.now()
    const continuousMeetingTime = this.lastBreakTime 
      ? now - this.lastBreakTime 
      : now - this.meetingStartTime
    
    // Calculate current energy based on various factors
    let energyLevel = 100
    
    // Decrease energy over time
    energyLevel -= Math.min(30, (continuousMeetingTime / this.BREAK_SUGGESTION_INTERVAL) * 30)
    
    // Decrease for high silence ratio
    const silenceRatio = this.totalSilenceTime / (now - this.meetingStartTime)
    if (silenceRatio > 0.2) energyLevel -= 10
    
    // Decrease for imbalanced participation
    const speakers = Array.from(this.speakerMetrics.values())
    if (speakers.length > 0) {
      const participationVariance = this.calculateParticipationVariance(speakers)
      if (participationVariance > 0.3) energyLevel -= 10
    }
    
    energyLevel = Math.max(0, Math.min(100, energyLevel))
    
    const energyMetrics: EnergyMetrics = {
      currentLevel: energyLevel,
      trend: this.calculateEnergyTrend(energyLevel),
      lastBreak: this.lastBreakTime,
      continuousMeetingTime,
      suggestBreak: continuousMeetingTime > this.BREAK_SUGGESTION_INTERVAL
    }
    
    // Suggest break if needed
    if (energyMetrics.suggestBreak) {
      this.generateCoachingTip({
        type: 'energy',
        severity: 'alert',
        title: 'Break recommended',
        message: `The meeting has been running for ${Math.round(continuousMeetingTime / 60000)} minutes`,
        actionable: 'Consider taking a 5-10 minute break to maintain focus and energy'
      })
    }
    
    this.emit('energy:update', energyMetrics)
  }
  
  private checkCulturalNorms(segment: TranscriptSegment): void {
    const text = segment.text.toLowerCase()
    
    // Check for overly casual language in Hungarian business context
    const casualPhrases = ['szia', 'hello', 'hi', 'hey', 'cső', 'oké', 'ok']
    const formalGreetings = ['jó napot', 'tisztelt', 'kedves', 'üdvözlöm']
    
    const hasCasual = casualPhrases.some(phrase => text.includes(phrase))
    const hasFormal = formalGreetings.some(phrase => text.includes(phrase))
    
    // In first few minutes, check formality
    if (Date.now() - this.meetingStartTime < 300000 && hasCasual && !hasFormal) {
      this.generateCoachingTip({
        type: 'cultural',
        severity: 'info',
        title: 'Consider formality level',
        message: 'Hungarian business culture typically starts with formal greetings',
        actionable: 'Use "Jó napot" or "Tisztelt [Name]" for initial greetings unless you know the participants well'
      })
    }
    
    // Check for interrupting senior members (if hierarchy detected)
    if (this.detectHierarchyViolation(segment)) {
      this.generateCoachingTip({
        type: 'cultural',
        severity: 'warning',
        title: 'Respect hierarchy',
        message: 'In Hungarian business culture, it\'s important to show deference to senior members',
        actionable: 'Allow senior participants to express their views fully before contributing'
      })
    }
    
    // Check for consensus building
    const consensusPhrases = ['egyetértünk', 'agree', 'közös', 'together', 'mindannyian', 'all of us']
    const hasConsensus = consensusPhrases.some(phrase => text.includes(phrase))
    
    if (hasConsensus) {
      this.emit('cultural:consensus', { speaker: segment.speaker, timestamp: segment.startTime })
    }
  }
  
  private detectHierarchyViolation(segment: TranscriptSegment): boolean {
    // This is a simplified check - in real implementation, would need role information
    const seniorityMarkers = ['vezérigazgató', 'ceo', 'elnök', 'president', 'igazgató', 'director']
    const recentSegments = this.segments.slice(-5)
    
    for (const recent of recentSegments) {
      if (recent.speaker !== segment.speaker) {
        const isSenior = seniorityMarkers.some(marker => 
          recent.speaker.toLowerCase().includes(marker)
        )
        if (isSenior && segment.startTime < recent.endTime + 1000) {
          return true
        }
      }
    }
    
    return false
  }
  
  private calculateParticipationVariance(speakers: SpeakerMetrics[]): number {
    if (speakers.length === 0) return 0
    
    const totalTime = speakers.reduce((sum, s) => sum + s.totalSpeakingTime, 0)
    const avgTime = totalTime / speakers.length
    
    const variance = speakers.reduce((sum, s) => {
      const diff = s.totalSpeakingTime - avgTime
      return sum + (diff * diff)
    }, 0) / speakers.length
    
    return Math.sqrt(variance) / avgTime
  }
  
  private calculateEnergyTrend(currentLevel: number): 'increasing' | 'stable' | 'decreasing' {
    // In a real implementation, would track energy history
    // For now, base on meeting duration
    const duration = Date.now() - this.meetingStartTime
    
    if (duration < 900000) return 'stable' // First 15 minutes
    if (currentLevel < 50) return 'decreasing'
    if (currentLevel > 80) return 'increasing'
    return 'stable'
  }
  
  private generateCoachingTip(tip: Omit<CoachingTip, 'id' | 'timestamp'>): void {
    // Avoid duplicate tips
    const recentTips = this.coachingTips.filter(t => 
      Date.now() - t.timestamp < 300000 && // Last 5 minutes
      t.type === tip.type &&
      t.title === tip.title
    )
    
    if (recentTips.length > 0) return
    
    const coachingTip: CoachingTip = {
      ...tip,
      id: `tip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }
    
    this.coachingTips.push(coachingTip)
    this.emit('coaching:tip', coachingTip)
    
    // Keep tips manageable
    if (this.coachingTips.length > 100) {
      this.coachingTips = this.coachingTips.slice(-50)
    }
  }
  
  private startMonitoring(): void {
    // Periodic checks every 30 seconds
    setInterval(() => {
      this.checkParticipationBalance()
      this.analyzeMeetingPace()
      this.monitorEnergyLevels()
    }, 30000)
  }
  
  public recordBreak(): void {
    this.lastBreakTime = Date.now()
    this.emit('break:recorded', { timestamp: this.lastBreakTime })
  }
  
  public getSpeakerMetrics(): SpeakerMetrics[] {
    return Array.from(this.speakerMetrics.values())
  }
  
  public getRecentTips(limit: number = 10): CoachingTip[] {
    return this.coachingTips
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp)
  }
  
  public getMetricsSummary() {
    const speakers = this.getSpeakerMetrics()
    const totalSpeakingTime = speakers.reduce((sum, s) => sum + s.totalSpeakingTime, 0)
    const meetingDuration = Date.now() - this.meetingStartTime
    
    return {
      meetingDuration,
      totalSpeakers: speakers.length,
      totalSpeakingTime,
      totalSilenceTime: this.totalSilenceTime,
      silenceRatio: this.totalSilenceTime / meetingDuration,
      averageTurnLength: totalSpeakingTime / speakers.reduce((sum, s) => sum + s.turnCount, 0),
      speakerMetrics: speakers
    }
  }
  
  public reset(): void {
    this.speakerMetrics.clear()
    this.segments = []
    this.coachingTips = []
    this.meetingStartTime = Date.now()
    this.lastBreakTime = null
    this.currentSpeaker = null
    this.speakerStartTime = null
    this.silenceStartTime = null
    this.totalSilenceTime = 0
  }
  
  public destroy(): void {
    this.reset()
    this.removeAllListeners()
  }
}

// Export singleton instance
let liveCoach: LiveCoach | null = null

export function getLiveCoach(): LiveCoach {
  if (!liveCoach) {
    liveCoach = new LiveCoach()
  }
  return liveCoach
}