import { EventEmitter } from 'events'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

interface AlertRule {
  id: string
  organizationId: string
  name: string
  description: string
  type: 'keyword' | 'pattern' | 'sentiment' | 'engagement' | 'custom'
  trigger: {
    keywords?: string[]
    patterns?: RegExp[]
    condition?: string
    threshold?: number
  }
  priority: 'low' | 'medium' | 'high' | 'critical'
  isActive: boolean
  metadata?: Record<string, any>
}

interface Alert {
  id: string
  meetingId: string
  ruleId: string
  priority: AlertRule['priority']
  type: string
  message: string
  context: {
    text?: string
    speaker?: string
    timestamp: number
    matchedKeywords?: string[]
    value?: number
  }
  isAcknowledged: boolean
  createdAt: number
}

interface ComplianceKeywords {
  legal: string[]
  financial: string[]
  hr: string[]
  gdpr: string[]
}

interface AlertQueueItem {
  alert: Alert
  retryCount: number
  nextRetry?: number
}

export class AlertEngine extends EventEmitter {
  private supabase: SupabaseClient
  private rules: Map<string, AlertRule> = new Map()
  private alertQueue: AlertQueueItem[] = []
  private processingQueue: boolean = false
  private unansweredQuestions: Map<string, { question: string; speaker: string; timestamp: number }> = new Map()
  
  // Default compliance keywords for Hungarian and English
  private complianceKeywords: ComplianceKeywords = {
    legal: [
      'szerződés', 'jogszabály', 'törvény', 'bíróság', 'per', 'jogi',
      'contract', 'legal', 'law', 'court', 'lawsuit', 'compliance'
    ],
    financial: [
      'adó', 'számla', 'áfa', 'nav', 'könyvelés', 'audit',
      'tax', 'invoice', 'vat', 'accounting', 'financial', 'budget'
    ],
    hr: [
      'felmondás', 'elbocsátás', 'fizetés', 'szabadság', 'munkaszerződés',
      'termination', 'dismissal', 'salary', 'vacation', 'employment'
    ],
    gdpr: [
      'gdpr', 'adatvédelem', 'személyes adat', 'hozzájárulás', 'adatkezelés',
      'data protection', 'personal data', 'consent', 'data processing'
    ]
  }
  
  // Budget and pricing patterns
  private budgetPatterns = [
    /(?:ár|költség|budget|price|cost).*?(\d+\.?\d*)\s*(?:millió|ezer|Ft|EUR|USD|forint)/gi,
    /(\d+\.?\d*)\s*(?:millió|ezer|M|k)\s*(?:Ft|HUF|EUR|USD|forint)/gi,
    /(?:költségvetés|budget).*?(?:kb\.?|körülbelül|approximately|about)?\s*(\d+)/gi
  ]
  
  // Commitment patterns
  private commitmentPatterns = [
    /(?:megígérem|ígérem|garantálom|vállalom|biztosítom)/gi,
    /(?:I promise|we will|I guarantee|we guarantee|I commit|we commit)/gi,
    /(?:biztos(?:an)?|definitely|certainly|for sure)/gi,
    /(?:meg fog(?:juk|om)|will definitely|will certainly)/gi
  ]
  
  constructor() {
    super()
    
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
    
    this.startQueueProcessor()
    this.loadDefaultRules()
  }
  
  // Load organization-specific rules
  public async loadOrganizationRules(organizationId: string): Promise<void> {
    try {
      const { data: customRules, error } = await this.supabase
        .from('alert_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
      
      if (error) throw error
      
      // Convert database rules to AlertRule format
      for (const rule of customRules || []) {
        const alertRule: AlertRule = {
          id: rule.id,
          organizationId: rule.organization_id,
          name: rule.name,
          description: rule.description,
          type: rule.type,
          trigger: rule.trigger,
          priority: rule.priority,
          isActive: rule.is_active,
          metadata: rule.metadata
        }
        
        // Compile regex patterns if needed
        if (alertRule.trigger.patterns) {
          alertRule.trigger.patterns = alertRule.trigger.patterns.map(p => new RegExp(p, 'gi'))
        }
        
        this.rules.set(alertRule.id, alertRule)
      }
      
      this.emit('rules:loaded', { organizationId, count: customRules?.length || 0 })
    } catch (error) {
      this.emit('error', { type: 'load_rules', error })
    }
  }
  
  // Load default system rules
  private loadDefaultRules(): void {
    // Compliance alert rules
    const complianceRule: AlertRule = {
      id: 'system-compliance',
      organizationId: 'system',
      name: 'Compliance Keywords Detection',
      description: 'Detects legal, financial, HR, and GDPR-related keywords',
      type: 'keyword',
      trigger: {
        keywords: Object.values(this.complianceKeywords).flat()
      },
      priority: 'high',
      isActive: true
    }
    
    // Budget mention rule
    const budgetRule: AlertRule = {
      id: 'system-budget',
      organizationId: 'system',
      name: 'Budget and Pricing Mentions',
      description: 'Tracks mentions of prices, costs, and budgets',
      type: 'pattern',
      trigger: {
        patterns: this.budgetPatterns
      },
      priority: 'medium',
      isActive: true
    }
    
    // Commitment detection rule
    const commitmentRule: AlertRule = {
      id: 'system-commitment',
      organizationId: 'system',
      name: 'Commitment Detection',
      description: 'Detects promises and commitments made during meetings',
      type: 'pattern',
      trigger: {
        patterns: this.commitmentPatterns
      },
      priority: 'high',
      isActive: true
    }
    
    // Negative sentiment rule
    const sentimentRule: AlertRule = {
      id: 'system-sentiment',
      organizationId: 'system',
      name: 'Negative Sentiment Alert',
      description: 'Alerts on sustained negative sentiment',
      type: 'sentiment',
      trigger: {
        condition: 'negative',
        threshold: 3 // 3 consecutive negative segments
      },
      priority: 'medium',
      isActive: true
    }
    
    // Low engagement rule
    const engagementRule: AlertRule = {
      id: 'system-engagement',
      organizationId: 'system',
      name: 'Low Engagement Alert',
      description: 'Alerts when participant engagement drops',
      type: 'engagement',
      trigger: {
        threshold: 30 // Below 30% engagement
      },
      priority: 'low',
      isActive: true
    }
    
    // Add default rules
    this.rules.set(complianceRule.id, complianceRule)
    this.rules.set(budgetRule.id, budgetRule)
    this.rules.set(commitmentRule.id, commitmentRule)
    this.rules.set(sentimentRule.id, sentimentRule)
    this.rules.set(engagementRule.id, engagementRule)
  }
  
  // Process transcript segment against all rules
  public async processSegment(
    meetingId: string,
    segment: {
      text: string
      speaker: string
      timestamp: number
      sentiment?: 'positive' | 'neutral' | 'negative'
    }
  ): Promise<void> {
    // Check for questions
    this.trackQuestions(segment)
    
    // Process each active rule
    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.isActive) continue
      
      try {
        const shouldTrigger = await this.evaluateRule(rule, segment)
        
        if (shouldTrigger) {
          const alert = this.createAlert(meetingId, rule, segment)
          await this.queueAlert(alert)
        }
      } catch (error) {
        this.emit('error', { type: 'process_rule', ruleId, error })
      }
    }
    
    // Check for unanswered questions
    this.checkUnansweredQuestions(meetingId)
  }
  
  // Evaluate if a rule should trigger
  private async evaluateRule(
    rule: AlertRule,
    segment: { text: string; speaker: string; timestamp: number; sentiment?: string }
  ): Promise<boolean> {
    switch (rule.type) {
      case 'keyword':
        return this.evaluateKeywordRule(rule, segment.text)
      
      case 'pattern':
        return this.evaluatePatternRule(rule, segment.text)
      
      case 'sentiment':
        return this.evaluateSentimentRule(rule, segment.sentiment)
      
      case 'custom':
        return this.evaluateCustomRule(rule, segment)
      
      default:
        return false
    }
  }
  
  // Evaluate keyword-based rules
  private evaluateKeywordRule(rule: AlertRule, text: string): boolean {
    if (!rule.trigger.keywords) return false
    
    const lowerText = text.toLowerCase()
    return rule.trigger.keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
  }
  
  // Evaluate pattern-based rules
  private evaluatePatternRule(rule: AlertRule, text: string): boolean {
    if (!rule.trigger.patterns) return false
    
    return rule.trigger.patterns.some(pattern => pattern.test(text))
  }
  
  // Evaluate sentiment-based rules
  private evaluateSentimentRule(rule: AlertRule, sentiment?: string): boolean {
    if (!sentiment || !rule.trigger.condition) return false
    
    return sentiment === rule.trigger.condition
  }
  
  // Evaluate custom rules
  private evaluateCustomRule(
    rule: AlertRule,
    segment: { text: string; speaker: string; timestamp: number }
  ): boolean {
    // Custom rules can have complex logic
    // This is a placeholder for organization-specific custom rules
    if (rule.metadata?.customFunction) {
      try {
        // In production, this would call a sandboxed function
        return false
      } catch {
        return false
      }
    }
    
    return false
  }
  
  // Create alert from triggered rule
  private createAlert(
    meetingId: string,
    rule: AlertRule,
    segment: { text: string; speaker: string; timestamp: number }
  ): Alert {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      meetingId,
      ruleId: rule.id,
      priority: rule.priority,
      type: rule.type,
      message: this.generateAlertMessage(rule, segment),
      context: {
        text: segment.text,
        speaker: segment.speaker,
        timestamp: segment.timestamp,
        matchedKeywords: this.extractMatchedKeywords(rule, segment.text)
      },
      isAcknowledged: false,
      createdAt: Date.now()
    }
    
    // Add specific context based on rule type
    if (rule.type === 'pattern' && rule.id === 'system-budget') {
      const matches = this.extractBudgetAmounts(segment.text)
      if (matches.length > 0) {
        alert.context.value = matches[0].amount
        alert.context.matchedKeywords = [matches[0].full]
      }
    }
    
    return alert
  }
  
  // Generate human-readable alert message
  private generateAlertMessage(
    rule: AlertRule,
    segment: { text: string; speaker: string }
  ): string {
    const speakerName = segment.speaker || 'Unknown speaker'
    
    switch (rule.id) {
      case 'system-compliance':
        const category = this.detectComplianceCategory(segment.text)
        return `${speakerName} mentioned ${category}-related terms`
      
      case 'system-budget':
        const amounts = this.extractBudgetAmounts(segment.text)
        if (amounts.length > 0) {
          return `${speakerName} mentioned budget/price: ${amounts[0].full}`
        }
        return `${speakerName} discussed budget or pricing`
      
      case 'system-commitment':
        return `${speakerName} made a commitment or promise`
      
      case 'system-sentiment':
        return `Negative sentiment detected from ${speakerName}`
      
      case 'system-engagement':
        return `Low engagement detected in the meeting`
      
      default:
        return `Alert triggered: ${rule.name}`
    }
  }
  
  // Extract matched keywords from text
  private extractMatchedKeywords(rule: AlertRule, text: string): string[] {
    const matches: string[] = []
    const lowerText = text.toLowerCase()
    
    if (rule.trigger.keywords) {
      for (const keyword of rule.trigger.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          matches.push(keyword)
        }
      }
    }
    
    if (rule.trigger.patterns) {
      for (const pattern of rule.trigger.patterns) {
        const patternMatches = text.match(pattern)
        if (patternMatches) {
          matches.push(...patternMatches)
        }
      }
    }
    
    return [...new Set(matches)] // Remove duplicates
  }
  
  // Detect compliance category
  private detectComplianceCategory(text: string): string {
    const lowerText = text.toLowerCase()
    
    for (const [category, keywords] of Object.entries(this.complianceKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category
      }
    }
    
    return 'compliance'
  }
  
  // Extract budget amounts from text
  private extractBudgetAmounts(text: string): { amount: number; currency?: string; full: string }[] {
    const amounts: { amount: number; currency?: string; full: string }[] = []
    
    for (const pattern of this.budgetPatterns) {
      const matches = Array.from(text.matchAll(pattern))
      
      for (const match of matches) {
        const numStr = match[1]
        let amount = parseFloat(numStr)
        
        // Convert based on context
        if (match[0].includes('millió') || match[0].includes('M')) {
          amount *= 1000000
        } else if (match[0].includes('ezer') || match[0].includes('k')) {
          amount *= 1000
        }
        
        // Detect currency
        let currency = 'HUF'
        if (match[0].includes('EUR')) currency = 'EUR'
        else if (match[0].includes('USD')) currency = 'USD'
        
        amounts.push({
          amount,
          currency,
          full: match[0]
        })
      }
    }
    
    return amounts
  }
  
  // Track questions in conversation
  private trackQuestions(segment: { text: string; speaker: string; timestamp: number }): void {
    if (segment.text.includes('?')) {
      const questionId = `q-${segment.timestamp}-${segment.speaker}`
      this.unansweredQuestions.set(questionId, {
        question: segment.text,
        speaker: segment.speaker,
        timestamp: segment.timestamp
      })
      
      // Remove old questions (older than 5 minutes)
      const cutoff = Date.now() - 300000
      for (const [id, question] of this.unansweredQuestions.entries()) {
        if (question.timestamp < cutoff) {
          this.unansweredQuestions.delete(id)
        }
      }
    }
  }
  
  // Check for unanswered questions
  private checkUnansweredQuestions(meetingId: string): void {
    const now = Date.now()
    
    for (const [id, question] of this.unansweredQuestions.entries()) {
      // If question is unanswered for more than 2 minutes
      if (now - question.timestamp > 120000) {
        const alert: Alert = {
          id: `alert-question-${id}`,
          meetingId,
          ruleId: 'system-unanswered-question',
          priority: 'low',
          type: 'question',
          message: `Unanswered question from ${question.speaker}`,
          context: {
            text: question.question,
            speaker: question.speaker,
            timestamp: question.timestamp
          },
          isAcknowledged: false,
          createdAt: now
        }
        
        this.queueAlert(alert)
        this.unansweredQuestions.delete(id)
      }
    }
  }
  
  // Queue alert for processing
  private async queueAlert(alert: Alert): Promise<void> {
    // Check if similar alert already exists
    const isDuplicate = this.alertQueue.some(item => 
      item.alert.ruleId === alert.ruleId &&
      item.alert.context.speaker === alert.context.speaker &&
      Math.abs(item.alert.context.timestamp - alert.context.timestamp) < 5000
    )
    
    if (!isDuplicate) {
      this.alertQueue.push({
        alert,
        retryCount: 0
      })
      
      // Sort by priority
      this.alertQueue.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.alert.priority] - priorityOrder[b.alert.priority]
      })
      
      this.emit('alert:queued', alert)
    }
  }
  
  // Process alert queue
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.processingQueue || this.alertQueue.length === 0) return
      
      this.processingQueue = true
      
      try {
        const item = this.alertQueue.shift()
        if (!item) return
        
        // Process alert
        await this.processAlert(item)
      } catch (error) {
        this.emit('error', { type: 'queue_processor', error })
      } finally {
        this.processingQueue = false
      }
    }, 1000) // Process every second
  }
  
  // Process individual alert
  private async processAlert(item: AlertQueueItem): Promise<void> {
    try {
      // Emit alert for real-time subscribers
      this.emit('alert:triggered', item.alert)
      
      // Store alert in database
      await this.persistAlert(item.alert)
      
      // Send notifications based on priority
      if (item.alert.priority === 'critical' || item.alert.priority === 'high') {
        await this.sendImmediateNotification(item.alert)
      }
    } catch (error) {
      item.retryCount++
      
      if (item.retryCount < 3) {
        // Retry with exponential backoff
        item.nextRetry = Date.now() + Math.pow(2, item.retryCount) * 1000
        this.alertQueue.push(item)
      } else {
        this.emit('error', { type: 'process_alert', alert: item.alert, error })
      }
    }
  }
  
  // Persist alert to database
  private async persistAlert(alert: Alert): Promise<void> {
    const { error } = await this.supabase
      .from('meeting_alerts')
      .insert({
        id: alert.id,
        meeting_id: alert.meetingId,
        rule_id: alert.ruleId,
        priority: alert.priority,
        type: alert.type,
        message: alert.message,
        context: alert.context,
        is_acknowledged: alert.isAcknowledged,
        created_at: new Date(alert.createdAt).toISOString()
      })
    
    if (error) throw error
  }
  
  // Send immediate notification for high-priority alerts
  private async sendImmediateNotification(alert: Alert): Promise<void> {
    // This would integrate with notification services
    // For now, just emit an event
    this.emit('notification:send', {
      type: 'immediate',
      alert,
      channels: ['email', 'slack', 'teams']
    })
  }
  
  // Create custom rule for organization
  public async createCustomRule(
    organizationId: string,
    rule: Omit<AlertRule, 'id' | 'organizationId'>
  ): Promise<AlertRule> {
    const newRule: AlertRule = {
      ...rule,
      id: `custom-${organizationId}-${Date.now()}`,
      organizationId
    }
    
    // Store in database
    const { error } = await this.supabase
      .from('alert_rules')
      .insert({
        id: newRule.id,
        organization_id: newRule.organizationId,
        name: newRule.name,
        description: newRule.description,
        type: newRule.type,
        trigger: newRule.trigger,
        priority: newRule.priority,
        is_active: newRule.isActive,
        metadata: newRule.metadata
      })
    
    if (error) throw error
    
    this.rules.set(newRule.id, newRule)
    return newRule
  }
  
  // Update existing rule
  public async updateRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    const rule = this.rules.get(ruleId)
    if (!rule) throw new Error('Rule not found')
    
    const updatedRule = { ...rule, ...updates }
    
    // Update in database
    const { error } = await this.supabase
      .from('alert_rules')
      .update({
        name: updatedRule.name,
        description: updatedRule.description,
        trigger: updatedRule.trigger,
        priority: updatedRule.priority,
        is_active: updatedRule.isActive,
        metadata: updatedRule.metadata
      })
      .eq('id', ruleId)
    
    if (error) throw error
    
    this.rules.set(ruleId, updatedRule)
  }
  
  // Delete rule
  public async deleteRule(ruleId: string): Promise<void> {
    const { error } = await this.supabase
      .from('alert_rules')
      .delete()
      .eq('id', ruleId)
    
    if (error) throw error
    
    this.rules.delete(ruleId)
  }
  
  // Get all rules for organization
  public getRules(organizationId?: string): AlertRule[] {
    if (organizationId) {
      return Array.from(this.rules.values()).filter(r => 
        r.organizationId === organizationId || r.organizationId === 'system'
      )
    }
    return Array.from(this.rules.values())
  }
  
  // Get alerts for meeting
  public async getMeetingAlerts(meetingId: string): Promise<Alert[]> {
    const { data, error } = await this.supabase
      .from('meeting_alerts')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return data.map(row => ({
      id: row.id,
      meetingId: row.meeting_id,
      ruleId: row.rule_id,
      priority: row.priority,
      type: row.type,
      message: row.message,
      context: row.context,
      isAcknowledged: row.is_acknowledged,
      createdAt: new Date(row.created_at).getTime()
    }))
  }
  
  // Acknowledge alert
  public async acknowledgeAlert(alertId: string): Promise<void> {
    const { error } = await this.supabase
      .from('meeting_alerts')
      .update({ is_acknowledged: true })
      .eq('id', alertId)
    
    if (error) throw error
    
    this.emit('alert:acknowledged', alertId)
  }
  
  // Clean up resources
  public destroy(): void {
    this.rules.clear()
    this.alertQueue = []
    this.unansweredQuestions.clear()
    this.removeAllListeners()
  }
}

// Export singleton instance
let alertEngine: AlertEngine | null = null

export function getAlertEngine(): AlertEngine {
  if (!alertEngine) {
    alertEngine = new AlertEngine()
  }
  return alertEngine
}