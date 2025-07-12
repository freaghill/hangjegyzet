import { createClient } from '@/lib/supabase/client'
import { trackMetric } from '@/lib/monitoring'
import { meetingAnalyticsEngine } from './meeting-analytics'
import { meetingOptimizer } from './meeting-optimizer'

export interface MeetingHealthScore {
  organizationId: string
  overall: number // 0-100
  dimensions: {
    efficiency: number
    effectiveness: number
    participation: number
    culture: number
    wellbeing: number
  }
  metrics: {
    meetingsPerWeek: number
    averageDuration: number
    averageAttendees: number
    meetingFreeTime: number // percentage
    recursiveMeetingRatio: number
    declinedMeetingRatio: number
  }
  insights: string[]
  recommendations: string[]
  timestamp: Date
}

export interface MeetingCultureAnalysis {
  organizationId: string
  patterns: {
    meetingDensity: 'low' | 'moderate' | 'high' | 'excessive'
    defaultDuration: number
    startPunctuality: number // percentage on time
    endPunctuality: number // percentage ending on time
    agendaAdoption: number // percentage with agenda
    preparationLevel: number // percentage with pre-reads
  }
  behaviors: {
    multitasking: number // percentage of participants
    cameraUsage: number // percentage with camera on
    activeParticipation: number
    decisionVelocity: number // decisions per meeting
  }
  culturalTraits: string[]
  maturityLevel: 'initial' | 'developing' | 'established' | 'optimized'
}

export interface MeetingOverloadDetection {
  isOverloaded: boolean
  severity: 'none' | 'mild' | 'moderate' | 'severe'
  indicators: Array<{
    type: string
    value: number
    threshold: number
    status: 'normal' | 'warning' | 'critical'
  }>
  affectedTeams: Array<{
    teamId: string
    teamName: string
    overloadScore: number
    topContributors: string[]
  }>
  recommendations: string[]
}

export interface MeetingFreeTimeRecommendation {
  currentState: {
    meetingFreeBlocks: Array<{ day: string; hours: number[] }>
    averageMeetingFreeTime: number
    longestUninterruptedBlock: number
  }
  recommendations: Array<{
    type: 'no_meeting_day' | 'focus_time' | 'meeting_windows' | 'batch_meetings'
    description: string
    expectedImpact: string
    implementation: string[]
  }>
  proposedSchedule: {
    meetingWindows: Array<{ day: string; startHour: number; endHour: number }>
    protectedTime: Array<{ day: string; startHour: number; endHour: number; purpose: string }>
  }
}

export interface TeamCollaborationPattern {
  teams: Array<{
    teamId: string
    teamName: string
    collaborationScore: number
    primaryCollaborators: Array<{ teamId: string; frequency: number }>
    isolationRisk: boolean
  }>
  crossFunctionalScore: number
  siloIndicators: string[]
  collaborationGaps: Array<{
    team1: string
    team2: string
    reason: string
    suggestion: string
  }>
  networkHealth: 'fragmented' | 'siloed' | 'connected' | 'optimal'
}

export class MeetingHealthAnalyzer {
  private supabase = createClient()
  
  /**
   * Calculates comprehensive meeting health score for organization
   */
  async calculateHealthScore(organizationId: string): Promise<MeetingHealthScore> {
    const startTime = Date.now()
    
    try {
      // Fetch recent meetings (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: meetings, error } = await this.supabase
        .from('meetings')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
      
      if (error || !meetings) {
        throw new Error('Failed to fetch meetings')
      }
      
      // Calculate metrics
      const metrics = this.calculateMetrics(meetings)
      
      // Calculate dimension scores
      const dimensions = await this.calculateDimensions(meetings, organizationId)
      
      // Calculate overall score
      const overall = this.calculateOverallScore(dimensions)
      
      // Generate insights
      const insights = this.generateHealthInsights(metrics, dimensions)
      
      // Generate recommendations
      const recommendations = await this.generateHealthRecommendations(
        metrics,
        dimensions,
        organizationId
      )
      
      const healthScore: MeetingHealthScore = {
        organizationId,
        overall,
        dimensions,
        metrics,
        insights,
        recommendations,
        timestamp: new Date()
      }
      
      trackMetric('ai.meeting_health_calculated', 1, {
        organization_id: organizationId,
        overall_score: overall,
        duration: (Date.now() - startTime) / 1000
      })
      
      return healthScore
    } catch (error) {
      console.error('Error calculating meeting health:', error)
      trackMetric('ai.meeting_health_error', 1)
      throw error
    }
  }
  
  /**
   * Analyzes organizational meeting culture
   */
  async analyzeMeetingCulture(organizationId: string): Promise<MeetingCultureAnalysis> {
    const startTime = Date.now()
    
    try {
      // Fetch meetings for analysis
      const { data: meetings } = await this.supabase
        .from('meetings')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(200)
      
      if (!meetings || meetings.length === 0) {
        throw new Error('No meetings found for analysis')
      }
      
      // Analyze patterns
      const patterns = this.analyzeCulturalPatterns(meetings)
      
      // Analyze behaviors
      const behaviors = await this.analyzeBehaviors(meetings)
      
      // Identify cultural traits
      const culturalTraits = this.identifyCulturalTraits(patterns, behaviors)
      
      // Determine maturity level
      const maturityLevel = this.assessMaturityLevel(patterns, behaviors)
      
      const analysis: MeetingCultureAnalysis = {
        organizationId,
        patterns,
        behaviors,
        culturalTraits,
        maturityLevel
      }
      
      trackMetric('ai.meeting_culture_analyzed', 1, {
        organization_id: organizationId,
        maturity_level: maturityLevel,
        duration: (Date.now() - startTime) / 1000
      })
      
      return analysis
    } catch (error) {
      console.error('Error analyzing meeting culture:', error)
      trackMetric('ai.meeting_culture_error', 1)
      throw error
    }
  }
  
  /**
   * Detects meeting overload at organizational and team levels
   */
  async detectMeetingOverload(organizationId: string): Promise<MeetingOverloadDetection> {
    const startTime = Date.now()
    
    try {
      // Get organization members and their meeting load
      const { data: members } = await this.supabase
        .from('organization_members')
        .select('user_id, team_id, role')
        .eq('organization_id', organizationId)
      
      if (!members) {
        throw new Error('No organization members found')
      }
      
      // Analyze meeting load for each member
      const memberLoads = await Promise.all(
        members.map(async (member) => {
          const load = await this.calculateMemberMeetingLoad(
            member.user_id,
            organizationId
          )
          return { ...member, load }
        })
      )
      
      // Calculate overload indicators
      const indicators = this.calculateOverloadIndicators(memberLoads)
      
      // Determine severity
      const severity = this.determineOverloadSeverity(indicators)
      
      // Identify affected teams
      const affectedTeams = this.identifyAffectedTeams(memberLoads)
      
      // Generate recommendations
      const recommendations = this.generateOverloadRecommendations(
        severity,
        indicators,
        affectedTeams
      )
      
      const detection: MeetingOverloadDetection = {
        isOverloaded: severity !== 'none',
        severity,
        indicators,
        affectedTeams,
        recommendations
      }
      
      trackMetric('ai.meeting_overload_detected', 1, {
        organization_id: organizationId,
        severity,
        affected_teams: affectedTeams.length,
        duration: (Date.now() - startTime) / 1000
      })
      
      return detection
    } catch (error) {
      console.error('Error detecting meeting overload:', error)
      trackMetric('ai.meeting_overload_error', 1)
      throw error
    }
  }
  
  /**
   * Recommends meeting-free time blocks
   */
  async recommendMeetingFreeTime(
    organizationId: string
  ): Promise<MeetingFreeTimeRecommendation> {
    const startTime = Date.now()
    
    try {
      // Analyze current meeting patterns
      const currentState = await this.analyzeCurrentMeetingDistribution(organizationId)
      
      // Generate recommendations based on patterns
      const recommendations = this.generateFreeTimeRecommendations(currentState)
      
      // Create proposed schedule
      const proposedSchedule = this.createOptimalSchedule(currentState)
      
      const recommendation: MeetingFreeTimeRecommendation = {
        currentState,
        recommendations,
        proposedSchedule
      }
      
      trackMetric('ai.meeting_free_time_recommended', 1, {
        organization_id: organizationId,
        current_free_time: currentState.averageMeetingFreeTime,
        recommendations_count: recommendations.length,
        duration: (Date.now() - startTime) / 1000
      })
      
      return recommendation
    } catch (error) {
      console.error('Error recommending meeting-free time:', error)
      trackMetric('ai.meeting_free_time_error', 1)
      throw error
    }
  }
  
  /**
   * Analyzes team collaboration patterns
   */
  async analyzeTeamCollaboration(
    organizationId: string
  ): Promise<TeamCollaborationPattern> {
    const startTime = Date.now()
    
    try {
      // Get teams and their meetings
      const teams = await this.getTeamsWithMeetingData(organizationId)
      
      // Analyze collaboration between teams
      const collaborationMatrix = await this.buildCollaborationMatrix(teams)
      
      // Calculate collaboration scores
      const teamScores = this.calculateTeamCollaborationScores(
        teams,
        collaborationMatrix
      )
      
      // Identify silos and gaps
      const siloIndicators = this.identifySilos(collaborationMatrix)
      const collaborationGaps = this.identifyCollaborationGaps(
        teams,
        collaborationMatrix
      )
      
      // Assess overall network health
      const networkHealth = this.assessNetworkHealth(
        teamScores,
        siloIndicators,
        collaborationGaps
      )
      
      // Calculate cross-functional score
      const crossFunctionalScore = this.calculateCrossFunctionalScore(
        collaborationMatrix
      )
      
      const pattern: TeamCollaborationPattern = {
        teams: teamScores,
        crossFunctionalScore,
        siloIndicators,
        collaborationGaps,
        networkHealth
      }
      
      trackMetric('ai.team_collaboration_analyzed', 1, {
        organization_id: organizationId,
        network_health: networkHealth,
        cross_functional_score: crossFunctionalScore,
        duration: (Date.now() - startTime) / 1000
      })
      
      return pattern
    } catch (error) {
      console.error('Error analyzing team collaboration:', error)
      trackMetric('ai.team_collaboration_error', 1)
      throw error
    }
  }
  
  // Private helper methods
  
  private calculateMetrics(meetings: any[]): MeetingHealthScore['metrics'] {
    const weekCount = 4 // Analyzing last 30 days
    const totalMeetings = meetings.length
    
    // Calculate basic metrics
    const meetingsPerWeek = totalMeetings / weekCount
    
    const durations = meetings
      .map(m => m.actual_duration || m.scheduled_duration || 60)
      .filter(d => d > 0)
    
    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 60
    
    const attendeeCounts = meetings
      .map(m => m.participants?.length || 0)
      .filter(c => c > 0)
    
    const averageAttendees = attendeeCounts.length > 0
      ? attendeeCounts.reduce((sum, c) => sum + c, 0) / attendeeCounts.length
      : 0
    
    // Calculate meeting-free time (simplified)
    const totalWorkHours = weekCount * 5 * 8 * 60 // minutes
    const totalMeetingTime = durations.reduce((sum, d) => sum + d, 0)
    const meetingFreeTime = Math.max(0, 
      ((totalWorkHours - totalMeetingTime) / totalWorkHours) * 100
    )
    
    // Calculate recursive meeting ratio
    const recursiveMeetings = meetings.filter(m => 
      m.is_recurring || 
      m.title?.toLowerCase().includes('weekly') ||
      m.title?.toLowerCase().includes('heti') ||
      m.title?.toLowerCase().includes('daily') ||
      m.title?.toLowerCase().includes('napi')
    ).length
    
    const recursiveMeetingRatio = totalMeetings > 0
      ? (recursiveMeetings / totalMeetings) * 100
      : 0
    
    // Calculate declined ratio (simplified - would need RSVP data)
    const declinedMeetingRatio = 10 // Placeholder
    
    return {
      meetingsPerWeek: Math.round(meetingsPerWeek * 10) / 10,
      averageDuration: Math.round(averageDuration),
      averageAttendees: Math.round(averageAttendees * 10) / 10,
      meetingFreeTime: Math.round(meetingFreeTime),
      recursiveMeetingRatio: Math.round(recursiveMeetingRatio),
      declinedMeetingRatio: Math.round(declinedMeetingRatio)
    }
  }
  
  private async calculateDimensions(
    meetings: any[],
    organizationId: string
  ): Promise<MeetingHealthScore['dimensions']> {
    // Efficiency dimension
    const efficiency = this.calculateEfficiencyScore(meetings)
    
    // Effectiveness dimension
    const effectiveness = await this.calculateEffectivenessScore(meetings)
    
    // Participation dimension
    const participation = this.calculateParticipationScore(meetings)
    
    // Culture dimension
    const culture = this.calculateCultureScore(meetings)
    
    // Wellbeing dimension
    const wellbeing = this.calculateWellbeingScore(meetings)
    
    return {
      efficiency,
      effectiveness,
      participation,
      culture,
      wellbeing
    }
  }
  
  private calculateEfficiencyScore(meetings: any[]): number {
    let score = 70 // Base score
    
    // Check if meetings start and end on time
    const onTimeMeetings = meetings.filter(m => {
      if (!m.actual_duration || !m.scheduled_duration) return false
      const overrun = m.actual_duration - m.scheduled_duration
      return Math.abs(overrun) < 10 // Within 10 minutes
    }).length
    
    const punctualityRate = meetings.length > 0
      ? onTimeMeetings / meetings.length
      : 0.5
    
    score += (punctualityRate - 0.5) * 40
    
    // Check average duration
    const avgDuration = meetings.reduce((sum, m) => 
      sum + (m.actual_duration || 60), 0
    ) / meetings.length
    
    if (avgDuration < 45) score += 10 // Short, efficient meetings
    else if (avgDuration > 90) score -= 10 // Long meetings
    
    // Check back-to-back meeting frequency
    const backToBackCount = this.countBackToBackMeetings(meetings)
    if (backToBackCount > meetings.length * 0.3) {
      score -= 15 // Too many back-to-back meetings
    }
    
    return Math.max(0, Math.min(100, Math.round(score)))
  }
  
  private async calculateEffectivenessScore(meetings: any[]): Promise<number> {
    let totalScore = 0
    let scoredMeetings = 0
    
    // Use effectiveness scores from meetings
    meetings.forEach(meeting => {
      if (meeting.effectiveness_score) {
        totalScore += meeting.effectiveness_score
        scoredMeetings++
      }
    })
    
    // If we have scored meetings, use the average
    if (scoredMeetings > 0) {
      return Math.round(totalScore / scoredMeetings)
    }
    
    // Otherwise, calculate based on outcomes
    let score = 60 // Base score
    
    // Check for action items
    const meetingsWithActions = meetings.filter(m => 
      m.action_items && m.action_items.length > 0
    ).length
    
    const actionRate = meetings.length > 0
      ? meetingsWithActions / meetings.length
      : 0
    
    score += actionRate * 20
    
    // Check for clear summaries
    const meetingsWithSummaries = meetings.filter(m => 
      m.summary && m.summary.length > 100
    ).length
    
    const summaryRate = meetings.length > 0
      ? meetingsWithSummaries / meetings.length
      : 0
    
    score += summaryRate * 20
    
    return Math.max(0, Math.min(100, Math.round(score)))
  }
  
  private calculateParticipationScore(meetings: any[]): number {
    let score = 70 // Base score
    
    // Analyze participant distribution
    const participantCounts = meetings.map(m => m.participants?.length || 0)
    
    // Penalize very large meetings
    const largeMeetings = participantCounts.filter(c => c > 8).length
    const largeMeetingRatio = meetings.length > 0
      ? largeMeetings / meetings.length
      : 0
    
    if (largeMeetingRatio > 0.3) {
      score -= 20 // Too many large meetings
    }
    
    // Reward optimal size meetings (4-6 people)
    const optimalMeetings = participantCounts.filter(c => c >= 4 && c <= 6).length
    const optimalRatio = meetings.length > 0
      ? optimalMeetings / meetings.length
      : 0
    
    score += optimalRatio * 30
    
    return Math.max(0, Math.min(100, Math.round(score)))
  }
  
  private calculateCultureScore(meetings: any[]): number {
    let score = 60 // Base score
    
    // Check agenda adoption
    const meetingsWithAgenda = meetings.filter(m => 
      m.agenda && Array.isArray(m.agenda) && m.agenda.length > 0
    ).length
    
    const agendaRate = meetings.length > 0
      ? meetingsWithAgenda / meetings.length
      : 0
    
    score += agendaRate * 20
    
    // Check preparation (pre-reads, templates)
    const preparedMeetings = meetings.filter(m => 
      m.template_id || m.has_pre_read
    ).length
    
    const preparationRate = meetings.length > 0
      ? preparedMeetings / meetings.length
      : 0
    
    score += preparationRate * 20
    
    return Math.max(0, Math.min(100, Math.round(score)))
  }
  
  private calculateWellbeingScore(meetings: any[]): number {
    let score = 80 // Base score
    
    // Check meeting density
    const meetingsPerDay = this.calculateMeetingDensity(meetings)
    
    if (meetingsPerDay > 5) {
      score -= 30 // Too many meetings per day
    } else if (meetingsPerDay > 3) {
      score -= 15
    }
    
    // Check for meeting-free blocks
    const hasMeetingFreeTime = this.checkMeetingFreeBlocks(meetings)
    if (!hasMeetingFreeTime) {
      score -= 20
    }
    
    // Check weekend/evening meetings
    const offHoursMeetings = meetings.filter(m => {
      const date = new Date(m.created_at)
      const hour = date.getHours()
      const day = date.getDay()
      
      return hour < 8 || hour > 18 || day === 0 || day === 6
    }).length
    
    const offHoursRatio = meetings.length > 0
      ? offHoursMeetings / meetings.length
      : 0
    
    if (offHoursRatio > 0.1) {
      score -= 20 // Too many off-hours meetings
    }
    
    return Math.max(0, Math.min(100, Math.round(score)))
  }
  
  private calculateOverallScore(
    dimensions: MeetingHealthScore['dimensions']
  ): number {
    const weights = {
      efficiency: 0.20,
      effectiveness: 0.30,
      participation: 0.20,
      culture: 0.15,
      wellbeing: 0.15
    }
    
    const weightedScore = Object.entries(dimensions).reduce((sum, [key, value]) => {
      return sum + value * weights[key as keyof typeof weights]
    }, 0)
    
    return Math.round(weightedScore)
  }
  
  private countBackToBackMeetings(meetings: any[]): number {
    if (meetings.length < 2) return 0
    
    // Sort meetings by start time
    const sorted = [...meetings].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    let backToBackCount = 0
    
    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = new Date(sorted[i - 1].created_at).getTime() + 
                     (sorted[i - 1].actual_duration || 60) * 60 * 1000
      const currentStart = new Date(sorted[i].created_at).getTime()
      
      // If less than 15 minutes between meetings
      if (currentStart - prevEnd < 15 * 60 * 1000) {
        backToBackCount++
      }
    }
    
    return backToBackCount
  }
  
  private calculateMeetingDensity(meetings: any[]): number {
    if (meetings.length === 0) return 0
    
    // Group meetings by day
    const meetingsByDay = new Map<string, number>()
    
    meetings.forEach(meeting => {
      const date = new Date(meeting.created_at).toDateString()
      meetingsByDay.set(date, (meetingsByDay.get(date) || 0) + 1)
    })
    
    // Calculate average meetings per day
    const totalDays = meetingsByDay.size
    const totalMeetings = meetings.length
    
    return totalDays > 0 ? totalMeetings / totalDays : 0
  }
  
  private checkMeetingFreeBlocks(meetings: any[]): boolean {
    // Simplified check - would need full calendar integration
    // Check if there are days with fewer than 2 meetings
    const meetingsByDay = new Map<string, number>()
    
    meetings.forEach(meeting => {
      const date = new Date(meeting.created_at).toDateString()
      meetingsByDay.set(date, (meetingsByDay.get(date) || 0) + 1)
    })
    
    // Check if any workday has < 2 meetings (indicating free time)
    return Array.from(meetingsByDay.values()).some(count => count < 2)
  }
  
  private generateHealthInsights(
    metrics: MeetingHealthScore['metrics'],
    dimensions: MeetingHealthScore['dimensions']
  ): string[] {
    const insights: string[] = []
    
    // Metrics-based insights
    if (metrics.meetingsPerWeek > 20) {
      insights.push('Heti találkozók száma meghaladja az ajánlott maximumot')
    }
    
    if (metrics.averageDuration > 75) {
      insights.push('Az átlagos meeting időtartam túl hosszú - rövidebb, fókuszált megbeszélések ajánlottak')
    }
    
    if (metrics.meetingFreeTime < 40) {
      insights.push('Kevés megszakítás nélküli munkaidő - több fókuszidő szükséges')
    }
    
    if (metrics.recursiveMeetingRatio > 60) {
      insights.push('Túl sok ismétlődő meeting - érdemes felülvizsgálni a szükségességüket')
    }
    
    // Dimension-based insights
    if (dimensions.efficiency < 60) {
      insights.push('A meetingek hatékonysága fejlesztésre szorul')
    }
    
    if (dimensions.wellbeing < 60) {
      insights.push('A meeting terhelés negatívan hat a csapat jóllétére')
    }
    
    if (dimensions.culture > 80) {
      insights.push('Erős meeting kultúra - jó alapok a további optimalizáláshoz')
    }
    
    return insights
  }
  
  private async generateHealthRecommendations(
    metrics: MeetingHealthScore['metrics'],
    dimensions: MeetingHealthScore['dimensions'],
    organizationId: string
  ): Promise<string[]> {
    const recommendations: string[] = []
    
    // Efficiency recommendations
    if (dimensions.efficiency < 60) {
      recommendations.push('Vezessen be 25 vagy 50 perces meetingeket az 1 órásak helyett')
      recommendations.push('Használjon időmérőt és szigorú agenda követést')
    }
    
    // Effectiveness recommendations
    if (dimensions.effectiveness < 60) {
      recommendations.push('Minden meeting végén foglalja össze a döntéseket és következő lépéseket')
      recommendations.push('Küldjön előzetes anyagokat a résztvevőknek')
    }
    
    // Wellbeing recommendations
    if (dimensions.wellbeing < 60) {
      recommendations.push('Vezessen be meeting-mentes időblokkokat (pl. szerda délután)')
      recommendations.push('Limitálja a napi meetingek számát maximum 4-re')
    }
    
    // Overload recommendations
    if (metrics.meetingsPerWeek > 15) {
      recommendations.push('Vizsgálja felül az ismétlődő meetingek szükségességét')
      recommendations.push('Használjon aszinkron kommunikációt ahol lehet')
    }
    
    // Culture recommendations
    if (dimensions.culture < 70) {
      recommendations.push('Vezessen be kötelező agenda küldést minden meetinghez')
      recommendations.push('Használjon meeting template-eket a strukturáltságért')
    }
    
    return recommendations.slice(0, 5) // Top 5 recommendations
  }
  
  private analyzeCulturalPatterns(meetings: any[]): MeetingCultureAnalysis['patterns'] {
    // Meeting density
    const meetingsPerDay = this.calculateMeetingDensity(meetings)
    let meetingDensity: MeetingCultureAnalysis['patterns']['meetingDensity']
    
    if (meetingsPerDay < 2) meetingDensity = 'low'
    else if (meetingsPerDay < 4) meetingDensity = 'moderate'
    else if (meetingsPerDay < 6) meetingDensity = 'high'
    else meetingDensity = 'excessive'
    
    // Default duration
    const durations = meetings.map(m => m.scheduled_duration || 60)
    const durationCounts = new Map<number, number>()
    
    durations.forEach(d => {
      durationCounts.set(d, (durationCounts.get(d) || 0) + 1)
    })
    
    const defaultDuration = Array.from(durationCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 60
    
    // Punctuality
    const startPunctuality = this.calculateStartPunctuality(meetings)
    const endPunctuality = this.calculateEndPunctuality(meetings)
    
    // Agenda adoption
    const agendaAdoption = meetings.filter(m => 
      m.agenda && m.agenda.length > 0
    ).length / Math.max(1, meetings.length) * 100
    
    // Preparation level
    const preparationLevel = meetings.filter(m => 
      m.template_id || m.has_pre_read || m.pre_meeting_notes
    ).length / Math.max(1, meetings.length) * 100
    
    return {
      meetingDensity,
      defaultDuration,
      startPunctuality: Math.round(startPunctuality),
      endPunctuality: Math.round(endPunctuality),
      agendaAdoption: Math.round(agendaAdoption),
      preparationLevel: Math.round(preparationLevel)
    }
  }
  
  private async analyzeBehaviors(meetings: any[]): Promise<MeetingCultureAnalysis['behaviors']> {
    // These would require more detailed meeting data
    // Using estimates for now
    
    const multitasking = 25 // 25% estimated multitasking
    const cameraUsage = 70 // 70% camera usage in video calls
    
    // Active participation (based on speaking distribution)
    let totalParticipation = 0
    let analyzedMeetings = 0
    
    for (const meeting of meetings.slice(0, 20)) {
      if (meeting.transcript?.segments) {
        const speakers = new Set(meeting.transcript.segments.map((s: any) => s.speaker))
        const participationRate = speakers.size / Math.max(1, meeting.participants?.length || 1)
        totalParticipation += participationRate
        analyzedMeetings++
      }
    }
    
    const activeParticipation = analyzedMeetings > 0
      ? (totalParticipation / analyzedMeetings) * 100
      : 60
    
    // Decision velocity
    const meetingsWithDecisions = meetings.filter(m => 
      m.action_items?.length > 0 || 
      m.summary?.includes('dönt') ||
      m.summary?.includes('határozat')
    ).length
    
    const decisionVelocity = meetings.length > 0
      ? meetingsWithDecisions / meetings.length
      : 0.5
    
    return {
      multitasking: Math.round(multitasking),
      cameraUsage: Math.round(cameraUsage),
      activeParticipation: Math.round(activeParticipation),
      decisionVelocity: Math.round(decisionVelocity * 100) / 100
    }
  }
  
  private calculateStartPunctuality(meetings: any[]): number {
    // Simplified - would need actual start time data
    // Estimate based on actual vs scheduled duration
    const punctualStarts = meetings.filter(m => {
      if (!m.actual_duration || !m.scheduled_duration) return true
      return m.actual_duration <= m.scheduled_duration + 5
    }).length
    
    return meetings.length > 0
      ? (punctualStarts / meetings.length) * 100
      : 70
  }
  
  private calculateEndPunctuality(meetings: any[]): number {
    // Check how many meetings end on time
    const punctualEnds = meetings.filter(m => {
      if (!m.actual_duration || !m.scheduled_duration) return true
      const overrun = m.actual_duration - m.scheduled_duration
      return overrun <= 5 // Within 5 minutes
    }).length
    
    return meetings.length > 0
      ? (punctualEnds / meetings.length) * 100
      : 60
  }
  
  private identifyCulturalTraits(
    patterns: MeetingCultureAnalysis['patterns'],
    behaviors: MeetingCultureAnalysis['behaviors']
  ): string[] {
    const traits: string[] = []
    
    // Pattern-based traits
    if (patterns.meetingDensity === 'excessive') {
      traits.push('Meeting-központú kultúra')
    } else if (patterns.meetingDensity === 'low') {
      traits.push('Aszinkron kommunikációt preferáló')
    }
    
    if (patterns.defaultDuration === 60) {
      traits.push('Hagyományos időbeosztás (1 órás blokkok)')
    } else if (patterns.defaultDuration === 30) {
      traits.push('Hatékonyság-orientált (rövid meetingek)')
    }
    
    if (patterns.startPunctuality > 80) {
      traits.push('Időtudatos és pontos')
    } else if (patterns.startPunctuality < 50) {
      traits.push('Rugalmas időkezelés')
    }
    
    if (patterns.agendaAdoption > 70) {
      traits.push('Strukturált és előkészített')
    }
    
    if (patterns.preparationLevel > 60) {
      traits.push('Felkészültség-orientált')
    }
    
    // Behavior-based traits
    if (behaviors.activeParticipation > 70) {
      traits.push('Magas részvételi kultúra')
    }
    
    if (behaviors.decisionVelocity > 0.6) {
      traits.push('Döntés-orientált')
    } else if (behaviors.decisionVelocity < 0.3) {
      traits.push('Konszenzus-kereső')
    }
    
    if (behaviors.cameraUsage > 80) {
      traits.push('Vizuális kapcsolatot értékelő')
    }
    
    return traits
  }
  
  private assessMaturityLevel(
    patterns: MeetingCultureAnalysis['patterns'],
    behaviors: MeetingCultureAnalysis['behaviors']
  ): MeetingCultureAnalysis['maturityLevel'] {
    let score = 0
    
    // Score based on various factors
    if (patterns.agendaAdoption > 70) score += 20
    if (patterns.preparationLevel > 60) score += 20
    if (patterns.startPunctuality > 80) score += 15
    if (patterns.endPunctuality > 70) score += 15
    if (behaviors.activeParticipation > 70) score += 15
    if (behaviors.decisionVelocity > 0.5) score += 15
    
    // Penalties
    if (patterns.meetingDensity === 'excessive') score -= 20
    if (behaviors.multitasking > 40) score -= 10
    
    // Determine level
    if (score >= 80) return 'optimized'
    if (score >= 60) return 'established'
    if (score >= 40) return 'developing'
    return 'initial'
  }
  
  private async calculateMemberMeetingLoad(
    userId: string,
    organizationId: string
  ): Promise<number> {
    // Get member's meetings from last week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const { data: meetings } = await this.supabase
      .from('meetings')
      .select('actual_duration, scheduled_duration')
      .eq('organization_id', organizationId)
      .contains('participants', [userId])
      .gte('created_at', oneWeekAgo.toISOString())
    
    if (!meetings || meetings.length === 0) return 0
    
    // Calculate total meeting hours
    const totalMinutes = meetings.reduce((sum, m) => 
      sum + (m.actual_duration || m.scheduled_duration || 60), 0
    )
    
    const totalHours = totalMinutes / 60
    const workHoursPerWeek = 40
    
    // Return percentage of work time in meetings
    return (totalHours / workHoursPerWeek) * 100
  }
  
  private calculateOverloadIndicators(
    memberLoads: any[]
  ): MeetingOverloadDetection['indicators'] {
    const indicators: MeetingOverloadDetection['indicators'] = []
    
    // Average meeting load
    const avgLoad = memberLoads.reduce((sum, m) => sum + m.load, 0) / memberLoads.length
    indicators.push({
      type: 'Átlagos meeting terhelés',
      value: Math.round(avgLoad),
      threshold: 40,
      status: avgLoad > 50 ? 'critical' : avgLoad > 40 ? 'warning' : 'normal'
    })
    
    // Overloaded individuals
    const overloadedCount = memberLoads.filter(m => m.load > 50).length
    const overloadedRatio = (overloadedCount / memberLoads.length) * 100
    
    indicators.push({
      type: 'Túlterhelt munkatársak aránya',
      value: Math.round(overloadedRatio),
      threshold: 20,
      status: overloadedRatio > 30 ? 'critical' : overloadedRatio > 20 ? 'warning' : 'normal'
    })
    
    // Maximum individual load
    const maxLoad = Math.max(...memberLoads.map(m => m.load))
    indicators.push({
      type: 'Legmagasabb egyéni terhelés',
      value: Math.round(maxLoad),
      threshold: 60,
      status: maxLoad > 70 ? 'critical' : maxLoad > 60 ? 'warning' : 'normal'
    })
    
    // Meeting concentration (how many people are in most meetings)
    const highLoadMembers = memberLoads.filter(m => m.load > 40).length
    const concentrationRatio = (highLoadMembers / memberLoads.length) * 100
    
    indicators.push({
      type: 'Meeting koncentráció',
      value: Math.round(concentrationRatio),
      threshold: 30,
      status: concentrationRatio > 40 ? 'critical' : concentrationRatio > 30 ? 'warning' : 'normal'
    })
    
    return indicators
  }
  
  private determineOverloadSeverity(
    indicators: MeetingOverloadDetection['indicators']
  ): MeetingOverloadDetection['severity'] {
    const criticalCount = indicators.filter(i => i.status === 'critical').length
    const warningCount = indicators.filter(i => i.status === 'warning').length
    
    if (criticalCount >= 2) return 'severe'
    if (criticalCount >= 1 || warningCount >= 3) return 'moderate'
    if (warningCount >= 1) return 'mild'
    return 'none'
  }
  
  private identifyAffectedTeams(memberLoads: any[]): MeetingOverloadDetection['affectedTeams'] {
    // Group by teams
    const teamLoads = new Map<string, { members: any[]; totalLoad: number }>()
    
    memberLoads.forEach(member => {
      const teamId = member.team_id || 'no-team'
      if (!teamLoads.has(teamId)) {
        teamLoads.set(teamId, { members: [], totalLoad: 0 })
      }
      
      const team = teamLoads.get(teamId)!
      team.members.push(member)
      team.totalLoad += member.load
    })
    
    // Identify overloaded teams
    const affectedTeams: MeetingOverloadDetection['affectedTeams'] = []
    
    teamLoads.forEach((team, teamId) => {
      const avgTeamLoad = team.totalLoad / team.members.length
      
      if (avgTeamLoad > 40) {
        const topContributors = team.members
          .sort((a, b) => b.load - a.load)
          .slice(0, 3)
          .map(m => m.user_id)
        
        affectedTeams.push({
          teamId,
          teamName: `Team ${teamId}`, // Would be fetched from team data
          overloadScore: Math.round(avgTeamLoad),
          topContributors
        })
      }
    })
    
    return affectedTeams.sort((a, b) => b.overloadScore - a.overloadScore)
  }
  
  private generateOverloadRecommendations(
    severity: MeetingOverloadDetection['severity'],
    indicators: MeetingOverloadDetection['indicators'],
    affectedTeams: MeetingOverloadDetection['affectedTeams']
  ): string[] {
    const recommendations: string[] = []
    
    if (severity === 'severe') {
      recommendations.push('SÜRGŐS: Vezessen be azonnali meeting diétát - töröljön minden nem kritikus meetinget')
      recommendations.push('Alakítson ki meeting-mentes napokat vagy időblokkokat')
      recommendations.push('Vizsgálja felül az összes ismétlődő meetinget')
    } else if (severity === 'moderate') {
      recommendations.push('Csökkentse a meeting időtartamokat 25%-kal')
      recommendations.push('Vezessen be "no meeting Friday" szabályt')
      recommendations.push('Használjon aszinkron kommunikációt a státusz meetingek helyett')
    } else if (severity === 'mild') {
      recommendations.push('Optimalizálja a résztvevők számát minden meetingen')
      recommendations.push('Használjon meeting költség kalkulátort a tudatosságért')
    }
    
    // Team-specific recommendations
    if (affectedTeams.length > 0) {
      recommendations.push(
        `Fókuszáljon a következő csapatokra: ${affectedTeams.slice(0, 3).map(t => t.teamName).join(', ')}`
      )
    }
    
    // Indicator-specific recommendations
    const criticalIndicators = indicators.filter(i => i.status === 'critical')
    if (criticalIndicators.some(i => i.type.includes('egyéni terhelés'))) {
      recommendations.push('Ossza újra a felelősségeket a túlterhelt munkatársaktól')
    }
    
    return recommendations.slice(0, 5)
  }
  
  private async analyzeCurrentMeetingDistribution(
    organizationId: string
  ): Promise<MeetingFreeTimeRecommendation['currentState']> {
    // Get recent meetings
    const { data: meetings } = await this.supabase
      .from('meetings')
      .select('created_at, actual_duration, scheduled_duration')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
    
    if (!meetings || meetings.length === 0) {
      return {
        meetingFreeBlocks: [],
        averageMeetingFreeTime: 60,
        longestUninterruptedBlock: 240
      }
    }
    
    // Analyze meeting distribution by day and hour
    const meetingsByDayHour = new Map<string, Set<number>>()
    
    meetings.forEach(meeting => {
      const date = new Date(meeting.created_at)
      const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()]
      const hour = date.getHours()
      
      if (!meetingsByDayHour.has(day)) {
        meetingsByDayHour.set(day, new Set())
      }
      
      meetingsByDayHour.get(day)!.add(hour)
    })
    
    // Find meeting-free blocks
    const meetingFreeBlocks: Array<{ day: string; hours: number[] }> = []
    const workHours = Array.from({ length: 9 }, (_, i) => i + 9) // 9 AM to 5 PM
    
    ;['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
      const busyHours = meetingsByDayHour.get(day) || new Set()
      const freeHours = workHours.filter(hour => !busyHours.has(hour))
      
      if (freeHours.length > 0) {
        meetingFreeBlocks.push({ day, hours: freeHours })
      }
    })
    
    // Calculate average meeting-free time
    const totalWorkHours = 5 * 8 // 5 days * 8 hours
    const totalMeetingHours = meetings.reduce((sum, m) => 
      sum + (m.actual_duration || m.scheduled_duration || 60) / 60, 0
    )
    
    const averageMeetingFreeTime = Math.max(0, 
      ((totalWorkHours - totalMeetingHours) / totalWorkHours) * 100
    )
    
    // Find longest uninterrupted block
    let longestUninterruptedBlock = 0
    
    meetingFreeBlocks.forEach(block => {
      const consecutiveHours = this.findConsecutiveHours(block.hours)
      longestUninterruptedBlock = Math.max(longestUninterruptedBlock, consecutiveHours)
    })
    
    return {
      meetingFreeBlocks,
      averageMeetingFreeTime: Math.round(averageMeetingFreeTime),
      longestUninterruptedBlock: longestUninterruptedBlock * 60 // Convert to minutes
    }
  }
  
  private findConsecutiveHours(hours: number[]): number {
    if (hours.length === 0) return 0
    
    hours.sort((a, b) => a - b)
    let maxConsecutive = 1
    let currentConsecutive = 1
    
    for (let i = 1; i < hours.length; i++) {
      if (hours[i] === hours[i - 1] + 1) {
        currentConsecutive++
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
      } else {
        currentConsecutive = 1
      }
    }
    
    return maxConsecutive
  }
  
  private generateFreeTimeRecommendations(
    currentState: MeetingFreeTimeRecommendation['currentState']
  ): MeetingFreeTimeRecommendation['recommendations'] {
    const recommendations: MeetingFreeTimeRecommendation['recommendations'] = []
    
    // No meeting day recommendation
    if (currentState.meetingFreeBlocks.length < 5) {
      const bestDay = this.findBestDayForNoMeetings(currentState.meetingFreeBlocks)
      
      recommendations.push({
        type: 'no_meeting_day',
        description: `Vezessen be "${bestDay} = No Meeting Day" szabályt`,
        expectedImpact: 'Megszakítás nélküli munkaidő, jobb koncentráció',
        implementation: [
          'Kommunikálja az egész szervezetnek',
          'Blokkolja a naptárakat',
          'Állítson be automatikus elutasítást erre a napra',
          'Kivételeket csak vezető engedélyezhet'
        ]
      })
    }
    
    // Focus time recommendation
    if (currentState.longestUninterruptedBlock < 180) {
      recommendations.push({
        type: 'focus_time',
        description: 'Vezessen be védett fókusz időblokkokat',
        expectedImpact: '40%-kal produktívabb mélyműnka',
        implementation: [
          'Minden nap 9-11 között fókusz idő',
          'Naptár blokkolás "Deep Work" címmel',
          'Csapat szintű megállapodás',
          'Kommunikációs csatornák némítása'
        ]
      })
    }
    
    // Meeting windows recommendation
    if (currentState.averageMeetingFreeTime < 50) {
      recommendations.push({
        type: 'meeting_windows',
        description: 'Korlátozza a meetingeket meghatározott időablakokra',
        expectedImpact: 'Strukturáltabb napok, jobb időgazdálkodás',
        implementation: [
          'Meetingek csak 10-12 és 14-16 között',
          'Automatikus naptár szabályok',
          'Meeting időpontok konszolidálása',
          'Buffer idő bevezetése meetingek között'
        ]
      })
    }
    
    // Batch meetings recommendation
    recommendations.push({
      type: 'batch_meetings',
      description: 'Csoportosítsa a hasonló meetingeket',
      expectedImpact: 'Kevesebb kontextus váltás, jobb fókusz',
      implementation: [
        '1:1-ek egy napra koncentrálása',
        'Státusz meetingek összevonása',
        'Tematikus napok bevezetése',
        'Meeting típus alapú ütemezés'
      ]
    })
    
    return recommendations
  }
  
  private findBestDayForNoMeetings(
    meetingFreeBlocks: Array<{ day: string; hours: number[] }>
  ): string {
    // Find day with most free hours
    let bestDay = 'Wednesday' // Default
    let maxFreeHours = 0
    
    meetingFreeBlocks.forEach(block => {
      if (block.hours.length > maxFreeHours) {
        maxFreeHours = block.hours.length
        bestDay = block.day
      }
    })
    
    // Prefer mid-week days
    if (maxFreeHours === 0) {
      return 'Wednesday'
    }
    
    return bestDay
  }
  
  private createOptimalSchedule(
    currentState: MeetingFreeTimeRecommendation['currentState']
  ): MeetingFreeTimeRecommendation['proposedSchedule'] {
    const meetingWindows: MeetingFreeTimeRecommendation['proposedSchedule']['meetingWindows'] = []
    const protectedTime: MeetingFreeTimeRecommendation['proposedSchedule']['protectedTime'] = []
    
    // Define optimal meeting windows
    ;['Monday', 'Tuesday', 'Thursday', 'Friday'].forEach(day => {
      meetingWindows.push(
        { day, startHour: 10, endHour: 12 },
        { day, startHour: 14, endHour: 16 }
      )
    })
    
    // Wednesday as no-meeting day
    protectedTime.push({
      day: 'Wednesday',
      startHour: 9,
      endHour: 17,
      purpose: 'No Meeting Day - Deep Work'
    })
    
    // Daily focus time
    ;['Monday', 'Tuesday', 'Thursday', 'Friday'].forEach(day => {
      protectedTime.push({
        day,
        startHour: 9,
        endHour: 10,
        purpose: 'Morning Focus Time'
      })
      
      protectedTime.push({
        day,
        startHour: 16,
        endHour: 17,
        purpose: 'End of Day Wrap-up'
      })
    })
    
    return {
      meetingWindows,
      protectedTime
    }
  }
  
  private async getTeamsWithMeetingData(organizationId: string): Promise<any[]> {
    // Get teams and their meetings
    const { data: teams } = await this.supabase
      .from('teams')
      .select('id, name')
      .eq('organization_id', organizationId)
    
    if (!teams) return []
    
    // Get meeting participation for each team
    const teamsWithData = await Promise.all(
      teams.map(async (team) => {
        const { data: members } = await this.supabase
          .from('organization_members')
          .select('user_id')
          .eq('team_id', team.id)
        
        const memberIds = members?.map(m => m.user_id) || []
        
        // Get meetings where team members participated
        const { data: meetings } = await this.supabase
          .from('meetings')
          .select('id, participants')
          .eq('organization_id', organizationId)
          .overlaps('participants', memberIds)
          .limit(100)
        
        return {
          ...team,
          memberIds,
          meetings: meetings || []
        }
      })
    )
    
    return teamsWithData
  }
  
  private async buildCollaborationMatrix(teams: any[]): Promise<Map<string, Map<string, number>>> {
    const matrix = new Map<string, Map<string, number>>()
    
    // Initialize matrix
    teams.forEach(team => {
      matrix.set(team.id, new Map())
    })
    
    // Count collaborations
    teams.forEach(team1 => {
      teams.forEach(team2 => {
        if (team1.id !== team2.id) {
          // Count meetings with members from both teams
          let collaborationCount = 0
          
          team1.meetings.forEach((meeting: any) => {
            const hasTeam2Member = meeting.participants?.some((p: string) => 
              team2.memberIds.includes(p)
            )
            
            if (hasTeam2Member) {
              collaborationCount++
            }
          })
          
          matrix.get(team1.id)!.set(team2.id, collaborationCount)
        }
      })
    })
    
    return matrix
  }
  
  private calculateTeamCollaborationScores(
    teams: any[],
    matrix: Map<string, Map<string, number>>
  ): TeamCollaborationPattern['teams'] {
    return teams.map(team => {
      const collaborations = matrix.get(team.id) || new Map()
      
      // Calculate total collaborations
      let totalCollaborations = 0
      const primaryCollaborators: Array<{ teamId: string; frequency: number }> = []
      
      collaborations.forEach((count, teamId) => {
        totalCollaborations += count
        if (count > 0) {
          primaryCollaborators.push({ teamId, frequency: count })
        }
      })
      
      // Sort and get top collaborators
      primaryCollaborators.sort((a, b) => b.frequency - a.frequency)
      
      // Calculate collaboration score (0-100)
      const maxPossible = (teams.length - 1) * 10 // Assuming 10 meetings per team pair is good
      const collaborationScore = Math.min(100, 
        Math.round((totalCollaborations / maxPossible) * 100)
      )
      
      // Check isolation risk
      const isolationRisk = primaryCollaborators.length < 2 || collaborationScore < 20
      
      return {
        teamId: team.id,
        teamName: team.name,
        collaborationScore,
        primaryCollaborators: primaryCollaborators.slice(0, 3),
        isolationRisk
      }
    })
  }
  
  private identifySilos(matrix: Map<string, Map<string, number>>): string[] {
    const silos: string[] = []
    
    // Find teams with very low cross-team collaboration
    matrix.forEach((collaborations, teamId) => {
      const totalCollaborations = Array.from(collaborations.values())
        .reduce((sum, count) => sum + count, 0)
      
      if (totalCollaborations < 5) {
        silos.push(`${teamId} csapat izolált - minimális kereszt-csapat együttműködés`)
      }
    })
    
    // Find cliques (teams that only work with each other)
    const cliques = this.findCliques(matrix)
    cliques.forEach(clique => {
      silos.push(`Zárt csoport detektálva: ${clique.join(', ')}`)
    })
    
    return silos
  }
  
  private findCliques(matrix: Map<string, Map<string, number>>): string[][] {
    const cliques: string[][] = []
    const visited = new Set<string>()
    
    matrix.forEach((_, teamId) => {
      if (!visited.has(teamId)) {
        const clique = this.expandClique(teamId, matrix, visited)
        if (clique.length > 1) {
          cliques.push(clique)
        }
      }
    })
    
    return cliques
  }
  
  private expandClique(
    teamId: string,
    matrix: Map<string, Map<string, number>>,
    visited: Set<string>
  ): string[] {
    const clique = [teamId]
    visited.add(teamId)
    
    const collaborations = matrix.get(teamId) || new Map()
    
    // Find teams with strong bidirectional collaboration
    collaborations.forEach((count, otherTeam) => {
      if (!visited.has(otherTeam) && count > 5) {
        const reverseCount = matrix.get(otherTeam)?.get(teamId) || 0
        if (reverseCount > 5) {
          clique.push(...this.expandClique(otherTeam, matrix, visited))
        }
      }
    })
    
    return clique
  }
  
  private identifyCollaborationGaps(
    teams: any[],
    matrix: Map<string, Map<string, number>>
  ): TeamCollaborationPattern['collaborationGaps'] {
    const gaps: TeamCollaborationPattern['collaborationGaps'] = []
    
    // Find teams that should collaborate but don't
    teams.forEach(team1 => {
      teams.forEach(team2 => {
        if (team1.id !== team2.id) {
          const collaboration = matrix.get(team1.id)?.get(team2.id) || 0
          
          // Check if teams should collaborate based on their names/roles
          const shouldCollaborate = this.teamsShouldCollaborate(team1, team2)
          
          if (shouldCollaborate && collaboration < 2) {
            gaps.push({
              team1: team1.name,
              team2: team2.name,
              reason: 'Funkcionálisan kapcsolódó csapatok nem működnek együtt',
              suggestion: 'Havi közös meeting vagy projekt alapú együttműködés'
            })
          }
        }
      })
    })
    
    return gaps.slice(0, 5) // Limit to top 5 gaps
  }
  
  private teamsShouldCollaborate(team1: any, team2: any): boolean {
    // Simple heuristic based on team names
    const collaborationPairs = [
      ['product', 'engineering'],
      ['sales', 'marketing'],
      ['product', 'design'],
      ['engineering', 'qa'],
      ['hr', 'management']
    ]
    
    return collaborationPairs.some(pair => 
      (team1.name.toLowerCase().includes(pair[0]) && team2.name.toLowerCase().includes(pair[1])) ||
      (team1.name.toLowerCase().includes(pair[1]) && team2.name.toLowerCase().includes(pair[0]))
    )
  }
  
  private assessNetworkHealth(
    teams: TeamCollaborationPattern['teams'],
    siloIndicators: string[],
    collaborationGaps: TeamCollaborationPattern['collaborationGaps']
  ): TeamCollaborationPattern['networkHealth'] {
    const avgCollaborationScore = teams.reduce((sum, t) => sum + t.collaborationScore, 0) / teams.length
    const isolatedTeams = teams.filter(t => t.isolationRisk).length
    
    if (avgCollaborationScore > 70 && isolatedTeams === 0 && siloIndicators.length === 0) {
      return 'optimal'
    } else if (avgCollaborationScore > 50 && isolatedTeams <= 1) {
      return 'connected'
    } else if (siloIndicators.length > 2 || isolatedTeams > 2) {
      return 'siloed'
    } else {
      return 'fragmented'
    }
  }
  
  private calculateCrossFunctionalScore(
    matrix: Map<string, Map<string, number>>
  ): number {
    let totalPossibleConnections = 0
    let actualConnections = 0
    
    matrix.forEach((collaborations, team1) => {
      collaborations.forEach((count, team2) => {
        totalPossibleConnections++
        if (count > 0) {
          actualConnections++
        }
      })
    })
    
    return totalPossibleConnections > 0
      ? Math.round((actualConnections / totalPossibleConnections) * 100)
      : 0
  }
}

// Export singleton instance
export const meetingHealthAnalyzer = new MeetingHealthAnalyzer()