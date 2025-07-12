import { EventEmitter } from 'events'

interface TranscriptSegment {
  id: string
  meetingId: string
  speaker: string
  text: string
  startTime: number
  endTime: number
  confidence: number
}

interface Decision {
  id: string
  description: string
  type: 'strategic' | 'operational' | 'tactical' | 'financial' | 'personnel' | 'general'
  madeBy: string[]
  timestamp: number
  status: 'proposed' | 'discussed' | 'agreed' | 'deferred' | 'rejected'
  qualityScore: number // 0-100
  stakeholders: Stakeholder[]
  supportingArguments: string[]
  opposingArguments: string[]
  conditions: string[]
  relatedDecisions: string[]
  confidence: number
}

interface Stakeholder {
  name: string
  stance: 'support' | 'oppose' | 'neutral' | 'unknown'
  comments: string[]
  influence: 'high' | 'medium' | 'low'
}

interface DecisionQualityMetrics {
  hasRationale: boolean
  hasAlternatives: boolean
  hasRiskAssessment: boolean
  hasSuccessCriteria: boolean
  hasOwnership: boolean
  hasTimeline: boolean
  stakeholderAlignment: number // 0-100
  discussionDepth: number // 0-100
}

interface DecisionConflict {
  id: string
  decision1: Decision
  decision2: Decision
  conflictType: 'contradiction' | 'resource' | 'timeline' | 'priority'
  severity: 'low' | 'medium' | 'high'
  description: string
}

export class DecisionTracker extends EventEmitter {
  private segments: TranscriptSegment[] = []
  private decisions: Map<string, Decision> = new Map()
  private activeDiscussion: Decision | null = null
  private decisionConflicts: DecisionConflict[] = []
  private speakerInfluence: Map<string, number> = new Map()
  
  // Decision detection patterns
  private decisionPatterns = {
    proposal: [
      /(?:suggest|propose|recommend|javasl|ajánl)\s+(?:that\s+)?(.+)/i,
      /(?:we should|let's|kellene|csináljuk)\s+(.+)/i,
      /(?:my proposal is|javaslatom)\s+(.+)/i
    ],
    agreement: [
      /(?:agree|agreed|egyetért|megegyez|rendben)/i,
      /(?:sounds good|jó ötlet|támogat)/i,
      /(?:let's do it|csináljuk|mehet)/i,
      /(?:approved|jóváhagy|elfogad)/i
    ],
    disagreement: [
      /(?:disagree|don't agree|nem értek egyet)/i,
      /(?:concern|aggály|probléma)/i,
      /(?:but|however|de|azonban|viszont)/i,
      /(?:risk|kockázat)/i
    ],
    deferral: [
      /(?:let's revisit|think about|gondolkod|később)/i,
      /(?:need more|további|több információ)/i,
      /(?:postpone|elhalaszt|későbbre)/i
    ],
    condition: [
      /(?:if|only if|provided that|ha|amennyiben|feltéve)/i,
      /(?:assuming|depend|függ)/i,
      /(?:require|szükség|kell)/i
    ]
  }
  
  // Quality indicators
  private qualityIndicators = {
    rationale: ['because', 'mivel', 'reason', 'ok', 'due to', 'miatt'],
    alternatives: ['alternative', 'alternatíva', 'option', 'opció', 'instead', 'helyett'],
    risk: ['risk', 'kockázat', 'danger', 'veszély', 'concern', 'aggály'],
    success: ['success', 'siker', 'goal', 'cél', 'objective', 'célkitűzés'],
    ownership: ['responsible', 'felelős', 'owner', 'tulajdonos', 'lead', 'vezet'],
    timeline: ['deadline', 'határidő', 'by', 'until', 'amíg', 'timeline', 'időterv']
  }
  
  constructor() {
    super()
    this.startMonitoring()
  }
  
  public processSegment(segment: TranscriptSegment): void {
    this.segments.push(segment)
    
    // Update speaker influence based on participation
    this.updateSpeakerInfluence(segment)
    
    // Detect new decision proposals
    this.detectDecisionProposal(segment)
    
    // Track ongoing decision discussions
    if (this.activeDiscussion) {
      this.trackDecisionDiscussion(segment)
    }
    
    // Check for decision finalization
    this.checkDecisionFinalization(segment)
    
    // Detect decision conflicts
    this.detectDecisionConflicts()
    
    // Maintain buffer
    if (this.segments.length > 1000) {
      this.segments = this.segments.slice(-500)
    }
  }
  
  private updateSpeakerInfluence(segment: TranscriptSegment): void {
    const current = this.speakerInfluence.get(segment.speaker) || 0
    const wordCount = segment.text.split(/\s+/).length
    
    // Simple influence calculation based on participation
    this.speakerInfluence.set(segment.speaker, current + wordCount)
  }
  
  private detectDecisionProposal(segment: TranscriptSegment): void {
    for (const pattern of this.decisionPatterns.proposal) {
      const match = segment.text.match(pattern)
      if (match) {
        const proposalText = match[1] || match[0]
        
        // Check if this is a new proposal or relates to existing discussion
        if (!this.isRelatedToActiveDiscussion(proposalText)) {
          const decision: Decision = {
            id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description: proposalText.trim(),
            type: this.classifyDecisionType(proposalText),
            madeBy: [segment.speaker],
            timestamp: segment.startTime,
            status: 'proposed',
            qualityScore: 0,
            stakeholders: [{
              name: segment.speaker,
              stance: 'support',
              comments: [segment.text],
              influence: this.getSpeakerInfluenceLevel(segment.speaker)
            }],
            supportingArguments: [],
            opposingArguments: [],
            conditions: [],
            relatedDecisions: [],
            confidence: 0.8
          }
          
          this.decisions.set(decision.id, decision)
          this.activeDiscussion = decision
          this.emit('decision:proposed', decision)
          
          // Start quality assessment
          this.assessDecisionQuality(decision)
        }
        break
      }
    }
  }
  
  private trackDecisionDiscussion(segment: TranscriptSegment): void {
    if (!this.activeDiscussion) return
    
    const text = segment.text.toLowerCase()
    const speaker = segment.speaker
    
    // Find or create stakeholder
    let stakeholder = this.activeDiscussion.stakeholders.find(s => s.name === speaker)
    if (!stakeholder) {
      stakeholder = {
        name: speaker,
        stance: 'unknown',
        comments: [],
        influence: this.getSpeakerInfluenceLevel(speaker)
      }
      this.activeDiscussion.stakeholders.push(stakeholder)
    }
    
    stakeholder.comments.push(segment.text)
    
    // Detect agreement
    if (this.decisionPatterns.agreement.some(pattern => pattern.test(text))) {
      stakeholder.stance = 'support'
      if (!this.activeDiscussion.madeBy.includes(speaker)) {
        this.activeDiscussion.madeBy.push(speaker)
      }
      
      // Extract supporting arguments
      const argument = this.extractArgument(segment.text)
      if (argument) {
        this.activeDiscussion.supportingArguments.push(argument)
      }
    }
    
    // Detect disagreement
    if (this.decisionPatterns.disagreement.some(pattern => pattern.test(text))) {
      stakeholder.stance = 'oppose'
      
      // Extract opposing arguments
      const argument = this.extractArgument(segment.text)
      if (argument) {
        this.activeDiscussion.opposingArguments.push(argument)
      }
    }
    
    // Detect conditions
    if (this.decisionPatterns.condition.some(pattern => pattern.test(text))) {
      const condition = this.extractCondition(segment.text)
      if (condition) {
        this.activeDiscussion.conditions.push(condition)
      }
    }
    
    // Update quality assessment
    this.assessDecisionQuality(this.activeDiscussion)
    
    // Emit update
    this.emit('decision:updated', this.activeDiscussion)
  }
  
  private checkDecisionFinalization(segment: TranscriptSegment): void {
    if (!this.activeDiscussion) return
    
    const text = segment.text.toLowerCase()
    
    // Check for deferral
    if (this.decisionPatterns.deferral.some(pattern => pattern.test(text))) {
      this.activeDiscussion.status = 'deferred'
      this.finalizeDecision(this.activeDiscussion)
      return
    }
    
    // Check for explicit agreement/finalization
    const hasExplicitAgreement = text.includes('decided') || text.includes('döntöttünk') ||
                                 text.includes('final decision') || text.includes('végleges döntés')
    
    if (hasExplicitAgreement) {
      this.activeDiscussion.status = 'agreed'
      this.finalizeDecision(this.activeDiscussion)
      return
    }
    
    // Check for implicit finalization (topic change with consensus)
    const stakeholderAlignment = this.calculateStakeholderAlignment(this.activeDiscussion)
    if (stakeholderAlignment > 80 && this.detectTopicChange(segment)) {
      this.activeDiscussion.status = 'agreed'
      this.finalizeDecision(this.activeDiscussion)
    }
  }
  
  private finalizeDecision(decision: Decision): void {
    // Final quality assessment
    this.assessDecisionQuality(decision)
    
    // Calculate confidence based on discussion quality
    decision.confidence = this.calculateDecisionConfidence(decision)
    
    // Check for conflicts with existing decisions
    this.checkConflictsWithDecision(decision)
    
    // Emit finalization
    this.emit('decision:finalized', decision)
    
    // Clear active discussion
    this.activeDiscussion = null
    
    // Auto-document the decision
    this.documentDecision(decision)
  }
  
  private assessDecisionQuality(decision: Decision): void {
    const metrics: DecisionQualityMetrics = {
      hasRationale: this.hasQualityIndicator(decision, 'rationale'),
      hasAlternatives: this.hasQualityIndicator(decision, 'alternatives'),
      hasRiskAssessment: this.hasQualityIndicator(decision, 'risk'),
      hasSuccessCriteria: this.hasQualityIndicator(decision, 'success'),
      hasOwnership: decision.madeBy.length > 0,
      hasTimeline: this.hasQualityIndicator(decision, 'timeline'),
      stakeholderAlignment: this.calculateStakeholderAlignment(decision),
      discussionDepth: this.calculateDiscussionDepth(decision)
    }
    
    // Calculate overall quality score
    let score = 0
    if (metrics.hasRationale) score += 15
    if (metrics.hasAlternatives) score += 15
    if (metrics.hasRiskAssessment) score += 10
    if (metrics.hasSuccessCriteria) score += 10
    if (metrics.hasOwnership) score += 10
    if (metrics.hasTimeline) score += 10
    score += metrics.stakeholderAlignment * 0.15
    score += metrics.discussionDepth * 0.15
    
    decision.qualityScore = Math.min(100, Math.round(score))
    
    // Emit quality alerts
    if (decision.qualityScore < 50) {
      this.emit('decision:low-quality', {
        decision,
        metrics,
        suggestions: this.generateQualitySuggestions(metrics)
      })
    }
  }
  
  private hasQualityIndicator(decision: Decision, indicator: keyof typeof this.qualityIndicators): boolean {
    const keywords = this.qualityIndicators[indicator]
    const allComments = decision.stakeholders.flatMap(s => s.comments).join(' ').toLowerCase()
    
    return keywords.some(keyword => allComments.includes(keyword))
  }
  
  private calculateStakeholderAlignment(decision: Decision): number {
    if (decision.stakeholders.length === 0) return 0
    
    const supporters = decision.stakeholders.filter(s => s.stance === 'support').length
    const total = decision.stakeholders.filter(s => s.stance !== 'unknown').length
    
    if (total === 0) return 0
    
    // Weight by influence
    let weightedSupport = 0
    let totalWeight = 0
    
    for (const stakeholder of decision.stakeholders) {
      if (stakeholder.stance === 'unknown') continue
      
      const weight = stakeholder.influence === 'high' ? 3 : stakeholder.influence === 'medium' ? 2 : 1
      totalWeight += weight
      
      if (stakeholder.stance === 'support') {
        weightedSupport += weight
      }
    }
    
    return totalWeight > 0 ? (weightedSupport / totalWeight) * 100 : 0
  }
  
  private calculateDiscussionDepth(decision: Decision): number {
    const totalComments = decision.stakeholders.reduce((sum, s) => sum + s.comments.length, 0)
    const uniqueSpeakers = new Set(decision.stakeholders.map(s => s.name)).size
    const hasArguments = decision.supportingArguments.length + decision.opposingArguments.length > 0
    
    let depth = Math.min(50, totalComments * 5) // Up to 50 points for comment count
    depth += Math.min(30, uniqueSpeakers * 10) // Up to 30 points for diverse input
    depth += hasArguments ? 20 : 0 // 20 points for having arguments
    
    return Math.min(100, depth)
  }
  
  private calculateDecisionConfidence(decision: Decision): number {
    const qualityFactor = decision.qualityScore / 100
    const alignmentFactor = this.calculateStakeholderAlignment(decision) / 100
    const completeness = decision.status === 'agreed' ? 1 : 0.5
    
    return qualityFactor * 0.4 + alignmentFactor * 0.4 + completeness * 0.2
  }
  
  private detectDecisionConflicts(): void {
    const recentDecisions = Array.from(this.decisions.values())
      .filter(d => Date.now() - d.timestamp < 3600000) // Last hour
    
    for (let i = 0; i < recentDecisions.length; i++) {
      for (let j = i + 1; j < recentDecisions.length; j++) {
        const conflict = this.analyzeDecisionConflict(recentDecisions[i], recentDecisions[j])
        
        if (conflict) {
          this.decisionConflicts.push(conflict)
          this.emit('decision:conflict', conflict)
        }
      }
    }
  }
  
  private analyzeDecisionConflict(decision1: Decision, decision2: Decision): DecisionConflict | null {
    // Check for direct contradiction
    if (this.areDecisionsContradictory(decision1, decision2)) {
      return {
        id: `conflict-${Date.now()}`,
        decision1,
        decision2,
        conflictType: 'contradiction',
        severity: 'high',
        description: 'These decisions directly contradict each other'
      }
    }
    
    // Check for resource conflicts
    if (this.haveResourceConflict(decision1, decision2)) {
      return {
        id: `conflict-${Date.now()}`,
        decision1,
        decision2,
        conflictType: 'resource',
        severity: 'medium',
        description: 'These decisions may compete for the same resources'
      }
    }
    
    // Check for timeline conflicts
    if (this.haveTimelineConflict(decision1, decision2)) {
      return {
        id: `conflict-${Date.now()}`,
        decision1,
        decision2,
        conflictType: 'timeline',
        severity: 'medium',
        description: 'These decisions have conflicting timelines'
      }
    }
    
    return null
  }
  
  private checkConflictsWithDecision(newDecision: Decision): void {
    for (const [id, existingDecision] of this.decisions) {
      if (id === newDecision.id) continue
      
      const conflict = this.analyzeDecisionConflict(newDecision, existingDecision)
      if (conflict) {
        this.decisionConflicts.push(conflict)
        this.emit('decision:conflict', conflict)
        
        // Add reference to related decisions
        newDecision.relatedDecisions.push(existingDecision.id)
        existingDecision.relatedDecisions.push(newDecision.id)
      }
    }
  }
  
  private documentDecision(decision: Decision): void {
    const documentation = {
      decision: decision.description,
      status: decision.status,
      madeBy: decision.madeBy,
      date: new Date(decision.timestamp),
      qualityScore: decision.qualityScore,
      stakeholders: decision.stakeholders.map(s => ({
        name: s.name,
        stance: s.stance
      })),
      conditions: decision.conditions,
      supportingArguments: decision.supportingArguments,
      opposingArguments: decision.opposingArguments,
      relatedDecisions: decision.relatedDecisions
    }
    
    this.emit('decision:documented', documentation)
  }
  
  private classifyDecisionType(text: string): Decision['type'] {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('strategy') || lowerText.includes('stratégia') || 
        lowerText.includes('long term') || lowerText.includes('hosszú táv')) {
      return 'strategic'
    }
    
    if (lowerText.includes('budget') || lowerText.includes('költség') ||
        lowerText.includes('investment') || lowerText.includes('befektetés')) {
      return 'financial'
    }
    
    if (lowerText.includes('hire') || lowerText.includes('felvenni') ||
        lowerText.includes('team') || lowerText.includes('csapat')) {
      return 'personnel'
    }
    
    if (lowerText.includes('process') || lowerText.includes('folyamat') ||
        lowerText.includes('procedure') || lowerText.includes('eljárás')) {
      return 'operational'
    }
    
    if (lowerText.includes('implement') || lowerText.includes('megvalósít') ||
        lowerText.includes('execute') || lowerText.includes('végrehajt')) {
      return 'tactical'
    }
    
    return 'general'
  }
  
  private getSpeakerInfluenceLevel(speaker: string): Stakeholder['influence'] {
    const totalInfluence = Array.from(this.speakerInfluence.values()).reduce((a, b) => a + b, 0)
    const speakerValue = this.speakerInfluence.get(speaker) || 0
    const percentage = totalInfluence > 0 ? (speakerValue / totalInfluence) * 100 : 0
    
    if (percentage > 30) return 'high'
    if (percentage > 15) return 'medium'
    return 'low'
  }
  
  private isRelatedToActiveDiscussion(text: string): boolean {
    if (!this.activeDiscussion) return false
    
    const keywords = this.extractKeywords(this.activeDiscussion.description)
    const textKeywords = this.extractKeywords(text)
    
    const overlap = keywords.filter(k => textKeywords.includes(k)).length
    return overlap >= Math.min(2, keywords.length * 0.5)
  }
  
  private extractKeywords(text: string): string[] {
    return text.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !['that', 'this', 'with', 'from', 'have'].includes(w))
  }
  
  private extractArgument(text: string): string {
    // Extract the reasoning part of the statement
    const patterns = [
      /because\s+(.+)/i,
      /mivel\s+(.+)/i,
      /(?:the reason is|az ok)\s+(.+)/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return match[1].trim()
    }
    
    return text.trim()
  }
  
  private extractCondition(text: string): string {
    const patterns = [
      /if\s+(.+?)(?:then|,)/i,
      /ha\s+(.+?)(?:akkor|,)/i,
      /provided that\s+(.+)/i,
      /feltéve hogy\s+(.+)/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return match[1].trim()
    }
    
    return text.trim()
  }
  
  private detectTopicChange(segment: TranscriptSegment): boolean {
    const recentSegments = this.segments.slice(-5)
    const currentKeywords = this.extractKeywords(segment.text)
    
    let differentTopicCount = 0
    for (const recent of recentSegments) {
      const recentKeywords = this.extractKeywords(recent.text)
      const overlap = currentKeywords.filter(k => recentKeywords.includes(k)).length
      
      if (overlap < 2) differentTopicCount++
    }
    
    return differentTopicCount >= 3
  }
  
  private areDecisionsContradictory(d1: Decision, d2: Decision): boolean {
    const desc1 = d1.description.toLowerCase()
    const desc2 = d2.description.toLowerCase()
    
    // Check for opposite actions
    const opposites = [
      ['increase', 'decrease'], ['növel', 'csökkent'],
      ['start', 'stop'], ['kezd', 'befejez'],
      ['hire', 'fire'], ['felvesz', 'elbocsát'],
      ['expand', 'reduce'], ['bővít', 'csökkent']
    ]
    
    for (const [action1, action2] of opposites) {
      if ((desc1.includes(action1) && desc2.includes(action2)) ||
          (desc1.includes(action2) && desc2.includes(action1))) {
        return true
      }
    }
    
    return false
  }
  
  private haveResourceConflict(d1: Decision, d2: Decision): boolean {
    const resourceKeywords = ['budget', 'költségvetés', 'resource', 'erőforrás', 'team', 'csapat']
    
    const d1HasResource = resourceKeywords.some(k => d1.description.toLowerCase().includes(k))
    const d2HasResource = resourceKeywords.some(k => d2.description.toLowerCase().includes(k))
    
    return d1HasResource && d2HasResource && d1.type === d2.type
  }
  
  private haveTimelineConflict(d1: Decision, d2: Decision): boolean {
    // Simple check - in real implementation would parse actual dates
    const timeKeywords = ['immediate', 'azonnal', 'urgent', 'sürgős', 'same time', 'ugyanakkor']
    
    const d1Urgent = timeKeywords.some(k => d1.description.toLowerCase().includes(k))
    const d2Urgent = timeKeywords.some(k => d2.description.toLowerCase().includes(k))
    
    return d1Urgent && d2Urgent
  }
  
  private generateQualitySuggestions(metrics: DecisionQualityMetrics): string[] {
    const suggestions = []
    
    if (!metrics.hasRationale) {
      suggestions.push('Provide clear reasoning for this decision')
    }
    if (!metrics.hasAlternatives) {
      suggestions.push('Consider discussing alternative options')
    }
    if (!metrics.hasRiskAssessment) {
      suggestions.push('Assess potential risks and mitigation strategies')
    }
    if (!metrics.hasSuccessCriteria) {
      suggestions.push('Define success criteria for this decision')
    }
    if (!metrics.hasTimeline) {
      suggestions.push('Establish a timeline for implementation')
    }
    if (metrics.stakeholderAlignment < 70) {
      suggestions.push('Seek broader consensus among stakeholders')
    }
    
    return suggestions
  }
  
  private startMonitoring(): void {
    // Periodic quality review
    setInterval(() => {
      this.reviewDecisionQuality()
    }, 60000) // Every minute
    
    // Conflict resolution check
    setInterval(() => {
      this.checkUnresolvedConflicts()
    }, 120000) // Every 2 minutes
  }
  
  private reviewDecisionQuality(): void {
    const lowQualityDecisions = Array.from(this.decisions.values())
      .filter(d => d.qualityScore < 50 && d.status === 'proposed')
    
    for (const decision of lowQualityDecisions) {
      this.emit('decision:needs-improvement', {
        decision,
        suggestions: this.generateQualitySuggestions({
          hasRationale: this.hasQualityIndicator(decision, 'rationale'),
          hasAlternatives: this.hasQualityIndicator(decision, 'alternatives'),
          hasRiskAssessment: this.hasQualityIndicator(decision, 'risk'),
          hasSuccessCriteria: this.hasQualityIndicator(decision, 'success'),
          hasOwnership: decision.madeBy.length > 0,
          hasTimeline: this.hasQualityIndicator(decision, 'timeline'),
          stakeholderAlignment: this.calculateStakeholderAlignment(decision),
          discussionDepth: this.calculateDiscussionDepth(decision)
        })
      })
    }
  }
  
  private checkUnresolvedConflicts(): void {
    const unresolvedConflicts = this.decisionConflicts.filter(c => 
      c.severity === 'high' &&
      Date.now() - Math.max(c.decision1.timestamp, c.decision2.timestamp) > 300000 // 5 minutes old
    )
    
    for (const conflict of unresolvedConflicts) {
      this.emit('decision:unresolved-conflict', conflict)
    }
  }
  
  public getDecisions(status?: Decision['status']): Decision[] {
    let decisions = Array.from(this.decisions.values())
    
    if (status) {
      decisions = decisions.filter(d => d.status === status)
    }
    
    return decisions.sort((a, b) => b.timestamp - a.timestamp)
  }
  
  public getDecisionById(id: string): Decision | undefined {
    return this.decisions.get(id)
  }
  
  public getConflicts(): DecisionConflict[] {
    return this.decisionConflicts
  }
  
  public updateDecisionStatus(decisionId: string, status: Decision['status']): void {
    const decision = this.decisions.get(decisionId)
    if (decision) {
      decision.status = status
      this.emit('decision:status-changed', decision)
    }
  }
  
  public resolveConflict(conflictId: string): void {
    this.decisionConflicts = this.decisionConflicts.filter(c => c.id !== conflictId)
    this.emit('decision:conflict-resolved', conflictId)
  }
  
  public getActiveDiscussion(): Decision | null {
    return this.activeDiscussion
  }
  
  public reset(): void {
    this.segments = []
    this.decisions.clear()
    this.activeDiscussion = null
    this.decisionConflicts = []
    this.speakerInfluence.clear()
  }
  
  public destroy(): void {
    this.reset()
    this.removeAllListeners()
  }
}

// Export singleton instance
let decisionTracker: DecisionTracker | null = null

export function getDecisionTracker(): DecisionTracker {
  if (!decisionTracker) {
    decisionTracker = new DecisionTracker()
  }
  return decisionTracker
}