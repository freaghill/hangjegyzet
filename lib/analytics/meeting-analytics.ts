import { createClient } from '@/lib/supabase/server'
import { startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, subDays, subMonths } from 'date-fns'

export interface MeetingAnalytics {
  overview: {
    totalMeetings: number
    totalDuration: number
    averageDuration: number
    totalParticipants: number
    averageParticipants: number
    totalActionItems: number
    completedActionItems: number
    actionItemCompletionRate: number
  }
  trends: {
    meetingsOverTime: Array<{ date: string; count: number; duration: number }>
    participationTrends: Array<{ date: string; participants: number }>
    actionItemTrends: Array<{ date: string; created: number; completed: number }>
  }
  insights: {
    mostActiveSpeakers: Array<{ name: string; speakingTime: number; meetingCount: number }>
    meetingTypes: Array<{ type: string; count: number; percentage: number }>
    peakMeetingTimes: Array<{ hour: number; dayOfWeek: number; count: number }>
    averageMeetingsByDay: Record<string, number>
    sentimentDistribution: { positive: number; neutral: number; negative: number; mixed: number }
  }
  productivity: {
    actionItemsByPriority: { high: number; medium: number; low: number }
    actionItemsByAssignee: Array<{ assignee: string; total: number; completed: number; overdue: number }>
    averageCompletionTime: number
    overdueActionItems: number
    upcomingDeadlines: Array<{ text: string; deadline: string; assignee: string }>
  }
  keywords: {
    topKeywords: Array<{ word: string; count: number; sentiment: string }>
    trendingTopics: Array<{ topic: string; growth: number; mentions: number }>
    decisionKeywords: Array<{ phrase: string; frequency: number }>
  }
  teamDynamics: {
    collaborationScore: number
    participationBalance: number
    speakingTimeDistribution: Array<{ participant: string; percentage: number }>
    interactionMatrix: Array<{ from: string; to: string; interactions: number }>
  }
}

export class MeetingAnalyticsService {
  private supabase: any

  constructor() {
    this.initializeSupabase()
  }

  private async initializeSupabase() {
    this.supabase = await createClient()
  }

  async getAnalytics(
    organizationId: string,
    timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month',
    filters?: {
      participants?: string[]
      meetingTypes?: string[]
      tags?: string[]
    }
  ): Promise<MeetingAnalytics> {
    const dateRange = this.getDateRange(timeRange)
    
    // Parallel data fetching
    const [
      overview,
      trends,
      insights,
      productivity,
      keywords,
      teamDynamics
    ] = await Promise.all([
      this.getOverviewStats(organizationId, dateRange, filters),
      this.getTrendData(organizationId, dateRange, filters),
      this.getInsights(organizationId, dateRange, filters),
      this.getProductivityMetrics(organizationId, dateRange, filters),
      this.getKeywordAnalysis(organizationId, dateRange, filters),
      this.getTeamDynamics(organizationId, dateRange, filters)
    ])

    return {
      overview,
      trends,
      insights,
      productivity,
      keywords,
      teamDynamics
    }
  }

  private getDateRange(timeRange: string): { start: Date; end: Date } {
    const now = new Date()
    let start: Date
    let end: Date = now

    switch (timeRange) {
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 })
        end = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'month':
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
      case 'quarter':
        start = subMonths(startOfMonth(now), 2)
        end = endOfMonth(now)
        break
      case 'year':
        start = startOfYear(now)
        end = endOfYear(now)
        break
      default:
        start = startOfMonth(now)
        end = endOfMonth(now)
    }

    return { start, end }
  }

  private async getOverviewStats(
    organizationId: string,
    dateRange: { start: Date; end: Date },
    filters?: any
  ): Promise<MeetingAnalytics['overview']> {
    // Get meetings in date range
    let meetingsQuery = this.supabase
      .from('meetings')
      .select(`
        id,
        duration_seconds,
        created_at,
        meeting_participants(count),
        meeting_action_items(
          id,
          status
        )
      `)
      .eq('organization_id', organizationId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .eq('status', 'completed')

    const { data: meetings, error } = await meetingsQuery

    if (error || !meetings) {
      console.error('Error fetching overview stats:', error)
      return this.getEmptyOverview()
    }

    const totalMeetings = meetings.length
    const totalDuration = meetings.reduce((sum, m) => sum + (m.duration_seconds || 0), 0)
    const averageDuration = totalMeetings > 0 ? totalDuration / totalMeetings : 0

    // Calculate participant stats
    const totalParticipants = meetings.reduce((sum, m) => sum + (m.meeting_participants?.[0]?.count || 0), 0)
    const averageParticipants = totalMeetings > 0 ? totalParticipants / totalMeetings : 0

    // Calculate action item stats
    const allActionItems = meetings.flatMap(m => m.meeting_action_items || [])
    const totalActionItems = allActionItems.length
    const completedActionItems = allActionItems.filter(ai => ai.status === 'completed').length
    const actionItemCompletionRate = totalActionItems > 0 ? (completedActionItems / totalActionItems) * 100 : 0

    return {
      totalMeetings,
      totalDuration,
      averageDuration,
      totalParticipants,
      averageParticipants,
      totalActionItems,
      completedActionItems,
      actionItemCompletionRate
    }
  }

  private async getTrendData(
    organizationId: string,
    dateRange: { start: Date; end: Date },
    filters?: any
  ): Promise<MeetingAnalytics['trends']> {
    const { data: meetings, error } = await this.supabase
      .from('meetings')
      .select(`
        created_at,
        duration_seconds,
        meeting_participants(count),
        meeting_action_items(
          created_at,
          status,
          completed_at
        )
      `)
      .eq('organization_id', organizationId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .eq('status', 'completed')
      .order('created_at')

    if (error || !meetings) {
      return {
        meetingsOverTime: [],
        participationTrends: [],
        actionItemTrends: []
      }
    }

    // Group meetings by day
    const meetingsByDay = new Map<string, any[]>()
    meetings.forEach(meeting => {
      const date = new Date(meeting.created_at).toISOString().split('T')[0]
      if (!meetingsByDay.has(date)) {
        meetingsByDay.set(date, [])
      }
      meetingsByDay.get(date)!.push(meeting)
    })

    // Calculate trends
    const meetingsOverTime = Array.from(meetingsByDay.entries()).map(([date, dayMeetings]) => ({
      date,
      count: dayMeetings.length,
      duration: dayMeetings.reduce((sum, m) => sum + (m.duration_seconds || 0), 0)
    }))

    const participationTrends = Array.from(meetingsByDay.entries()).map(([date, dayMeetings]) => ({
      date,
      participants: dayMeetings.reduce((sum, m) => sum + (m.meeting_participants?.[0]?.count || 0), 0)
    }))

    // Action item trends
    const actionItemsByDay = new Map<string, { created: number; completed: number }>()
    meetings.forEach(meeting => {
      meeting.meeting_action_items?.forEach((ai: any) => {
        const createdDate = new Date(ai.created_at).toISOString().split('T')[0]
        if (!actionItemsByDay.has(createdDate)) {
          actionItemsByDay.set(createdDate, { created: 0, completed: 0 })
        }
        actionItemsByDay.get(createdDate)!.created++
        
        if (ai.status === 'completed' && ai.completed_at) {
          const completedDate = new Date(ai.completed_at).toISOString().split('T')[0]
          if (!actionItemsByDay.has(completedDate)) {
            actionItemsByDay.set(completedDate, { created: 0, completed: 0 })
          }
          actionItemsByDay.get(completedDate)!.completed++
        }
      })
    })

    const actionItemTrends = Array.from(actionItemsByDay.entries()).map(([date, stats]) => ({
      date,
      created: stats.created,
      completed: stats.completed
    }))

    return {
      meetingsOverTime,
      participationTrends,
      actionItemTrends
    }
  }

  private async getInsights(
    organizationId: string,
    dateRange: { start: Date; end: Date },
    filters?: any
  ): Promise<MeetingAnalytics['insights']> {
    // Get meetings with segments for speaker analysis
    const { data: meetings, error } = await this.supabase
      .from('meetings')
      .select(`
        id,
        created_at,
        template_id,
        metadata,
        meeting_segments(
          speaker,
          start_time,
          end_time
        ),
        meeting_participants(
          name
        )
      `)
      .eq('organization_id', organizationId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .eq('status', 'completed')

    if (error || !meetings) {
      return this.getEmptyInsights()
    }

    // Calculate most active speakers
    const speakerStats = new Map<string, { speakingTime: number; meetingCount: Set<string> }>()
    meetings.forEach(meeting => {
      meeting.meeting_segments?.forEach((segment: any) => {
        const duration = segment.end_time - segment.start_time
        if (!speakerStats.has(segment.speaker)) {
          speakerStats.set(segment.speaker, { speakingTime: 0, meetingCount: new Set() })
        }
        const stats = speakerStats.get(segment.speaker)!
        stats.speakingTime += duration
        stats.meetingCount.add(meeting.id)
      })
    })

    const mostActiveSpeakers = Array.from(speakerStats.entries())
      .map(([name, stats]) => ({
        name,
        speakingTime: stats.speakingTime,
        meetingCount: stats.meetingCount.size
      }))
      .sort((a, b) => b.speakingTime - a.speakingTime)
      .slice(0, 10)

    // Meeting types distribution
    const meetingTypeCount = new Map<string, number>()
    meetings.forEach(meeting => {
      const type = meeting.template_id || 'general'
      meetingTypeCount.set(type, (meetingTypeCount.get(type) || 0) + 1)
    })

    const totalMeetings = meetings.length
    const meetingTypes = Array.from(meetingTypeCount.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: (count / totalMeetings) * 100
    }))

    // Peak meeting times
    const meetingTimeSlots = new Map<string, number>()
    meetings.forEach(meeting => {
      const date = new Date(meeting.created_at)
      const hour = date.getHours()
      const dayOfWeek = date.getDay()
      const key = `${hour}-${dayOfWeek}`
      meetingTimeSlots.set(key, (meetingTimeSlots.get(key) || 0) + 1)
    })

    const peakMeetingTimes = Array.from(meetingTimeSlots.entries())
      .map(([key, count]) => {
        const [hour, dayOfWeek] = key.split('-').map(Number)
        return { hour, dayOfWeek, count }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Average meetings by day of week
    const meetingsByDayOfWeek = new Map<number, number>()
    meetings.forEach(meeting => {
      const dayOfWeek = new Date(meeting.created_at).getDay()
      meetingsByDayOfWeek.set(dayOfWeek, (meetingsByDayOfWeek.get(dayOfWeek) || 0) + 1)
    })

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const averageMeetingsByDay: Record<string, number> = {}
    dayNames.forEach((day, index) => {
      averageMeetingsByDay[day] = meetingsByDayOfWeek.get(index) || 0
    })

    // Sentiment distribution
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0, mixed: 0 }
    meetings.forEach(meeting => {
      const sentiment = meeting.metadata?.sentiment || 'neutral'
      if (sentiment in sentimentCounts) {
        sentimentCounts[sentiment as keyof typeof sentimentCounts]++
      }
    })

    return {
      mostActiveSpeakers,
      meetingTypes,
      peakMeetingTimes,
      averageMeetingsByDay,
      sentimentDistribution: sentimentCounts
    }
  }

  private async getProductivityMetrics(
    organizationId: string,
    dateRange: { start: Date; end: Date },
    filters?: any
  ): Promise<MeetingAnalytics['productivity']> {
    const { data: actionItems, error } = await this.supabase
      .from('meeting_action_items')
      .select(`
        *,
        meetings!inner(
          organization_id,
          created_at
        )
      `)
      .eq('meetings.organization_id', organizationId)
      .gte('meetings.created_at', dateRange.start.toISOString())
      .lte('meetings.created_at', dateRange.end.toISOString())

    if (error || !actionItems) {
      return this.getEmptyProductivity()
    }

    // Action items by priority
    const actionItemsByPriority = {
      high: actionItems.filter(ai => ai.priority === 'high').length,
      medium: actionItems.filter(ai => ai.priority === 'medium').length,
      low: actionItems.filter(ai => ai.priority === 'low').length
    }

    // Action items by assignee
    const assigneeStats = new Map<string, { total: number; completed: number; overdue: number }>()
    const now = new Date()

    actionItems.forEach(ai => {
      const assignee = ai.assignee_name || 'Unassigned'
      if (!assigneeStats.has(assignee)) {
        assigneeStats.set(assignee, { total: 0, completed: 0, overdue: 0 })
      }
      const stats = assigneeStats.get(assignee)!
      stats.total++
      
      if (ai.status === 'completed') {
        stats.completed++
      } else if (ai.due_date && new Date(ai.due_date) < now) {
        stats.overdue++
      }
    })

    const actionItemsByAssignee = Array.from(assigneeStats.entries())
      .map(([assignee, stats]) => ({ assignee, ...stats }))
      .sort((a, b) => b.total - a.total)

    // Calculate average completion time
    const completedItems = actionItems.filter(ai => 
      ai.status === 'completed' && ai.completed_at && ai.created_at
    )
    
    let averageCompletionTime = 0
    if (completedItems.length > 0) {
      const totalTime = completedItems.reduce((sum, ai) => {
        const created = new Date(ai.created_at).getTime()
        const completed = new Date(ai.completed_at).getTime()
        return sum + (completed - created)
      }, 0)
      averageCompletionTime = totalTime / completedItems.length / (1000 * 60 * 60 * 24) // Convert to days
    }

    // Count overdue items
    const overdueActionItems = actionItems.filter(ai => 
      ai.status !== 'completed' && ai.due_date && new Date(ai.due_date) < now
    ).length

    // Get upcoming deadlines
    const upcomingDeadlines = actionItems
      .filter(ai => 
        ai.status !== 'completed' && 
        ai.due_date && 
        new Date(ai.due_date) >= now &&
        new Date(ai.due_date) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      )
      .map(ai => ({
        text: ai.text,
        deadline: ai.due_date,
        assignee: ai.assignee_name || 'Unassigned'
      }))
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5)

    return {
      actionItemsByPriority,
      actionItemsByAssignee,
      averageCompletionTime,
      overdueActionItems,
      upcomingDeadlines
    }
  }

  private async getKeywordAnalysis(
    organizationId: string,
    dateRange: { start: Date; end: Date },
    filters?: any
  ): Promise<MeetingAnalytics['keywords']> {
    const { data: meetings, error } = await this.supabase
      .from('meetings')
      .select(`
        metadata,
        meeting_ai_summaries(
          key_points,
          decisions
        )
      `)
      .eq('organization_id', organizationId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .eq('status', 'completed')

    if (error || !meetings) {
      return {
        topKeywords: [],
        trendingTopics: [],
        decisionKeywords: []
      }
    }

    // Extract keywords from metadata
    const keywordCounts = new Map<string, { count: number; sentiment: string }>()
    const topicGrowth = new Map<string, { current: number; previous: number }>()

    meetings.forEach(meeting => {
      // Count topics
      const topics = meeting.metadata?.topics || []
      topics.forEach((topic: string) => {
        if (!keywordCounts.has(topic)) {
          keywordCounts.set(topic, { count: 0, sentiment: 'neutral' })
        }
        const stats = keywordCounts.get(topic)!
        stats.count++
        stats.sentiment = meeting.metadata?.sentiment || 'neutral'
      })

      // Extract keywords from key points
      const keyPoints = meeting.meeting_ai_summaries?.[0]?.key_points || []
      keyPoints.forEach((point: string) => {
        // Simple keyword extraction (in production, use NLP)
        const words = point.toLowerCase().split(/\s+/)
          .filter(word => word.length > 4)
          .filter(word => !['hogy', 'mint', 'által', 'után', 'előtt'].includes(word))
        
        words.forEach(word => {
          if (!keywordCounts.has(word)) {
            keywordCounts.set(word, { count: 0, sentiment: 'neutral' })
          }
          keywordCounts.get(word)!.count++
        })
      })
    })

    const topKeywords = Array.from(keywordCounts.entries())
      .map(([word, stats]) => ({ word, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    // For trending topics, we'd need historical data
    // This is a simplified version
    const trendingTopics = topKeywords
      .slice(0, 10)
      .map(kw => ({
        topic: kw.word,
        growth: Math.random() * 100 - 50, // Placeholder - would calculate actual growth
        mentions: kw.count
      }))
      .sort((a, b) => b.growth - a.growth)

    // Decision keywords
    const decisionPhrases = new Map<string, number>()
    meetings.forEach(meeting => {
      const decisions = meeting.meeting_ai_summaries?.[0]?.decisions || []
      decisions.forEach((decision: string) => {
        // Extract decision patterns
        const patterns = [
          /döntöttünk hogy (.+)/i,
          /megállapodtunk (.+)/i,
          /elfogadtuk (.+)/i,
          /jóváhagytuk (.+)/i
        ]
        
        patterns.forEach(pattern => {
          const match = decision.match(pattern)
          if (match) {
            const phrase = match[1].substring(0, 50)
            decisionPhrases.set(phrase, (decisionPhrases.get(phrase) || 0) + 1)
          }
        })
      })
    })

    const decisionKeywords = Array.from(decisionPhrases.entries())
      .map(([phrase, frequency]) => ({ phrase, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)

    return {
      topKeywords,
      trendingTopics,
      decisionKeywords
    }
  }

  private async getTeamDynamics(
    organizationId: string,
    dateRange: { start: Date; end: Date },
    filters?: any
  ): Promise<MeetingAnalytics['teamDynamics']> {
    const { data: meetings, error } = await this.supabase
      .from('meetings')
      .select(`
        meeting_segments(
          speaker,
          start_time,
          end_time,
          content
        ),
        meeting_participants(
          name
        )
      `)
      .eq('organization_id', organizationId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .eq('status', 'completed')

    if (error || !meetings) {
      return this.getEmptyTeamDynamics()
    }

    // Calculate speaking time distribution
    const speakingTimes = new Map<string, number>()
    let totalSpeakingTime = 0

    meetings.forEach(meeting => {
      meeting.meeting_segments?.forEach((segment: any) => {
        const duration = segment.end_time - segment.start_time
        speakingTimes.set(segment.speaker, (speakingTimes.get(segment.speaker) || 0) + duration)
        totalSpeakingTime += duration
      })
    })

    const speakingTimeDistribution = Array.from(speakingTimes.entries())
      .map(([participant, time]) => ({
        participant,
        percentage: (time / totalSpeakingTime) * 100
      }))
      .sort((a, b) => b.percentage - a.percentage)

    // Calculate participation balance (Gini coefficient)
    const percentages = speakingTimeDistribution.map(s => s.percentage)
    const participationBalance = this.calculateGiniCoefficient(percentages)

    // Build interaction matrix
    const interactions = new Map<string, number>()
    meetings.forEach(meeting => {
      const segments = meeting.meeting_segments || []
      for (let i = 1; i < segments.length; i++) {
        const from = segments[i - 1].speaker
        const to = segments[i].speaker
        if (from !== to) {
          const key = `${from}-${to}`
          interactions.set(key, (interactions.get(key) || 0) + 1)
        }
      }
    })

    const interactionMatrix = Array.from(interactions.entries())
      .map(([key, count]) => {
        const [from, to] = key.split('-')
        return { from, to, interactions: count }
      })
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 20)

    // Calculate collaboration score (0-100)
    const uniqueSpeakers = speakingTimes.size
    const avgInteractionsPerPair = interactionMatrix.reduce((sum, i) => sum + i.interactions, 0) / interactionMatrix.length
    const collaborationScore = Math.min(100, (uniqueSpeakers * 10) + (avgInteractionsPerPair * 2) + (participationBalance * 50))

    return {
      collaborationScore: Math.round(collaborationScore),
      participationBalance: Math.round(participationBalance * 100),
      speakingTimeDistribution,
      interactionMatrix
    }
  }

  private calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) return 0
    
    const sorted = [...values].sort((a, b) => a - b)
    const n = sorted.length
    const cumSum = sorted.reduce((acc, val, i) => {
      acc.push((acc[i - 1] || 0) + val)
      return acc
    }, [] as number[])
    
    const sum = cumSum[n - 1]
    if (sum === 0) return 0
    
    const gini = (n + 1 - 2 * cumSum.reduce((acc, cs, i) => acc + cs, 0) / sum) / n
    return 1 - gini // Return balance instead of inequality
  }

  private getEmptyOverview(): MeetingAnalytics['overview'] {
    return {
      totalMeetings: 0,
      totalDuration: 0,
      averageDuration: 0,
      totalParticipants: 0,
      averageParticipants: 0,
      totalActionItems: 0,
      completedActionItems: 0,
      actionItemCompletionRate: 0
    }
  }

  private getEmptyInsights(): MeetingAnalytics['insights'] {
    return {
      mostActiveSpeakers: [],
      meetingTypes: [],
      peakMeetingTimes: [],
      averageMeetingsByDay: {},
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0, mixed: 0 }
    }
  }

  private getEmptyProductivity(): MeetingAnalytics['productivity'] {
    return {
      actionItemsByPriority: { high: 0, medium: 0, low: 0 },
      actionItemsByAssignee: [],
      averageCompletionTime: 0,
      overdueActionItems: 0,
      upcomingDeadlines: []
    }
  }

  private getEmptyTeamDynamics(): MeetingAnalytics['teamDynamics'] {
    return {
      collaborationScore: 0,
      participationBalance: 0,
      speakingTimeDistribution: [],
      interactionMatrix: []
    }
  }
}

export const meetingAnalytics = new MeetingAnalyticsService()