import { createClient } from '@/lib/supabase/client'
import { trackMetric } from '@/lib/monitoring'

export interface SpeakingTimeAnalysis {
  participant: string
  name?: string
  totalTime: number
  percentage: number
  turnCount: number
  averageTurnLength: number
  interruptions: number
  interruptedBy: Array<{ participant: string; count: number }>
}

export interface EffectivenessMetrics {
  score: number // 0-100
  objectivesMet: number
  totalObjectives: number
  actionItemsGenerated: number
  decisionsReached: number
  participationBalance: number
  timeEfficiency: number
  clarityScore: number
}

export interface PatternDetection {
  patterns: Array<{
    type: 'recurring_issue' | 'behavioral' | 'structural' | 'temporal' | 'topical'
    description: string
    occurrences: number
    meetings: string[]
    severity: 'low' | 'medium' | 'high'
    recommendation: string
  }>
  insights: string[]
}

export interface EnergyAnalysis {
  timeline: Array<{
    timestamp: number
    energyLevel: number // 0-100
    participationRate: number
    speakingPace: number
  }>
  averageEnergy: number
  peakPeriods: Array<{ start: number; end: number; level: number }>
  lowPeriods: Array<{ start: number; end: number; level: number }>
}

export interface EngagementMetrics {
  overall: number // 0-100
  byParticipant: Array<{
    participant: string
    score: number
    factors: {
      speakingTime: number
      responseTime: number
      questionCount: number
      contributionQuality: number
    }
  }>
  trends: Array<{
    period: string
    score: number
  }>
}

export interface MeetingAnalytics {
  meetingId: string
  speakingTime: SpeakingTimeAnalysis[]
  effectiveness: EffectivenessMetrics
  patterns: PatternDetection
  energy: EnergyAnalysis
  engagement: EngagementMetrics
  recommendations: string[]
}

export class MeetingAnalyticsEngine {
  private supabase = createClient()
  
  /**
   * Analyze complete meeting analytics
   */
  async analyzeMeeting(meetingId: string): Promise<MeetingAnalytics> {
    const startTime = Date.now()
    
    try {
      // Fetch meeting data
      const { data: meeting, error } = await this.supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single()
      
      if (error || !meeting) {
        throw new Error('Meeting not found')
      }
      
      // Run all analyses in parallel
      const [speakingTime, effectiveness, patterns, energy, engagement] = await Promise.all([
        this.analyzeSpeakingTime(meeting),
        this.calculateEffectivenessScore(meeting),
        this.detectPatterns(meeting),
        this.analyzeEnergyLevels(meeting),
        this.calculateEngagementScore(meeting)
      ])
      
      // Generate recommendations based on all analyses
      const recommendations = this.generateRecommendations({
        speakingTime,
        effectiveness,
        patterns,
        energy,
        engagement
      })
      
      const analytics: MeetingAnalytics = {
        meetingId,
        speakingTime,
        effectiveness,
        patterns,
        energy,
        engagement,
        recommendations
      }
      
      // Track metrics
      trackMetric('ai.meeting_analytics_generated', 1, {
        duration: (Date.now() - startTime) / 1000,
        effectiveness_score: effectiveness.score,
        engagement_score: engagement.overall
      })
      
      return analytics
    } catch (error) {
      console.error('Error analyzing meeting:', error)
      trackMetric('ai.meeting_analytics_error', 1)
      throw error
    }
  }
  
  /**
   * Analyze speaking time distribution with interruption detection
   */
  async analyzeSpeakingTime(meeting: any): Promise<SpeakingTimeAnalysis[]> {
    const participants = new Map<string, SpeakingTimeAnalysis>()
    const interruptionMap = new Map<string, Map<string, number>>()
    
    if (!meeting.transcript?.segments) {
      return []
    }
    
    const segments = meeting.transcript.segments
    let totalSpeakingTime = 0
    
    // First pass: calculate basic speaking metrics
    segments.forEach((segment: any, index: number) => {
      const speaker = segment.speaker || 'Ismeretlen'
      
      if (!participants.has(speaker)) {
        participants.set(speaker, {
          participant: speaker,
          name: segment.name,
          totalTime: 0,
          percentage: 0,
          turnCount: 0,
          averageTurnLength: 0,
          interruptions: 0,
          interruptedBy: []
        })
      }
      
      const participant = participants.get(speaker)!
      const duration = segment.end - segment.start
      
      participant.totalTime += duration
      participant.turnCount++
      totalSpeakingTime += duration
      
      // Detect interruptions (overlap with previous segment)
      if (index > 0) {
        const prevSegment = segments[index - 1]
        if (segment.start < prevSegment.end && prevSegment.speaker !== speaker) {
          participant.interruptions++
          
          // Track who interrupted whom
          if (!interruptionMap.has(prevSegment.speaker)) {
            interruptionMap.set(prevSegment.speaker, new Map())
          }
          const interrupters = interruptionMap.get(prevSegment.speaker)!
          interrupters.set(speaker, (interrupters.get(speaker) || 0) + 1)
        }
      }
    })
    
    // Second pass: calculate percentages and averages
    const analyses: SpeakingTimeAnalysis[] = []
    
    participants.forEach((participant, speaker) => {
      participant.percentage = totalSpeakingTime > 0 
        ? Math.round((participant.totalTime / totalSpeakingTime) * 100)
        : 0
      
      participant.averageTurnLength = participant.turnCount > 0
        ? Math.round(participant.totalTime / participant.turnCount)
        : 0
      
      // Add interruption details
      const interruptedByMap = interruptionMap.get(speaker)
      if (interruptedByMap) {
        participant.interruptedBy = Array.from(interruptedByMap.entries())
          .map(([interrupter, count]) => ({ participant: interrupter, count }))
          .sort((a, b) => b.count - a.count)
      }
      
      analyses.push(participant)
    })
    
    // Sort by total speaking time
    return analyses.sort((a, b) => b.totalTime - a.totalTime)
  }
  
  /**
   * Calculate meeting effectiveness score
   */
  async calculateEffectivenessScore(meeting: any): Promise<EffectivenessMetrics> {
    const metrics: EffectivenessMetrics = {
      score: 0,
      objectivesMet: 0,
      totalObjectives: 0,
      actionItemsGenerated: 0,
      decisionsReached: 0,
      participationBalance: 0,
      timeEfficiency: 0,
      clarityScore: 0
    }
    
    // Extract objectives from agenda or template
    if (meeting.template?.sections) {
      metrics.totalObjectives = meeting.template.sections.filter((s: any) => s.required).length
    } else if (meeting.agenda) {
      metrics.totalObjectives = Array.isArray(meeting.agenda) ? meeting.agenda.length : 0
    }
    
    // Count completed objectives from summary
    if (meeting.summary && metrics.totalObjectives > 0) {
      // Simple heuristic: check if summary mentions agenda items
      metrics.objectivesMet = Math.min(
        metrics.totalObjectives,
        Math.floor(meeting.summary.length / 100) // Rough estimate
      )
    }
    
    // Count action items
    if (meeting.action_items && Array.isArray(meeting.action_items)) {
      metrics.actionItemsGenerated = meeting.action_items.length
    }
    
    // Count decisions (look for decision keywords in transcript)
    if (meeting.transcript?.segments) {
      const decisionKeywords = ['döntöttünk', 'megállapodtunk', 'eldöntöttük', 'határoztunk', 'agreed', 'decided', 'decision']
      let decisionCount = 0
      
      meeting.transcript.segments.forEach((segment: any) => {
        if (segment.text && decisionKeywords.some(keyword => 
          segment.text.toLowerCase().includes(keyword)
        )) {
          decisionCount++
        }
      })
      
      metrics.decisionsReached = Math.min(decisionCount, 10) // Cap at 10
    }
    
    // Calculate participation balance (using Gini coefficient)
    const speakingTimes = await this.analyzeSpeakingTime(meeting)
    if (speakingTimes.length > 1) {
      const times = speakingTimes.map(s => s.totalTime).sort((a, b) => a - b)
      let sumOfDifferences = 0
      let sumOfValues = 0
      
      for (let i = 0; i < times.length; i++) {
        sumOfDifferences += (2 * i - times.length + 1) * times[i]
        sumOfValues += times[i]
      }
      
      const gini = sumOfValues > 0 ? sumOfDifferences / (times.length * sumOfValues) : 0
      metrics.participationBalance = Math.round((1 - gini) * 100)
    } else {
      metrics.participationBalance = 100
    }
    
    // Calculate time efficiency
    if (meeting.scheduled_duration && meeting.actual_duration) {
      const efficiency = Math.min(meeting.scheduled_duration / meeting.actual_duration, 1)
      metrics.timeEfficiency = Math.round(efficiency * 100)
    } else if (meeting.actual_duration) {
      // Assume 60 minutes is optimal
      const efficiency = Math.min(60 / (meeting.actual_duration / 60), 1)
      metrics.timeEfficiency = Math.round(efficiency * 100)
    }
    
    // Calculate clarity score (based on summary quality and action items clarity)
    let clarityPoints = 0
    if (meeting.summary && meeting.summary.length > 100) clarityPoints += 25
    if (metrics.actionItemsGenerated > 0) clarityPoints += 25
    if (meeting.action_items?.every((item: any) => item.assignee && item.deadline)) clarityPoints += 25
    if (meeting.next_steps && meeting.next_steps.length > 0) clarityPoints += 25
    metrics.clarityScore = clarityPoints
    
    // Calculate overall effectiveness score
    const weights = {
      objectives: 0.25,
      actions: 0.20,
      decisions: 0.15,
      participation: 0.15,
      timeEfficiency: 0.15,
      clarity: 0.10
    }
    
    metrics.score = Math.round(
      (metrics.totalObjectives > 0 ? (metrics.objectivesMet / metrics.totalObjectives) * weights.objectives * 100 : weights.objectives * 50) +
      (Math.min(metrics.actionItemsGenerated / 5, 1) * weights.actions * 100) +
      (Math.min(metrics.decisionsReached / 3, 1) * weights.decisions * 100) +
      (metrics.participationBalance * weights.participation) +
      (metrics.timeEfficiency * weights.timeEfficiency) +
      (metrics.clarityScore * weights.clarity)
    )
    
    return metrics
  }
  
  /**
   * Detect patterns across meetings
   */
  async detectPatterns(meeting: any): Promise<PatternDetection> {
    const patterns: PatternDetection['patterns'] = []
    const insights: string[] = []
    
    try {
      // Get historical meetings for pattern detection
      const { data: historicalMeetings } = await this.supabase
        .from('meetings')
        .select('id, title, created_at, summary, action_items, transcript, participants')
        .eq('organization_id', meeting.organization_id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (!historicalMeetings || historicalMeetings.length < 3) {
        insights.push('Nincs elég adat a minták felismeréséhez')
        return { patterns, insights }
      }
      
      // Detect recurring issues
      const issueFrequency = new Map<string, Set<string>>()
      const commonPhrases = [
        'ugyanaz a probléma', 'még mindig', 'továbbra is', 'megint', 'újra',
        'same issue', 'still', 'again', 'recurring', 'continues'
      ]
      
      historicalMeetings.forEach(hMeeting => {
        if (hMeeting.summary) {
          commonPhrases.forEach(phrase => {
            if (hMeeting.summary.toLowerCase().includes(phrase)) {
              const key = `recurring_${phrase}`
              if (!issueFrequency.has(key)) {
                issueFrequency.set(key, new Set())
              }
              issueFrequency.get(key)!.add(hMeeting.id)
            }
          })
        }
      })
      
      // Add recurring issue patterns
      issueFrequency.forEach((meetings, key) => {
        if (meetings.size >= 3) {
          patterns.push({
            type: 'recurring_issue',
            description: 'Ugyanaz a téma többször előkerült az elmúlt meetingeken',
            occurrences: meetings.size,
            meetings: Array.from(meetings).slice(0, 5),
            severity: meetings.size > 5 ? 'high' : 'medium',
            recommendation: 'Érdemes lehet egy dedikált problem-solving sessiont tartani'
          })
        }
      })
      
      // Detect behavioral patterns (dominant speakers)
      const speakerDominance = new Map<string, number>()
      let meetingsAnalyzed = 0
      
      for (const hMeeting of historicalMeetings.slice(0, 10)) {
        const speakingAnalysis = await this.analyzeSpeakingTime(hMeeting)
        if (speakingAnalysis.length > 0) {
          meetingsAnalyzed++
          const dominant = speakingAnalysis[0]
          if (dominant.percentage > 40) {
            speakerDominance.set(
              dominant.participant,
              (speakerDominance.get(dominant.participant) || 0) + 1
            )
          }
        }
      }
      
      speakerDominance.forEach((count, speaker) => {
        if (count >= meetingsAnalyzed * 0.5) {
          patterns.push({
            type: 'behavioral',
            description: `${speaker} rendszeresen dominálja a meetingeket (${Math.round(count / meetingsAnalyzed * 100)}%-ban)`,
            occurrences: count,
            meetings: [],
            severity: count >= meetingsAnalyzed * 0.7 ? 'high' : 'medium',
            recommendation: 'Használjon facilitálási technikákat a kiegyensúlyozottabb részvételért'
          })
        }
      })
      
      // Detect temporal patterns (meeting time effectiveness)
      const timeOfDayEffectiveness = new Map<number, { count: number; totalScore: number }>()
      
      for (const hMeeting of historicalMeetings.slice(0, 20)) {
        const hour = new Date(hMeeting.created_at).getHours()
        const effectiveness = await this.calculateEffectivenessScore(hMeeting)
        
        if (!timeOfDayEffectiveness.has(hour)) {
          timeOfDayEffectiveness.set(hour, { count: 0, totalScore: 0 })
        }
        
        const hourData = timeOfDayEffectiveness.get(hour)!
        hourData.count++
        hourData.totalScore += effectiveness.score
      }
      
      // Find best and worst meeting times
      let bestHour = -1
      let bestScore = 0
      let worstHour = -1
      let worstScore = 100
      
      timeOfDayEffectiveness.forEach((data, hour) => {
        const avgScore = data.totalScore / data.count
        if (avgScore > bestScore && data.count >= 2) {
          bestScore = avgScore
          bestHour = hour
        }
        if (avgScore < worstScore && data.count >= 2) {
          worstScore = avgScore
          worstHour = hour
        }
      })
      
      if (bestHour !== -1 && worstHour !== -1 && bestScore - worstScore > 20) {
        patterns.push({
          type: 'temporal',
          description: `A ${bestHour}:00 körüli meetingek átlagosan ${Math.round(bestScore - worstScore)}%-kal hatékonyabbak mint a ${worstHour}:00 körüliek`,
          occurrences: timeOfDayEffectiveness.get(bestHour)!.count,
          meetings: [],
          severity: 'low',
          recommendation: `Próbálja a fontosabb meetingeket ${bestHour}:00 körül ütemezni`
        })
      }
      
      // Detect topical patterns (topics that lead to long discussions)
      const topicDurations = new Map<string, { total: number; count: number }>()
      const topicKeywords = ['budget', 'költségvetés', 'deadline', 'határidő', 'resource', 'erőforrás', 
                            'problem', 'probléma', 'issue', 'technical', 'technikai']
      
      historicalMeetings.forEach(hMeeting => {
        if (hMeeting.transcript?.segments && hMeeting.actual_duration) {
          topicKeywords.forEach(keyword => {
            const hasKeyword = hMeeting.transcript.segments.some((s: any) => 
              s.text && s.text.toLowerCase().includes(keyword)
            )
            
            if (hasKeyword) {
              if (!topicDurations.has(keyword)) {
                topicDurations.set(keyword, { total: 0, count: 0 })
              }
              const data = topicDurations.get(keyword)!
              data.total += hMeeting.actual_duration
              data.count++
            }
          })
        }
      })
      
      // Identify topics that consistently lead to longer meetings
      const avgMeetingDuration = historicalMeetings
        .filter(m => m.actual_duration)
        .reduce((sum, m) => sum + m.actual_duration, 0) / historicalMeetings.length
      
      topicDurations.forEach((data, topic) => {
        if (data.count >= 3) {
          const avgTopicDuration = data.total / data.count
          if (avgTopicDuration > avgMeetingDuration * 1.3) {
            patterns.push({
              type: 'topical',
              description: `A "${topic}" téma átlagosan ${Math.round((avgTopicDuration / avgMeetingDuration - 1) * 100)}%-kal hosszabb meetingeket eredményez`,
              occurrences: data.count,
              meetings: [],
              severity: 'medium',
              recommendation: 'Fontolja meg előzetes anyagok küldését vagy dedikált session tartását'
            })
          }
        }
      })
      
      // Generate insights
      if (patterns.filter(p => p.type === 'recurring_issue').length > 0) {
        insights.push('Több visszatérő probléma is megoldatlan maradt')
      }
      
      if (patterns.filter(p => p.type === 'behavioral' && p.severity === 'high').length > 0) {
        insights.push('A meeting dinamika javításra szorul - egyenlőtlen részvétel')
      }
      
      if (patterns.length === 0) {
        insights.push('Nem találtunk jelentős mintákat - a meetingek jól strukturáltak')
      }
      
      return { patterns, insights }
    } catch (error) {
      console.error('Error detecting patterns:', error)
      return { patterns, insights: ['Hiba történt a minták elemzése során'] }
    }
  }
  
  /**
   * Analyze energy levels throughout the meeting
   */
  async analyzeEnergyLevels(meeting: any): Promise<EnergyAnalysis> {
    const timeline: EnergyAnalysis['timeline'] = []
    const peakPeriods: EnergyAnalysis['peakPeriods'] = []
    const lowPeriods: EnergyAnalysis['lowPeriods'] = []
    
    if (!meeting.transcript?.segments || meeting.transcript.segments.length === 0) {
      return {
        timeline: [],
        averageEnergy: 50,
        peakPeriods: [],
        lowPeriods: []
      }
    }
    
    const segments = meeting.transcript.segments
    const windowSize = 60 // 1 minute windows
    const meetingDuration = segments[segments.length - 1].end
    
    // Analyze energy in time windows
    for (let time = 0; time < meetingDuration; time += windowSize) {
      const windowSegments = segments.filter((s: any) => 
        s.start >= time && s.start < time + windowSize
      )
      
      if (windowSegments.length === 0) continue
      
      // Calculate metrics for this window
      const participationRate = windowSegments.length / windowSize * 10 // Normalize
      const uniqueSpeakers = new Set(windowSegments.map((s: any) => s.speaker)).size
      
      // Calculate speaking pace (words per minute)
      const totalWords = windowSegments.reduce((sum: number, s: any) => 
        sum + (s.text ? s.text.split(' ').length : 0), 0
      )
      const speakingPace = totalWords / (windowSize / 60)
      
      // Calculate energy level (0-100)
      const energyLevel = Math.min(100, 
        (participationRate * 30) + 
        (uniqueSpeakers * 20) + 
        (Math.min(speakingPace / 150, 1) * 50)
      )
      
      timeline.push({
        timestamp: time,
        energyLevel: Math.round(energyLevel),
        participationRate: Math.round(participationRate * 10),
        speakingPace: Math.round(speakingPace)
      })
    }
    
    // Calculate average energy
    const averageEnergy = timeline.length > 0
      ? Math.round(timeline.reduce((sum, t) => sum + t.energyLevel, 0) / timeline.length)
      : 50
    
    // Identify peak and low periods
    let currentPeriod: { start: number; end: number; levels: number[] } | null = null
    let periodType: 'peak' | 'low' | null = null
    
    timeline.forEach((point, index) => {
      const isPeak = point.energyLevel > averageEnergy + 15
      const isLow = point.energyLevel < averageEnergy - 15
      
      if (isPeak && periodType !== 'peak') {
        if (currentPeriod && periodType === 'low') {
          lowPeriods.push({
            start: currentPeriod.start,
            end: currentPeriod.end,
            level: Math.round(currentPeriod.levels.reduce((a, b) => a + b) / currentPeriod.levels.length)
          })
        }
        currentPeriod = { start: point.timestamp, end: point.timestamp, levels: [point.energyLevel] }
        periodType = 'peak'
      } else if (isLow && periodType !== 'low') {
        if (currentPeriod && periodType === 'peak') {
          peakPeriods.push({
            start: currentPeriod.start,
            end: currentPeriod.end,
            level: Math.round(currentPeriod.levels.reduce((a, b) => a + b) / currentPeriod.levels.length)
          })
        }
        currentPeriod = { start: point.timestamp, end: point.timestamp, levels: [point.energyLevel] }
        periodType = 'low'
      } else if (currentPeriod && ((isPeak && periodType === 'peak') || (isLow && periodType === 'low'))) {
        currentPeriod.end = point.timestamp
        currentPeriod.levels.push(point.energyLevel)
      } else {
        if (currentPeriod) {
          if (periodType === 'peak') {
            peakPeriods.push({
              start: currentPeriod.start,
              end: currentPeriod.end,
              level: Math.round(currentPeriod.levels.reduce((a, b) => a + b) / currentPeriod.levels.length)
            })
          } else if (periodType === 'low') {
            lowPeriods.push({
              start: currentPeriod.start,
              end: currentPeriod.end,
              level: Math.round(currentPeriod.levels.reduce((a, b) => a + b) / currentPeriod.levels.length)
            })
          }
          currentPeriod = null
          periodType = null
        }
      }
    })
    
    // Handle last period
    if (currentPeriod) {
      if (periodType === 'peak') {
        peakPeriods.push({
          start: currentPeriod.start,
          end: currentPeriod.end,
          level: Math.round(currentPeriod.levels.reduce((a, b) => a + b) / currentPeriod.levels.length)
        })
      } else if (periodType === 'low') {
        lowPeriods.push({
          start: currentPeriod.start,
          end: currentPeriod.end,
          level: Math.round(currentPeriod.levels.reduce((a, b) => a + b) / currentPeriod.levels.length)
        })
      }
    }
    
    return {
      timeline,
      averageEnergy,
      peakPeriods,
      lowPeriods
    }
  }
  
  /**
   * Calculate engagement scores for participants
   */
  async calculateEngagementScore(meeting: any): Promise<EngagementMetrics> {
    const byParticipant: EngagementMetrics['byParticipant'] = []
    
    if (!meeting.transcript?.segments) {
      return {
        overall: 50,
        byParticipant: [],
        trends: []
      }
    }
    
    // Get speaking time analysis
    const speakingAnalysis = await this.analyzeSpeakingTime(meeting)
    
    // Analyze each participant
    const segments = meeting.transcript.segments
    const participantMetrics = new Map<string, any>()
    
    segments.forEach((segment: any, index: number) => {
      const speaker = segment.speaker || 'Ismeretlen'
      
      if (!participantMetrics.has(speaker)) {
        participantMetrics.set(speaker, {
          questionCount: 0,
          responseDelays: [],
          contributions: []
        })
      }
      
      const metrics = participantMetrics.get(speaker)
      
      // Count questions
      if (segment.text && segment.text.includes('?')) {
        metrics.questionCount++
      }
      
      // Track response time (if responding to someone)
      if (index > 0 && segments[index - 1].speaker !== speaker) {
        const delay = segment.start - segments[index - 1].end
        if (delay < 10) { // Within 10 seconds
          metrics.responseDelays.push(delay)
        }
      }
      
      // Track contribution length as a quality indicator
      if (segment.text) {
        metrics.contributions.push(segment.text.length)
      }
    })
    
    // Calculate engagement scores for each participant
    speakingAnalysis.forEach(speaker => {
      const metrics = participantMetrics.get(speaker.participant)
      if (!metrics) return
      
      // Calculate factors
      const speakingTimeFactor = Math.min(speaker.percentage / 20, 1) * 100 // Ideal is ~20%
      
      const responseTimeFactor = metrics.responseDelays.length > 0
        ? Math.max(0, 100 - (metrics.responseDelays.reduce((a: number, b: number) => a + b) / metrics.responseDelays.length) * 20)
        : 50
      
      const questionFactor = Math.min((metrics.questionCount / 5) * 100, 100) // 5+ questions is max
      
      const contributionQualityFactor = metrics.contributions.length > 0
        ? Math.min((metrics.contributions.reduce((a: number, b: number) => a + b) / metrics.contributions.length) / 2, 100)
        : 0
      
      // Calculate overall score (weighted average)
      const score = Math.round(
        speakingTimeFactor * 0.3 +
        responseTimeFactor * 0.2 +
        questionFactor * 0.3 +
        contributionQualityFactor * 0.2
      )
      
      byParticipant.push({
        participant: speaker.participant,
        score,
        factors: {
          speakingTime: Math.round(speakingTimeFactor),
          responseTime: Math.round(responseTimeFactor),
          questionCount: Math.round(questionFactor),
          contributionQuality: Math.round(contributionQualityFactor)
        }
      })
    })
    
    // Calculate overall engagement
    const overall = byParticipant.length > 0
      ? Math.round(byParticipant.reduce((sum, p) => sum + p.score, 0) / byParticipant.length)
      : 50
    
    // Calculate trends (simplified for single meeting)
    const trends: EngagementMetrics['trends'] = []
    
    // Divide meeting into quarters
    const quarterDuration = meeting.actual_duration ? meeting.actual_duration / 4 : 900 // 15 min default
    
    for (let q = 0; q < 4; q++) {
      const quarterSegments = segments.filter((s: any) => 
        s.start >= q * quarterDuration && s.start < (q + 1) * quarterDuration
      )
      
      if (quarterSegments.length > 0) {
        const uniqueSpeakers = new Set(quarterSegments.map((s: any) => s.speaker)).size
        const questionCount = quarterSegments.filter((s: any) => s.text && s.text.includes('?')).length
        
        const quarterScore = Math.round(
          (uniqueSpeakers / Math.max(byParticipant.length, 1)) * 50 +
          Math.min(questionCount * 10, 50)
        )
        
        trends.push({
          period: `Q${q + 1}`,
          score: quarterScore
        })
      }
    }
    
    return {
      overall,
      byParticipant: byParticipant.sort((a, b) => b.score - a.score),
      trends
    }
  }
  
  /**
   * Generate recommendations based on analytics
   */
  private generateRecommendations(analytics: Omit<MeetingAnalytics, 'meetingId' | 'recommendations'>): string[] {
    const recommendations: string[] = []
    
    // Speaking time recommendations
    const dominantSpeakers = analytics.speakingTime.filter(s => s.percentage > 40)
    if (dominantSpeakers.length > 0) {
      recommendations.push(
        `${dominantSpeakers[0].participant} a beszélgetés ${dominantSpeakers[0].percentage}%-át uralta. ` +
        'Használjon round-robin technikát vagy időkorlátokat.'
      )
    }
    
    const silentParticipants = analytics.speakingTime.filter(s => s.percentage < 5 && s.turnCount < 3)
    if (silentParticipants.length > 0) {
      recommendations.push(
        `${silentParticipants.length} résztvevő alig szólt hozzá. ` +
        'Tegyen fel nekik célzott kérdéseket.'
      )
    }
    
    // Effectiveness recommendations
    if (analytics.effectiveness.score < 60) {
      if (analytics.effectiveness.objectivesMet < analytics.effectiveness.totalObjectives * 0.5) {
        recommendations.push('A kitűzött célok többsége nem teljesült. Használjon szigorúbb agenda követést.')
      }
      
      if (analytics.effectiveness.timeEfficiency < 70) {
        recommendations.push('A meeting túlfutott. Jelöljön ki időfelelőst és használjon időkorlátokat.')
      }
      
      if (analytics.effectiveness.clarityScore < 50) {
        recommendations.push('A meeting eredményei nem elég tiszták. Foglalja össze a döntéseket és következő lépéseket.')
      }
    }
    
    // Pattern-based recommendations
    analytics.patterns.patterns
      .filter(p => p.severity === 'high')
      .forEach(pattern => {
        if (!recommendations.includes(pattern.recommendation)) {
          recommendations.push(pattern.recommendation)
        }
      })
    
    // Energy recommendations
    if (analytics.energy.averageEnergy < 40) {
      recommendations.push('Alacsony energia szint. Tartson szünetet vagy használjon energizáló gyakorlatokat.')
    }
    
    if (analytics.energy.lowPeriods.length > analytics.energy.peakPeriods.length) {
      recommendations.push('Több alacsony energiájú periódus volt. Strukturálja újra a meeting formátumot.')
    }
    
    // Engagement recommendations
    if (analytics.engagement.overall < 50) {
      recommendations.push('Alacsony részvételi szint. Használjon interaktív elemeket és facilitálási technikákat.')
    }
    
    const disengagedParticipants = analytics.engagement.byParticipant.filter(p => p.score < 30)
    if (disengagedParticipants.length > 0) {
      recommendations.push(
        `${disengagedParticipants.length} résztvevő nem volt bevonódva. ` +
        'Kérdezze meg előre az inputjukat vagy osszanak meg anyagokat.'
      )
    }
    
    // Limit recommendations to top 5 most important
    return recommendations.slice(0, 5)
  }
}

// Export singleton instance
export const meetingAnalyticsEngine = new MeetingAnalyticsEngine()