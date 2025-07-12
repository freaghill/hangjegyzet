import { createClient } from '@/lib/supabase/client'
import { trackMetric } from '@/lib/monitoring'

export interface EmailDraft {
  to: string[]
  cc?: string[]
  subject: string
  body: string
  attachments?: Array<{
    type: 'summary' | 'action_items' | 'transcript'
    filename: string
  }>
  sendTime?: Date // For scheduled sending
}

export interface CalendarInvite {
  title: string
  description: string
  attendees: string[]
  startTime: Date
  endTime: Date
  location?: string
  recurrence?: 'none' | 'weekly' | 'biweekly' | 'monthly'
  reminders?: number[] // Minutes before
}

export interface NotificationTemplate {
  platform: 'slack' | 'teams'
  channel?: string
  message: string
  mentions?: string[]
  priority?: 'low' | 'normal' | 'high'
}

export interface ActionItemProgress {
  itemId: string
  task: string
  assignee: string
  deadline?: Date
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  progress: number // 0-100
  lastUpdate?: Date
  blockers?: string[]
  comments?: Array<{
    author: string
    text: string
    timestamp: Date
  }>
}

export interface FollowUpPlan {
  meetingId: string
  emails: EmailDraft[]
  calendarInvites: CalendarInvite[]
  notifications: NotificationTemplate[]
  actionTracking: ActionItemProgress[]
  automationRules: Array<{
    trigger: 'deadline_approaching' | 'no_progress' | 'completion' | 'blocker'
    action: 'send_reminder' | 'escalate' | 'schedule_checkin' | 'notify_team'
    config: any
  }>
}

export class IntelligentFollowUp {
  private supabase = createClient()
  
  /**
   * Generate complete follow-up plan for a meeting
   */
  async generateFollowUpPlan(meetingId: string): Promise<FollowUpPlan> {
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
      
      // Generate all follow-up components
      const [emails, calendarInvites, notifications, actionTracking] = await Promise.all([
        this.generateEmailDrafts(meeting),
        this.generateCalendarInvites(meeting),
        this.generateNotificationTemplates(meeting),
        this.initializeActionTracking(meeting)
      ])
      
      // Create automation rules based on meeting characteristics
      const automationRules = this.createAutomationRules(meeting, actionTracking)
      
      const plan: FollowUpPlan = {
        meetingId,
        emails,
        calendarInvites,
        notifications,
        actionTracking,
        automationRules
      }
      
      // Track metrics
      trackMetric('ai.follow_up_plan_generated', 1, {
        duration: (Date.now() - startTime) / 1000,
        emails: emails.length,
        calendar_invites: calendarInvites.length,
        action_items: actionTracking.length
      })
      
      return plan
    } catch (error) {
      console.error('Error generating follow-up plan:', error)
      trackMetric('ai.follow_up_plan_error', 1)
      throw error
    }
  }
  
  /**
   * Generate smart email drafts
   */
  async generateEmailDrafts(meeting: any): Promise<EmailDraft[]> {
    const drafts: EmailDraft[] = []
    
    // Get participant emails
    const participants = meeting.participants || []
    const participantEmails = participants.map((p: any) => p.email).filter(Boolean)
    
    // 1. Summary email for all participants
    if (participantEmails.length > 0) {
      drafts.push({
        to: participantEmails,
        subject: `${meeting.title || 'Meeting'} - Összefoglaló és következő lépések`,
        body: this.generateSummaryEmailBody(meeting),
        attachments: [
          { type: 'summary', filename: 'meeting-osszefoglalo.pdf' },
          { type: 'action_items', filename: 'akcio-elemek.pdf' }
        ]
      })
    }
    
    // 2. Action item emails for assignees
    if (meeting.action_items && Array.isArray(meeting.action_items)) {
      const assigneeGroups = new Map<string, any[]>()
      
      meeting.action_items.forEach((item: any) => {
        if (item.assignee) {
          if (!assigneeGroups.has(item.assignee)) {
            assigneeGroups.set(item.assignee, [])
          }
          assigneeGroups.get(item.assignee)!.push(item)
        }
      })
      
      assigneeGroups.forEach((items, assignee) => {
        drafts.push({
          to: [assignee],
          cc: [meeting.organizer_email].filter(Boolean),
          subject: `Akció elemek - ${meeting.title || 'Meeting követés'}`,
          body: this.generateActionItemEmailBody(items, assignee, meeting),
          sendTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next day
        })
      })
    }
    
    // 3. Stakeholder update email (if high-priority items exist)
    const highPriorityItems = meeting.action_items?.filter((item: any) => item.priority === 'high')
    if (highPriorityItems?.length > 0 && meeting.stakeholders?.length > 0) {
      drafts.push({
        to: meeting.stakeholders,
        subject: `Vezetői összefoglaló - ${meeting.title || 'Fontos meeting'}`,
        body: this.generateStakeholderEmailBody(meeting, highPriorityItems)
      })
    }
    
    // 4. Follow-up meeting preparation email (if follow-up is scheduled)
    if (meeting.next_meeting_date) {
      const followUpDate = new Date(meeting.next_meeting_date)
      const reminderDate = new Date(followUpDate.getTime() - 48 * 60 * 60 * 1000) // 2 days before
      
      drafts.push({
        to: participantEmails,
        subject: `Emlékeztető: Következő meeting előkészítése - ${meeting.title}`,
        body: this.generateFollowUpPreparationEmail(meeting),
        sendTime: reminderDate
      })
    }
    
    return drafts
  }
  
  /**
   * Generate calendar invites for follow-ups
   */
  async generateCalendarInvites(meeting: any): Promise<CalendarInvite[]> {
    const invites: CalendarInvite[] = []
    
    // 1. Action item check-in meetings
    if (meeting.action_items?.length > 3) {
      const checkInDate = new Date()
      checkInDate.setDate(checkInDate.getDate() + 7) // One week later
      checkInDate.setHours(10, 0, 0, 0)
      
      invites.push({
        title: `${meeting.title} - Akció elemek státusz`,
        description: this.generateCheckInMeetingDescription(meeting),
        attendees: meeting.participants?.map((p: any) => p.email).filter(Boolean) || [],
        startTime: checkInDate,
        endTime: new Date(checkInDate.getTime() + 30 * 60 * 1000), // 30 minutes
        recurrence: 'weekly',
        reminders: [15, 1440] // 15 minutes and 1 day before
      })
    }
    
    // 2. Deadline-based meetings
    const itemsWithDeadlines = meeting.action_items?.filter((item: any) => item.deadline)
    if (itemsWithDeadlines?.length > 0) {
      // Group by deadline week
      const deadlineGroups = new Map<string, any[]>()
      
      itemsWithDeadlines.forEach((item: any) => {
        const deadline = new Date(item.deadline)
        const weekKey = `${deadline.getFullYear()}-W${Math.ceil(deadline.getDate() / 7)}`
        
        if (!deadlineGroups.has(weekKey)) {
          deadlineGroups.set(weekKey, [])
        }
        deadlineGroups.get(weekKey)!.push(item)
      })
      
      deadlineGroups.forEach((items, weekKey) => {
        const firstDeadline = new Date(Math.min(...items.map(i => new Date(i.deadline).getTime())))
        const reviewDate = new Date(firstDeadline.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days before
        reviewDate.setHours(14, 0, 0, 0)
        
        invites.push({
          title: `Határidő áttekintés - ${items.length} akció elem`,
          description: this.generateDeadlineReviewDescription(items),
          attendees: [...new Set(items.map((i: any) => i.assignee).filter(Boolean))],
          startTime: reviewDate,
          endTime: new Date(reviewDate.getTime() + 45 * 60 * 1000), // 45 minutes
          reminders: [60] // 1 hour before
        })
      })
    }
    
    // 3. Follow-up meeting based on patterns
    if (meeting.requires_follow_up) {
      const followUpDate = meeting.next_meeting_date 
        ? new Date(meeting.next_meeting_date)
        : this.calculateOptimalFollowUpDate(meeting)
      
      invites.push({
        title: `${meeting.title} - Követő meeting`,
        description: this.generateFollowUpMeetingDescription(meeting),
        attendees: meeting.participants?.map((p: any) => p.email).filter(Boolean) || [],
        startTime: followUpDate,
        endTime: new Date(followUpDate.getTime() + meeting.scheduled_duration * 60 * 1000),
        location: meeting.location,
        recurrence: meeting.recurrence || 'none',
        reminders: [15, 1440] // 15 minutes and 1 day before
      })
    }
    
    return invites
  }
  
  /**
   * Generate notification templates
   */
  async generateNotificationTemplates(meeting: any): Promise<NotificationTemplate[]> {
    const notifications: NotificationTemplate[] = []
    
    // 1. Slack/Teams summary notification
    notifications.push({
      platform: 'slack',
      channel: meeting.notification_channel || '#general',
      message: this.generateSlackSummary(meeting),
      mentions: meeting.participants?.map((p: any) => p.slack_id).filter(Boolean) || [],
      priority: meeting.priority || 'normal'
    })
    
    // 2. Action items notification
    if (meeting.action_items?.length > 0) {
      const actionMessage = this.generateActionItemsNotification(meeting.action_items)
      
      notifications.push({
        platform: 'teams',
        channel: meeting.teams_channel,
        message: actionMessage,
        mentions: meeting.action_items
          .map((item: any) => item.assignee_teams_id)
          .filter(Boolean),
        priority: meeting.action_items.some((i: any) => i.priority === 'high') ? 'high' : 'normal'
      })
    }
    
    // 3. Weekly progress notification
    if (meeting.action_items?.filter((i: any) => !i.completed).length > 2) {
      notifications.push({
        platform: 'slack',
        message: this.generateWeeklyProgressTemplate(meeting),
        priority: 'normal'
      })
    }
    
    return notifications
  }
  
  /**
   * Initialize action item tracking
   */
  async initializeActionTracking(meeting: any): Promise<ActionItemProgress[]> {
    if (!meeting.action_items || !Array.isArray(meeting.action_items)) {
      return []
    }
    
    return meeting.action_items.map((item: any) => ({
      itemId: item.id || crypto.randomUUID(),
      task: item.task,
      assignee: item.assignee,
      deadline: item.deadline ? new Date(item.deadline) : undefined,
      status: item.completed ? 'completed' : 'pending',
      progress: item.completed ? 100 : 0,
      lastUpdate: new Date(),
      blockers: [],
      comments: []
    }))
  }
  
  /**
   * Create automation rules
   */
  private createAutomationRules(meeting: any, actionItems: ActionItemProgress[]): FollowUpPlan['automationRules'] {
    const rules: FollowUpPlan['automationRules'] = []
    
    // 1. Deadline approaching reminders
    actionItems.forEach(item => {
      if (item.deadline) {
        rules.push({
          trigger: 'deadline_approaching',
          action: 'send_reminder',
          config: {
            itemId: item.itemId,
            daysBefore: [3, 1], // 3 days and 1 day before
            recipients: [item.assignee, meeting.organizer_email].filter(Boolean)
          }
        })
      }
    })
    
    // 2. No progress alerts
    rules.push({
      trigger: 'no_progress',
      action: 'escalate',
      config: {
        daysWithoutProgress: 5,
        escalateTo: meeting.manager_email || meeting.organizer_email,
        includeItems: actionItems.filter(i => i.status !== 'completed').map(i => i.itemId)
      }
    })
    
    // 3. Completion celebrations
    rules.push({
      trigger: 'completion',
      action: 'notify_team',
      config: {
        threshold: 0.8, // 80% completion
        channel: meeting.notification_channel,
        message: 'Great progress! 80% of action items completed 🎉'
      }
    })
    
    // 4. Blocker handling
    rules.push({
      trigger: 'blocker',
      action: 'schedule_checkin',
      config: {
        urgency: 'high',
        participants: ['assignee', 'manager'],
        meetingDuration: 30
      }
    })
    
    return rules
  }
  
  /**
   * Track action item progress
   */
  async updateActionProgress(
    itemId: string,
    update: Partial<ActionItemProgress>
  ): Promise<ActionItemProgress> {
    try {
      // In a real implementation, this would update the database
      // For now, we'll simulate the update
      const updatedItem: ActionItemProgress = {
        itemId,
        task: update.task || '',
        assignee: update.assignee || '',
        deadline: update.deadline,
        status: update.status || 'pending',
        progress: update.progress || 0,
        lastUpdate: new Date(),
        blockers: update.blockers,
        comments: update.comments
      }
      
      // Track metrics
      trackMetric('ai.action_item_updated', 1, {
        status: updatedItem.status,
        progress: updatedItem.progress
      })
      
      // Check if automation rules should be triggered
      if (updatedItem.status === 'blocked' && updatedItem.blockers?.length > 0) {
        await this.triggerBlockerAutomation(updatedItem)
      }
      
      return updatedItem
    } catch (error) {
      console.error('Error updating action progress:', error)
      throw error
    }
  }
  
  // Email body generators
  
  private generateSummaryEmailBody(meeting: any): string {
    return `Tisztelt Kollégák,

Köszönöm a részvételt a mai "${meeting.title || 'meeting'}" megbeszélésen. Az alábbiakban találják az összefoglalót és a következő lépéseket.

**Meeting összefoglaló:**
${meeting.summary || 'A meeting során áttekintettük a főbb témákat és döntéseket hoztunk.'}

**Főbb döntések:**
${meeting.decisions?.map((d: string) => `• ${d}`).join('\n') || '• Nincs rögzített döntés'}

**Következő lépések:**
${meeting.action_items?.map((item: any) => 
  `• ${item.task} - Felelős: ${item.assignee || 'TBD'}, Határidő: ${
    item.deadline ? new Date(item.deadline).toLocaleDateString('hu-HU') : 'TBD'
  }`
).join('\n') || '• Nincs akció elem'}

**Következő meeting:**
${meeting.next_meeting_date 
  ? new Date(meeting.next_meeting_date).toLocaleDateString('hu-HU', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  : 'Később egyeztetjük'}

A részletes jegyzőkönyv és a felvétel (ha készült) elérhető a HangJegyzet rendszerben.

Üdvözlettel,
${meeting.organizer_name || 'Meeting Szervező'}

---
Ez az email automatikusan generálódott a HangJegyzet AI által.`
  }
  
  private generateActionItemEmailBody(items: any[], assignee: string, meeting: any): string {
    const sortedItems = items.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1
      if (a.priority !== 'high' && b.priority === 'high') return 1
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      return 0
    })
    
    return `Kedves ${assignee},

A "${meeting.title || 'meeting'}" megbeszélésen az alábbi akció elemek kerültek hozzád rendelésre:

${sortedItems.map((item, index) => `
${index + 1}. **${item.task}**
   Prioritás: ${item.priority === 'high' ? '🔴 Magas' : item.priority === 'medium' ? '🟡 Közepes' : '🟢 Alacsony'}
   Határidő: ${item.deadline ? new Date(item.deadline).toLocaleDateString('hu-HU') : 'Nincs megadva'}
   ${item.description ? `Részletek: ${item.description}` : ''}
`).join('\n')}

**Emlékeztetők:**
• A magas prioritású elemeket kérjük kezelni elsőként
• Határidő előtt 2 nappal automatikus emlékeztetőt kapsz
• Akadály esetén jelezz időben a projekt vezetőnek

A feladatok státuszát a HangJegyzet rendszerben tudod frissíteni.

Sikeres munkát!

---
Ez az email automatikusan generálódott a HangJegyzet AI által.`
  }
  
  private generateStakeholderEmailBody(meeting: any, highPriorityItems: any[]): string {
    return `Tisztelt Vezetőség,

Az alábbiakban található a "${meeting.title}" meeting vezetői összefoglalója.

**Executive Summary:**
${meeting.executive_summary || meeting.summary?.substring(0, 200) || 'Fontos döntések születtek a meeting során.'}

**Kritikus akció elemek:**
${highPriorityItems.map(item => 
  `• ${item.task} - ${item.assignee}, határidő: ${
    item.deadline ? new Date(item.deadline).toLocaleDateString('hu-HU') : 'ASAP'
  }`
).join('\n')}

**Főbb kockázatok:**
${meeting.risks?.map((r: string) => `• ${r}`).join('\n') || '• Nincs azonosított kockázat'}

**Szükséges vezetői döntések:**
${meeting.required_decisions?.map((d: string) => `• ${d}`).join('\n') || '• Nincs függő döntés'}

Részletes információkért kérem tekintse meg a teljes meeting jegyzőkönyvet a HangJegyzet rendszerben.

Üdvözlettel,
${meeting.organizer_name || 'Meeting Szervező'}

---
Ez az email automatikusan generálódott a HangJegyzet AI által.`
  }
  
  private generateFollowUpPreparationEmail(meeting: any): string {
    return `Tisztelt Résztvevők,

Emlékeztetőül: 2 nap múlva találkozunk a "${meeting.title}" követő meetingen.

**Előkészítendő:**
• Kérjük tekintse át az előző meeting jegyzőkönyvét
• Készítse elő az akció elemek státusz jelentését
• Gyűjtse össze az új témákat/kérdéseket

**Előző meeting főbb pontjai:**
${meeting.key_points?.map((p: string) => `• ${p}`).join('\n') || '• Lásd a teljes jegyzőkönyvet'}

**Nyitott akció elemek:**
${meeting.action_items?.filter((i: any) => !i.completed).map((item: any) => 
  `• ${item.task} (${item.assignee})`
).join('\n') || '• Nincs nyitott elem'}

A meeting anyagokat megtalálja a HangJegyzet rendszerben.

Köszönöm!

---
Ez az email automatikusan generálódott a HangJegyzet AI által.`
  }
  
  // Calendar invite descriptions
  
  private generateCheckInMeetingDescription(meeting: any): string {
    return `Heti státusz egyeztetés a "${meeting.title}" akció elemeiről.

Agenda:
1. Akció elemek státusz (5 perc/elem)
2. Akadályok megbeszélése
3. Prioritások újraértékelése
4. Következő lépések

Kérjük készüljön fel:
- Státusz jelentéssel minden akció elemről
- Azonosított akadályokkal
- Segítség kérésekkel

Meeting ID: ${meeting.id}`
  }
  
  private generateDeadlineReviewDescription(items: any[]): string {
    return `Határidő áttekintés a következő akció elemekhez:

${items.map(item => 
  `• ${item.task}
  Felelős: ${item.assignee}
  Határidő: ${new Date(item.deadline).toLocaleDateString('hu-HU')}`
).join('\n\n')}

Cél: Biztosítani hogy minden elem időben elkészül.`
  }
  
  private generateFollowUpMeetingDescription(meeting: any): string {
    return `Követő meeting: ${meeting.title}

Előző meeting: ${meeting.created_at ? new Date(meeting.created_at).toLocaleDateString('hu-HU') : 'N/A'}

Főbb témák:
${meeting.agenda?.map((item: string) => `• ${item}`).join('\n') || '• TBD'}

Nyitott kérdések:
${meeting.open_questions?.map((q: string) => `• ${q}`).join('\n') || '• Nincs'}

Kérjük tekintse át az előző meeting jegyzőkönyvét.`
  }
  
  // Notification generators
  
  private generateSlackSummary(meeting: any): string {
    const emoji = meeting.effectiveness_score > 80 ? '✅' : meeting.effectiveness_score > 60 ? '📊' : '⚠️'
    
    return `${emoji} *${meeting.title}* meeting összefoglaló

📝 *Összefoglaló:* ${meeting.summary?.substring(0, 200) || 'N/A'}...

📌 *Akció elemek:* ${meeting.action_items?.length || 0} db
${meeting.action_items?.slice(0, 3).map((item: any) => 
  `• ${item.task} (@${item.assignee})`
).join('\n') || ''}

📈 *Meeting hatékonyság:* ${meeting.effectiveness_score || 'N/A'}%

🔗 <${meeting.link}|Teljes jegyzőkönyv>`
  }
  
  private generateActionItemsNotification(actionItems: any[]): string {
    const highPriority = actionItems.filter(i => i.priority === 'high').length
    const total = actionItems.length
    
    return `📋 **Új akció elemek** - ${total} db ${highPriority > 0 ? `(${highPriority} magas prioritású!)` : ''}

${actionItems.map(item => {
  const priorityEmoji = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢'
  return `${priorityEmoji} **${item.task}**
   👤 ${item.assignee}
   📅 ${item.deadline ? new Date(item.deadline).toLocaleDateString('hu-HU') : 'Nincs határidő'}`
}).join('\n\n')}

_Használd a HangJegyzet-et a státusz frissítéshez_`
  }
  
  private generateWeeklyProgressTemplate(meeting: any): string {
    return `📊 *Heti előrehaladás - ${meeting.title}*

Itt az ideje frissíteni az akció elemek státuszát!

Nyitott elemek: ${meeting.action_items?.filter((i: any) => !i.completed).length || 0}
Befejezett: ${meeting.action_items?.filter((i: any) => i.completed).length || 0}

Kérjük frissítse a státuszokat a HangJegyzet rendszerben.

/hangjegyzet status ${meeting.id}`
  }
  
  // Helper methods
  
  private calculateOptimalFollowUpDate(meeting: any): Date {
    const baseDate = new Date()
    
    // Default to 1 week later
    baseDate.setDate(baseDate.getDate() + 7)
    
    // Adjust based on action item deadlines
    if (meeting.action_items?.length > 0) {
      const earliestDeadline = meeting.action_items
        .filter((i: any) => i.deadline)
        .map((i: any) => new Date(i.deadline).getTime())
        .sort()[0]
      
      if (earliestDeadline) {
        const deadlineDate = new Date(earliestDeadline)
        // Schedule follow-up 1 day after earliest deadline
        baseDate.setTime(deadlineDate.getTime() + 24 * 60 * 60 * 1000)
      }
    }
    
    // Ensure it's a weekday
    while (baseDate.getDay() === 0 || baseDate.getDay() === 6) {
      baseDate.setDate(baseDate.getDate() + 1)
    }
    
    // Set to 10 AM
    baseDate.setHours(10, 0, 0, 0)
    
    return baseDate
  }
  
  private async triggerBlockerAutomation(item: ActionItemProgress): Promise<void> {
    // In a real implementation, this would trigger actual automations
    console.log(`Triggering blocker automation for item ${item.itemId}`)
    
    trackMetric('ai.automation_triggered', 1, {
      type: 'blocker',
      item_id: item.itemId
    })
  }
}

// Export singleton instance
export const intelligentFollowUp = new IntelligentFollowUp()