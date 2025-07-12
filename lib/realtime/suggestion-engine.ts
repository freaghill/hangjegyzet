import { EventEmitter } from 'events'

interface TranscriptSegment {
  id: string
  speaker: string
  text: string
  startTime: number
  endTime: number
  confidence: number
}

interface MeetingContext {
  meetingType: 'sales' | 'team' | 'review' | 'planning' | 'general'
  currentTopic: string
  participants: string[]
  duration: number
  phase: 'opening' | 'discussion' | 'closing' | 'action-items'
}

interface Suggestion {
  id: string
  type: 'question' | 'transition' | 'closing' | 'time' | 'follow-up' | 'action' | 'clarification'
  priority: 'low' | 'medium' | 'high'
  title: string
  content: string
  context: string
  targetSpeaker?: string
  timing: 'immediate' | 'next-pause' | 'end-of-topic'
  expiresAt?: number
  confidence: number
}

interface TopicAnalysis {
  currentTopic: string
  topicStartTime: number
  topicDepth: number // How deeply the topic has been explored
  relatedTopics: string[]
  unresolvedQuestions: string[]
}

interface ActionItem {
  id: string
  description: string
  assignee?: string
  deadline?: string
  status: 'proposed' | 'confirmed' | 'unclear'
  needsClarification: boolean
  suggestedQuestions: string[]
}

export class SuggestionEngine extends EventEmitter {
  private segments: TranscriptSegment[] = []
  private suggestions: Suggestion[] = []
  private context: MeetingContext
  private topicHistory: Map<string, TopicAnalysis> = new Map()
  private currentTopic: TopicAnalysis | null = null
  private actionItems: ActionItem[] = []
  private unansweredQuestions: Map<string, { question: string; askedBy: string; timestamp: number }> = new Map()
  private speakerPatterns: Map<string, { avgTurnLength: number; questionFrequency: number }> = new Map()
  
  // Sales-specific patterns
  private salesPatterns = {
    objections: ['expensive', 'cost', 'budget', 'drága', 'költség', 'ár'],
    buyingSignals: ['interested', 'érdekel', 'mikor', 'when', 'how much', 'mennyi'],
    closingOpportunities: ['think about it', 'gondolkod', 'consider', 'fontolgat']
  }
  
  // Question templates
  private questionTemplates = {
    clarification: [
      'Could you elaborate on {topic}?',
      'What specifically do you mean by {term}?',
      'Tudnál bővebben mesélni a {topic} témáról?',
      'Pontosan mire gondolsz, amikor azt mondod hogy {term}?'
    ],
    exploration: [
      'How does this impact {aspect}?',
      'What are the implications for {area}?',
      'Hogyan befolyásolja ez a {aspect}?',
      'Milyen következményei vannak ennek a {area} szempontjából?'
    ],
    decision: [
      'What are the next steps regarding {topic}?',
      'Who will be responsible for {action}?',
      'Mik a következő lépések a {topic} kapcsán?',
      'Ki lesz felelős a {action} megvalósításáért?'
    ],
    sales: [
      'What would need to happen for you to move forward?',
      'What concerns do you have about the proposal?',
      'Mi kellene ahhoz, hogy előre tudjunk lépni?',
      'Milyen aggályaid vannak a javaslattal kapcsolatban?'
    ]
  }
  
  // Transition phrases
  private transitionPhrases = {
    topic_change: [
      'Let\'s move on to discuss {next_topic}',
      'Térjünk át a {next_topic} témára',
      'Now that we\'ve covered {current_topic}, shall we talk about {next_topic}?',
      'Most hogy megbeszéltük a {current_topic} kérdést, beszéljünk a {next_topic} témáról'
    ],
    summary: [
      'To summarize what we\'ve discussed about {topic}...',
      'Összefoglalva, amit a {topic} kapcsán megbeszéltünk...',
      'Let me recap the key points about {topic}',
      'Hadd foglaljam össze a {topic} főbb pontjait'
    ],
    closing: [
      'Before we wrap up, let\'s confirm the action items',
      'Mielőtt lezárnánk, erősítsük meg a teendőket',
      'Let\'s review what we\'ve agreed on today',
      'Nézzük át, miben állapodtunk meg a mai napon'
    ]
  }
  
  constructor(meetingType: MeetingContext['meetingType'] = 'general') {
    super()
    this.context = {
      meetingType,
      currentTopic: '',
      participants: [],
      duration: 0,
      phase: 'opening'
    }
    this.startSuggestionGeneration()
  }
  
  public processSegment(segment: TranscriptSegment): void {
    this.segments.push(segment)
    this.updateContext(segment)
    
    // Analyze current discussion
    this.analyzeDiscussion(segment)
    
    // Track questions and answers
    this.trackQuestions(segment)
    
    // Identify action items
    this.identifyActionItems(segment)
    
    // Generate contextual suggestions
    this.generateSuggestions(segment)
    
    // Update speaker patterns
    this.updateSpeakerPatterns(segment)
    
    // Check for sales opportunities (if sales meeting)
    if (this.context.meetingType === 'sales') {
      this.analyzeSalesOpportunities(segment)
    }
    
    // Maintain segment buffer
    if (this.segments.length > 1000) {
      this.segments = this.segments.slice(-500)
    }
  }
  
  private updateContext(segment: TranscriptSegment): void {
    // Update participants
    if (!this.context.participants.includes(segment.speaker)) {
      this.context.participants.push(segment.speaker)
    }
    
    // Update duration
    this.context.duration = segment.endTime - (this.segments[0]?.startTime || segment.startTime)
    
    // Detect meeting phase
    this.detectMeetingPhase()
    
    // Update current topic
    const topic = this.detectTopic(segment.text)
    if (topic && topic !== this.context.currentTopic) {
      this.handleTopicChange(topic)
    }
  }
  
  private detectMeetingPhase(): void {
    const duration = this.context.duration
    const totalSegments = this.segments.length
    
    if (duration < 300000) { // First 5 minutes
      this.context.phase = 'opening'
    } else if (this.detectClosingSignals()) {
      this.context.phase = 'closing'
    } else if (this.detectActionItemDiscussion()) {
      this.context.phase = 'action-items'
    } else {
      this.context.phase = 'discussion'
    }
  }
  
  private detectClosingSignals(): boolean {
    const recentSegments = this.segments.slice(-20)
    const closingKeywords = [
      'wrap up', 'conclude', 'summary', 'összefoglal', 'lezár', 'befejez',
      'next meeting', 'következő találkozó', 'thank you', 'köszönöm'
    ]
    
    return recentSegments.some(seg => 
      closingKeywords.some(keyword => seg.text.toLowerCase().includes(keyword))
    )
  }
  
  private detectActionItemDiscussion(): boolean {
    const recentSegments = this.segments.slice(-10)
    const actionKeywords = [
      'action item', 'teendő', 'feladat', 'task', 'responsible', 'felelős',
      'deadline', 'határidő', 'will do', 'megcsinál', 'vállal'
    ]
    
    return recentSegments.some(seg => 
      actionKeywords.some(keyword => seg.text.toLowerCase().includes(keyword))
    )
  }
  
  private detectTopic(text: string): string {
    // Simple topic detection based on key nouns and phrases
    const words = text.toLowerCase().split(/\s+/)
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']
    
    const significantWords = words
      .filter(w => w.length > 3 && !stopWords.includes(w))
      .slice(0, 3)
    
    return significantWords.join(' ')
  }
  
  private handleTopicChange(newTopic: string): void {
    if (this.currentTopic) {
      // Store previous topic analysis
      this.topicHistory.set(this.context.currentTopic, this.currentTopic)
      
      // Generate transition suggestion
      this.generateTransitionSuggestion(this.context.currentTopic, newTopic)
    }
    
    this.context.currentTopic = newTopic
    this.currentTopic = {
      currentTopic: newTopic,
      topicStartTime: Date.now(),
      topicDepth: 0,
      relatedTopics: [],
      unresolvedQuestions: []
    }
  }
  
  private analyzeDiscussion(segment: TranscriptSegment): void {
    if (!this.currentTopic) return
    
    // Increase topic depth based on discussion length
    const topicDuration = Date.now() - this.currentTopic.topicStartTime
    this.currentTopic.topicDepth = Math.min(10, Math.floor(topicDuration / 60000))
    
    // Extract related topics
    const relatedTopics = this.extractRelatedTopics(segment.text)
    for (const topic of relatedTopics) {
      if (!this.currentTopic.relatedTopics.includes(topic)) {
        this.currentTopic.relatedTopics.push(topic)
      }
    }
  }
  
  private trackQuestions(segment: TranscriptSegment): void {
    const text = segment.text
    
    // Detect questions
    if (text.includes('?') || this.isQuestion(text)) {
      const questionId = `q-${Date.now()}-${segment.speaker}`
      this.unansweredQuestions.set(questionId, {
        question: text,
        askedBy: segment.speaker,
        timestamp: segment.startTime
      })
      
      // Generate follow-up suggestion after a delay
      setTimeout(() => {
        if (this.unansweredQuestions.has(questionId)) {
          this.generateFollowUpSuggestion(questionId)
        }
      }, 30000) // 30 seconds
    }
    
    // Check if segment answers previous questions
    for (const [id, question] of this.unansweredQuestions.entries()) {
      if (this.isAnswer(segment.text, question.question)) {
        this.unansweredQuestions.delete(id)
      }
    }
  }
  
  private isQuestion(text: string): boolean {
    const questionWords = {
      english: ['what', 'when', 'where', 'why', 'how', 'who', 'which', 'could', 'would', 'should'],
      hungarian: ['mi', 'mikor', 'hol', 'miért', 'hogyan', 'ki', 'melyik', 'tudnál', 'lehet']
    }
    
    const lowerText = text.toLowerCase()
    return [...questionWords.english, ...questionWords.hungarian].some(word => 
      lowerText.startsWith(word) || lowerText.includes(` ${word} `)
    )
  }
  
  private isAnswer(text: string, question: string): boolean {
    // Simple heuristic: check if the answer references key words from the question
    const questionWords = question.toLowerCase().split(/\s+/)
      .filter(w => w.length > 3)
    
    const answerWords = text.toLowerCase().split(/\s+/)
    
    const overlap = questionWords.filter(w => answerWords.includes(w)).length
    return overlap >= Math.min(2, questionWords.length * 0.3)
  }
  
  private identifyActionItems(segment: TranscriptSegment): void {
    const actionPatterns = [
      /(?:I|we|you) will (\w+.+)/i,
      /(?:én|mi|te) (?:fog|fogok|fogsz|fogunk) (\w+.+)/i,
      /action item:? (.+)/i,
      /teendő:? (.+)/i,
      /responsible:? (\w+)/i,
      /felelős:? (\w+)/i
    ]
    
    for (const pattern of actionPatterns) {
      const match = segment.text.match(pattern)
      if (match) {
        const actionItem: ActionItem = {
          id: `action-${Date.now()}`,
          description: match[1] || match[0],
          assignee: segment.speaker,
          status: 'proposed',
          needsClarification: false,
          suggestedQuestions: []
        }
        
        // Check if action item needs clarification
        if (!this.hasDeadline(segment.text) || !this.hasSpecificAssignee(segment.text)) {
          actionItem.needsClarification = true
          actionItem.suggestedQuestions = this.generateActionItemQuestions(actionItem)
        }
        
        this.actionItems.push(actionItem)
        this.emit('action-item:detected', actionItem)
      }
    }
  }
  
  private hasDeadline(text: string): boolean {
    const deadlinePatterns = [
      /by (?:tomorrow|next week|monday|tuesday|wednesday|thursday|friday)/i,
      /határidő/i,
      /deadline/i,
      /\d{4}-\d{2}-\d{2}/,
      /\d{1,2}\/\d{1,2}/
    ]
    
    return deadlinePatterns.some(pattern => pattern.test(text))
  }
  
  private hasSpecificAssignee(text: string): boolean {
    // Check if text mentions specific person names (simplified check)
    const words = text.split(/\s+/)
    return words.some(word => 
      word.length > 2 && 
      word[0] === word[0].toUpperCase() &&
      !['I', 'We', 'You', 'The'].includes(word)
    )
  }
  
  private generateActionItemQuestions(actionItem: ActionItem): string[] {
    const questions = []
    
    if (!this.hasDeadline(actionItem.description)) {
      questions.push(
        'When should this be completed by?',
        'Mikorra kell ezt befejezni?'
      )
    }
    
    if (!actionItem.assignee || actionItem.assignee === 'unknown') {
      questions.push(
        'Who will be responsible for this?',
        'Ki lesz ezért felelős?'
      )
    }
    
    questions.push(
      'What are the success criteria for this task?',
      'Mik a siker kritériumai ennek a feladatnak?'
    )
    
    return questions
  }
  
  private updateSpeakerPatterns(segment: TranscriptSegment): void {
    let pattern = this.speakerPatterns.get(segment.speaker)
    
    if (!pattern) {
      pattern = { avgTurnLength: 0, questionFrequency: 0 }
      this.speakerPatterns.set(segment.speaker, pattern)
    }
    
    // Update average turn length
    const turnLength = segment.endTime - segment.startTime
    pattern.avgTurnLength = (pattern.avgTurnLength + turnLength) / 2
    
    // Update question frequency
    if (this.isQuestion(segment.text)) {
      pattern.questionFrequency++
    }
  }
  
  private analyzeSalesOpportunities(segment: TranscriptSegment): void {
    const text = segment.text.toLowerCase()
    
    // Check for objections
    for (const objection of this.salesPatterns.objections) {
      if (text.includes(objection)) {
        this.generateSuggestion({
          type: 'closing',
          priority: 'high',
          title: 'Objection detected',
          content: 'Consider addressing the cost concern by emphasizing value and ROI',
          context: 'Price objection raised',
          timing: 'immediate',
          confidence: 0.8
        })
      }
    }
    
    // Check for buying signals
    for (const signal of this.salesPatterns.buyingSignals) {
      if (text.includes(signal)) {
        this.generateSuggestion({
          type: 'closing',
          priority: 'high',
          title: 'Buying signal detected',
          content: 'This is a good opportunity to move towards closing. Ask about timeline and decision process.',
          context: 'Customer showing interest',
          timing: 'next-pause',
          confidence: 0.9
        })
      }
    }
    
    // Check for closing opportunities
    for (const opportunity of this.salesPatterns.closingOpportunities) {
      if (text.includes(opportunity)) {
        this.generateSuggestion({
          type: 'closing',
          priority: 'medium',
          title: 'Closing opportunity',
          content: 'Suggest scheduling a follow-up meeting or ask for a commitment',
          context: 'Customer considering the proposal',
          timing: 'next-pause',
          confidence: 0.7
        })
      }
    }
  }
  
  private generateSuggestions(segment: TranscriptSegment): void {
    // Time management suggestions
    if (this.context.duration > 2700000 && this.context.phase !== 'closing') { // 45 minutes
      this.generateSuggestion({
        type: 'time',
        priority: 'medium',
        title: 'Meeting duration alert',
        content: 'Consider wrapping up or scheduling a follow-up meeting',
        context: 'Meeting has been running for over 45 minutes',
        timing: 'next-pause',
        confidence: 0.8
      })
    }
    
    // Topic depth suggestions
    if (this.currentTopic && this.currentTopic.topicDepth < 3 && 
        Date.now() - this.currentTopic.topicStartTime > 300000) { // 5 minutes on shallow topic
      this.generateSuggestion({
        type: 'question',
        priority: 'medium',
        title: 'Explore topic deeper',
        content: this.generateExplorationQuestion(this.context.currentTopic),
        context: 'Current topic hasn\'t been explored in depth',
        timing: 'next-pause',
        confidence: 0.7
      })
    }
    
    // Action item clarification
    if (this.context.phase === 'action-items' && this.actionItems.some(ai => ai.needsClarification)) {
      const unclearItems = this.actionItems.filter(ai => ai.needsClarification)
      for (const item of unclearItems) {
        this.generateSuggestion({
          type: 'clarification',
          priority: 'high',
          title: 'Clarify action item',
          content: item.suggestedQuestions[0] || 'Please clarify the specifics of this action item',
          context: `Action item needs clarification: ${item.description}`,
          timing: 'immediate',
          confidence: 0.9
        })
      }
    }
  }
  
  private generateExplorationQuestion(topic: string): string {
    const templates = this.questionTemplates.exploration
    const template = templates[Math.floor(Math.random() * templates.length)]
    
    const aspects = ['budget', 'timeline', 'resources', 'impact', 'risks']
    const aspect = aspects[Math.floor(Math.random() * aspects.length)]
    
    return template.replace('{topic}', topic).replace('{aspect}', aspect).replace('{area}', aspect)
  }
  
  private generateTransitionSuggestion(currentTopic: string, nextTopic: string): void {
    const templates = this.transitionPhrases.topic_change
    const template = templates[Math.floor(Math.random() * templates.length)]
    
    const content = template
      .replace('{current_topic}', currentTopic)
      .replace('{next_topic}', nextTopic)
    
    this.generateSuggestion({
      type: 'transition',
      priority: 'low',
      title: 'Topic transition',
      content,
      context: 'Natural transition point between topics',
      timing: 'immediate',
      confidence: 0.6
    })
  }
  
  private generateFollowUpSuggestion(questionId: string): void {
    const question = this.unansweredQuestions.get(questionId)
    if (!question) return
    
    this.generateSuggestion({
      type: 'follow-up',
      priority: 'medium',
      title: 'Unanswered question',
      content: `Consider addressing the question: "${question.question}"`,
      context: `Question asked by ${question.askedBy} hasn't been answered`,
      targetSpeaker: question.askedBy,
      timing: 'next-pause',
      confidence: 0.8
    })
  }
  
  private generateSuggestion(suggestion: Omit<Suggestion, 'id'>): void {
    const newSuggestion: Suggestion = {
      ...suggestion,
      id: `sug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      expiresAt: Date.now() + 300000 // 5 minute expiry
    }
    
    // Avoid duplicate suggestions
    const isDuplicate = this.suggestions.some(s => 
      s.type === newSuggestion.type &&
      s.content === newSuggestion.content &&
      Date.now() - (s.expiresAt || 0) < 0
    )
    
    if (!isDuplicate) {
      this.suggestions.push(newSuggestion)
      this.emit('suggestion:new', newSuggestion)
    }
    
    // Clean up old suggestions
    this.cleanupSuggestions()
  }
  
  private cleanupSuggestions(): void {
    const now = Date.now()
    this.suggestions = this.suggestions.filter(s => 
      !s.expiresAt || s.expiresAt > now
    )
    
    // Keep max 20 suggestions
    if (this.suggestions.length > 20) {
      this.suggestions = this.suggestions.slice(-20)
    }
  }
  
  private startSuggestionGeneration(): void {
    // Periodic suggestion review
    setInterval(() => {
      this.reviewAndGenerateSuggestions()
    }, 30000) // Every 30 seconds
    
    // Clean up expired suggestions
    setInterval(() => {
      this.cleanupSuggestions()
    }, 60000) // Every minute
  }
  
  private reviewAndGenerateSuggestions(): void {
    // Check if meeting is running long without breaks
    if (this.context.duration > 3600000) { // 1 hour
      this.generateSuggestion({
        type: 'time',
        priority: 'high',
        title: 'Long meeting alert',
        content: 'Consider taking a break or scheduling a follow-up meeting',
        context: 'Meeting has exceeded 1 hour',
        timing: 'immediate',
        confidence: 0.9
      })
    }
    
    // Check for closing phase suggestions
    if (this.context.phase === 'closing' && this.actionItems.length > 0) {
      this.generateSuggestion({
        type: 'action',
        priority: 'high',
        title: 'Review action items',
        content: 'Now is a good time to review and confirm all action items',
        context: 'Meeting is in closing phase',
        timing: 'immediate',
        confidence: 0.9
      })
    }
  }
  
  private extractRelatedTopics(text: string): string[] {
    // Simple extraction of noun phrases that might be related topics
    const nounPhrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || []
    return nounPhrases.filter(phrase => phrase.length > 3)
  }
  
  public getSuggestions(type?: Suggestion['type']): Suggestion[] {
    let suggestions = this.suggestions
    
    if (type) {
      suggestions = suggestions.filter(s => s.type === type)
    }
    
    return suggestions
      .filter(s => !s.expiresAt || s.expiresAt > Date.now())
      .sort((a, b) => {
        // Sort by priority and timing
        const priorityWeight = { high: 3, medium: 2, low: 1 }
        const timingWeight = { immediate: 3, 'next-pause': 2, 'end-of-topic': 1 }
        
        const aScore = priorityWeight[a.priority] * 10 + timingWeight[a.timing]
        const bScore = priorityWeight[b.priority] * 10 + timingWeight[b.timing]
        
        return bScore - aScore
      })
  }
  
  public getActionItems(): ActionItem[] {
    return this.actionItems
  }
  
  public getUnansweredQuestions(): Array<{id: string; question: string; askedBy: string; timestamp: number}> {
    return Array.from(this.unansweredQuestions.entries()).map(([id, data]) => ({
      id,
      ...data
    }))
  }
  
  public getContext(): MeetingContext {
    return { ...this.context }
  }
  
  public confirmActionItem(actionId: string): void {
    const item = this.actionItems.find(ai => ai.id === actionId)
    if (item) {
      item.status = 'confirmed'
      item.needsClarification = false
      this.emit('action-item:confirmed', item)
    }
  }
  
  public dismissSuggestion(suggestionId: string): void {
    this.suggestions = this.suggestions.filter(s => s.id !== suggestionId)
    this.emit('suggestion:dismissed', suggestionId)
  }
  
  public reset(): void {
    this.segments = []
    this.suggestions = []
    this.topicHistory.clear()
    this.currentTopic = null
    this.actionItems = []
    this.unansweredQuestions.clear()
    this.speakerPatterns.clear()
    this.context = {
      meetingType: this.context.meetingType,
      currentTopic: '',
      participants: [],
      duration: 0,
      phase: 'opening'
    }
  }
  
  public destroy(): void {
    this.reset()
    this.removeAllListeners()
  }
}

// Export singleton instance
let suggestionEngine: SuggestionEngine | null = null

export function getSuggestionEngine(meetingType?: MeetingContext['meetingType']): SuggestionEngine {
  if (!suggestionEngine) {
    suggestionEngine = new SuggestionEngine(meetingType)
  }
  return suggestionEngine
}