import { createClient } from '@/lib/supabase/client'
import { trackMetric } from '@/lib/monitoring'

export interface DealProbability {
  probability: number // 0-100
  factors: {
    positiveIndicators: string[]
    negativeIndicators: string[]
    keyMoments: Array<{
      timestamp: number
      text: string
      impact: 'positive' | 'negative'
    }>
  }
  recommendations: string[]
  nextSteps: string[]
}

export interface ComplianceIssue {
  type: 'gdpr' | 'financial' | 'legal' | 'regulatory' | 'contractual'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  context: string
  timestamp?: number
  recommendation: string
}

export interface MarketInsight {
  category: 'competitor' | 'trend' | 'opportunity' | 'threat' | 'customer_need'
  insight: string
  context: string
  confidence: number // 0-100
  actionable: boolean
  suggestedAction?: string
}

export interface BudgetImpact {
  items: Array<{
    description: string
    estimatedAmount?: number
    currency?: string
    timeframe?: string
    confidence: number
  }>
  totalEstimate?: number
  budgetRisks: string[]
  opportunities: string[]
}

export interface BusinessRisk {
  category: 'financial' | 'operational' | 'strategic' | 'compliance' | 'reputational'
  description: string
  likelihood: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  mitigationStrategies: string[]
  timeframe?: string
}

export interface BusinessInsights {
  meetingId: string
  dealProbability?: DealProbability
  complianceIssues: ComplianceIssue[]
  marketInsights: MarketInsight[]
  budgetImpact: BudgetImpact
  risks: BusinessRisk[]
  summary: string
  strategicRecommendations: string[]
}

export class InsightsEngine {
  private supabase = createClient()
  
  // Keywords and patterns for different analyses
  private readonly dealIndicators = {
    positive: [
      'interested', 'érdekli', 'sounds good', 'jól hangzik', 'let\'s proceed', 'haladjunk',
      'budget approved', 'jóváhagyott költségvetés', 'timeline works', 'időzítés megfelelő',
      'decision maker', 'döntéshozó', 'next steps', 'következő lépések', 'contract', 'szerződés'
    ],
    negative: [
      'not interested', 'nem érdekel', 'too expensive', 'túl drága', 'budget issue', 'költségvetési probléma',
      'competitor', 'versenytárs', 'not now', 'most nem', 'concerns', 'aggályok', 'risky', 'kockázatos'
    ]
  }
  
  private readonly complianceKeywords = {
    gdpr: ['personal data', 'személyes adat', 'privacy', 'adatvédelem', 'consent', 'hozzájárulás', 'data protection'],
    financial: ['revenue', 'árbevétel', 'tax', 'adó', 'invoice', 'számla', 'payment terms', 'fizetési feltételek'],
    legal: ['contract', 'szerződés', 'liability', 'felelősség', 'terms', 'feltételek', 'agreement', 'megállapodás'],
    regulatory: ['compliance', 'megfelelőség', 'regulation', 'szabályozás', 'audit', 'standard', 'certification'],
    contractual: ['breach', 'megszegés', 'penalty', 'kötbér', 'obligation', 'kötelezettség', 'deadline', 'határidő']
  }
  
  private readonly marketKeywords = {
    competitor: ['competitor', 'versenytárs', 'competition', 'verseny', 'market share', 'piaci részesedés'],
    trend: ['trend', 'trending', 'növekvő', 'csökkenő', 'market shift', 'piaci változás', 'emerging'],
    opportunity: ['opportunity', 'lehetőség', 'potential', 'potenciál', 'growth', 'növekedés', 'expand'],
    threat: ['threat', 'fenyegetés', 'risk', 'kockázat', 'challenge', 'kihívás', 'concern'],
    customer_need: ['customer wants', 'ügyfél igény', 'pain point', 'probléma', 'requirement', 'követelmény']
  }
  
  /**
   * Analyze all business insights from a meeting
   */
  async analyzeBusinessInsights(meetingId: string): Promise<BusinessInsights> {
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
      const [dealProbability, complianceIssues, marketInsights, budgetImpact, risks] = await Promise.all([
        this.calculateDealProbability(meeting),
        this.detectComplianceIssues(meeting),
        this.extractMarketInsights(meeting),
        this.analyzeBudgetImpact(meeting),
        this.identifyRisks(meeting)
      ])
      
      // Generate summary and strategic recommendations
      const summary = this.generateInsightsSummary({
        dealProbability,
        complianceIssues,
        marketInsights,
        budgetImpact,
        risks
      })
      
      const strategicRecommendations = this.generateStrategicRecommendations({
        dealProbability,
        complianceIssues,
        marketInsights,
        budgetImpact,
        risks
      })
      
      const insights: BusinessInsights = {
        meetingId,
        dealProbability: meeting.meeting_type === 'sales' ? dealProbability : undefined,
        complianceIssues,
        marketInsights,
        budgetImpact,
        risks,
        summary,
        strategicRecommendations
      }
      
      // Track metrics
      trackMetric('ai.business_insights_generated', 1, {
        duration: (Date.now() - startTime) / 1000,
        compliance_issues: complianceIssues.length,
        market_insights: marketInsights.length,
        risks: risks.length
      })
      
      return insights
    } catch (error) {
      console.error('Error analyzing business insights:', error)
      trackMetric('ai.business_insights_error', 1)
      throw error
    }
  }
  
  /**
   * Calculate deal closure probability for sales meetings
   */
  async calculateDealProbability(meeting: any): Promise<DealProbability> {
    const positiveIndicators: string[] = []
    const negativeIndicators: string[] = []
    const keyMoments: DealProbability['factors']['keyMoments'] = []
    
    if (!meeting.transcript?.segments) {
      return {
        probability: 50,
        factors: { positiveIndicators, negativeIndicators, keyMoments },
        recommendations: ['Nincs elég adat a pontos elemzéshez'],
        nextSteps: []
      }
    }
    
    // Analyze transcript for deal indicators
    let positiveScore = 0
    let negativeScore = 0
    
    meeting.transcript.segments.forEach((segment: any) => {
      if (!segment.text) return
      
      const text = segment.text.toLowerCase()
      
      // Check positive indicators
      this.dealIndicators.positive.forEach(indicator => {
        if (text.includes(indicator)) {
          positiveScore += 10
          if (!positiveIndicators.includes(indicator)) {
            positiveIndicators.push(indicator)
          }
          keyMoments.push({
            timestamp: segment.start,
            text: segment.text.substring(0, 100),
            impact: 'positive'
          })
        }
      })
      
      // Check negative indicators
      this.dealIndicators.negative.forEach(indicator => {
        if (text.includes(indicator)) {
          negativeScore += 10
          if (!negativeIndicators.includes(indicator)) {
            negativeIndicators.push(indicator)
          }
          keyMoments.push({
            timestamp: segment.start,
            text: segment.text.substring(0, 100),
            impact: 'negative'
          })
        }
      })
    })
    
    // Check for specific strong signals
    const hasNextSteps = meeting.action_items && meeting.action_items.length > 0
    const hasBudgetDiscussion = positiveIndicators.some(i => i.includes('budget'))
    const hasTimelineAgreement = positiveIndicators.some(i => i.includes('timeline') || i.includes('időzítés'))
    const hasDecisionMaker = positiveIndicators.some(i => i.includes('decision') || i.includes('döntés'))
    
    // Boost scores for strong signals
    if (hasNextSteps) positiveScore += 20
    if (hasBudgetDiscussion && !negativeIndicators.some(i => i.includes('expensive') || i.includes('drága'))) positiveScore += 15
    if (hasTimelineAgreement) positiveScore += 15
    if (hasDecisionMaker) positiveScore += 10
    
    // Calculate probability
    const totalScore = positiveScore + negativeScore
    let probability = totalScore > 0 ? (positiveScore / totalScore) * 100 : 50
    
    // Adjust based on meeting progression
    if (meeting.meeting_number && meeting.meeting_number > 2 && probability > 40) {
      probability += 10 // Boost for follow-up meetings
    }
    
    probability = Math.min(95, Math.max(5, Math.round(probability)))
    
    // Generate recommendations
    const recommendations: string[] = []
    const nextSteps: string[] = []
    
    if (probability < 30) {
      recommendations.push('Az ügylet valószínűsége alacsony - tisztázza az aggályokat')
      if (negativeIndicators.includes('too expensive') || negativeIndicators.includes('túl drága')) {
        recommendations.push('Fontolja meg az árképzés újratárgyalását vagy értékpropozíció erősítését')
      }
      if (negativeIndicators.includes('competitor') || negativeIndicators.includes('versenytárs')) {
        recommendations.push('Készítsen versenyelemzést és emelje ki az egyedi értékeket')
      }
    } else if (probability < 70) {
      recommendations.push('Közepes valószínűség - fókuszáljon a fennmaradó aggályokra')
      if (!hasDecisionMaker) {
        recommendations.push('Azonosítsa és vonja be a döntéshozókat')
        nextSteps.push('Döntéshozók meeting megszervezése')
      }
      if (!hasBudgetDiscussion) {
        recommendations.push('Tisztázza a költségvetési kereteket')
        nextSteps.push('Részletes árajánlat küldése')
      }
    } else {
      recommendations.push('Magas valószínűség - gyorsítsa fel a lezárást')
      if (!hasNextSteps) {
        nextSteps.push('Szerződéstervezet előkészítése')
        nextSteps.push('Implementációs terv egyeztetése')
      }
      recommendations.push('Készüljön fel a szerződéskötésre')
    }
    
    // Add timeline recommendation
    if (!hasTimelineAgreement) {
      nextSteps.push('Időzítés és mérföldkövek egyeztetése')
    }
    
    return {
      probability,
      factors: {
        positiveIndicators,
        negativeIndicators,
        keyMoments: keyMoments.slice(0, 10) // Top 10 moments
      },
      recommendations,
      nextSteps
    }
  }
  
  /**
   * Detect potential compliance issues
   */
  async detectComplianceIssues(meeting: any): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = []
    
    if (!meeting.transcript?.segments) {
      return issues
    }
    
    // Check each segment for compliance keywords
    meeting.transcript.segments.forEach((segment: any) => {
      if (!segment.text) return
      
      const text = segment.text.toLowerCase()
      
      // Check each compliance category
      Object.entries(this.complianceKeywords).forEach(([category, keywords]) => {
        keywords.forEach(keyword => {
          if (text.includes(keyword)) {
            // Determine severity based on context
            let severity: ComplianceIssue['severity'] = 'low'
            const context = segment.text
            
            // Severity indicators
            if (text.includes('violation') || text.includes('breach') || text.includes('megszeg')) {
              severity = 'critical'
            } else if (text.includes('risk') || text.includes('kockázat') || text.includes('concern')) {
              severity = 'high'
            } else if (text.includes('might') || text.includes('talán') || text.includes('esetleg')) {
              severity = 'medium'
            }
            
            // Create issue if not already detected
            const issueKey = `${category}_${keyword}`
            if (!issues.find(i => i.type === category as any && i.context.includes(keyword))) {
              issues.push({
                type: category as ComplianceIssue['type'],
                severity,
                description: this.getComplianceDescription(category, keyword),
                context: context.substring(0, 200),
                timestamp: segment.start,
                recommendation: this.getComplianceRecommendation(category, severity)
              })
            }
          }
        })
      })
    })
    
    // Check for GDPR specific patterns
    if (meeting.participants && meeting.participants.length > 0) {
      const hasConsent = meeting.transcript.segments.some((s: any) => 
        s.text && (s.text.includes('consent') || s.text.includes('hozzájárul'))
      )
      
      if (meeting.is_recorded && !hasConsent) {
        issues.push({
          type: 'gdpr',
          severity: 'medium',
          description: 'Felvétel készült résztvevői hozzájárulás említése nélkül',
          context: 'Meeting felvétel',
          recommendation: 'Győződjön meg róla, hogy minden résztvevő hozzájárult a felvételhez'
        })
      }
    }
    
    // Sort by severity
    return issues.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
  }
  
  /**
   * Extract market intelligence
   */
  async extractMarketInsights(meeting: any): Promise<MarketInsight[]> {
    const insights: MarketInsight[] = []
    
    if (!meeting.transcript?.segments) {
      return insights
    }
    
    // Analyze transcript for market insights
    meeting.transcript.segments.forEach((segment: any) => {
      if (!segment.text) return
      
      const text = segment.text.toLowerCase()
      const originalText = segment.text
      
      // Check each market category
      Object.entries(this.marketKeywords).forEach(([category, keywords]) => {
        keywords.forEach(keyword => {
          if (text.includes(keyword)) {
            // Extract context around keyword
            const keywordIndex = text.indexOf(keyword)
            const contextStart = Math.max(0, keywordIndex - 50)
            const contextEnd = Math.min(text.length, keywordIndex + keyword.length + 50)
            const context = originalText.substring(contextStart, contextEnd)
            
            // Determine confidence based on clarity of statement
            let confidence = 60 // Base confidence
            if (text.includes('definitely') || text.includes('biztosan') || text.includes('clearly')) {
              confidence += 20
            }
            if (text.includes('maybe') || text.includes('talán') || text.includes('possibly')) {
              confidence -= 20
            }
            if (segment.speaker && meeting.participants?.find((p: any) => p.role === 'customer')) {
              confidence += 10 // Higher confidence for customer statements
            }
            
            // Determine if actionable
            const actionable = category === 'opportunity' || category === 'threat' || 
                             (category === 'customer_need' && confidence > 70)
            
            // Generate suggested action
            let suggestedAction: string | undefined
            if (actionable) {
              suggestedAction = this.generateMarketAction(category, context)
            }
            
            insights.push({
              category: category as MarketInsight['category'],
              insight: this.extractInsightSummary(category, context),
              context,
              confidence: Math.min(100, Math.max(0, confidence)),
              actionable,
              suggestedAction
            })
          }
        })
      })
    })
    
    // Deduplicate similar insights
    const uniqueInsights = insights.reduce((acc: MarketInsight[], insight) => {
      const similar = acc.find(i => 
        i.category === insight.category && 
        i.insight.substring(0, 30) === insight.insight.substring(0, 30)
      )
      if (!similar) {
        acc.push(insight)
      } else if (insight.confidence > similar.confidence) {
        // Replace with higher confidence version
        const index = acc.indexOf(similar)
        acc[index] = insight
      }
      return acc
    }, [])
    
    // Sort by confidence and actionability
    return uniqueInsights.sort((a, b) => {
      if (a.actionable && !b.actionable) return -1
      if (!a.actionable && b.actionable) return 1
      return b.confidence - a.confidence
    })
  }
  
  /**
   * Analyze budget implications
   */
  async analyzeBudgetImpact(meeting: any): Promise<BudgetImpact> {
    const items: BudgetImpact['items'] = []
    const budgetRisks: string[] = []
    const opportunities: string[] = []
    
    if (!meeting.transcript?.segments) {
      return { items, budgetRisks, opportunities }
    }
    
    // Regular expressions for amounts
    const amountPatterns = [
      /(\d+(?:\.\d+)?)\s*(EUR|HUF|USD|€|\$|Ft|forint|euro|dollár)/gi,
      /(\d+(?:\s\d{3})*(?:,\d+)?)\s*(EUR|HUF|USD|€|\$|Ft|forint|euro|dollár)/gi,
      /(költség|budget|ár|price|fee|díj).*?(\d+(?:\.\d+)?)/gi
    ]
    
    const timeframeKeywords = ['monthly', 'havi', 'yearly', 'éves', 'quarterly', 'negyedéves', 'one-time', 'egyszeri']
    
    // Extract budget items from transcript
    meeting.transcript.segments.forEach((segment: any) => {
      if (!segment.text) return
      
      const text = segment.text
      
      // Check for amounts
      amountPatterns.forEach(pattern => {
        let match
        while ((match = pattern.exec(text)) !== null) {
          const amount = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'))
          const currency = match[2] || 'HUF'
          
          // Extract context
          const contextStart = Math.max(0, match.index - 50)
          const contextEnd = Math.min(text.length, match.index + match[0].length + 50)
          const context = text.substring(contextStart, contextEnd)
          
          // Determine timeframe
          let timeframe = 'egyszeri'
          timeframeKeywords.forEach(keyword => {
            if (context.toLowerCase().includes(keyword)) {
              timeframe = keyword
            }
          })
          
          // Determine confidence based on context
          let confidence = 70
          if (context.includes('approximately') || context.includes('körülbelül') || context.includes('kb')) {
            confidence -= 20
          }
          if (context.includes('exact') || context.includes('pontos') || context.includes('fix')) {
            confidence += 20
          }
          
          items.push({
            description: context.trim(),
            estimatedAmount: amount,
            currency: currency.toUpperCase().replace('FT', 'HUF').replace('€', 'EUR').replace('$', 'USD'),
            timeframe,
            confidence: Math.min(100, Math.max(0, confidence))
          })
        }
      })
      
      // Check for budget risks
      const riskKeywords = ['over budget', 'túllépés', 'expensive', 'drága', 'cost overrun', 'többletköltség']
      riskKeywords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword)) {
          budgetRisks.push(this.extractBudgetRisk(keyword, text))
        }
      })
      
      // Check for opportunities
      const opportunityKeywords = ['cost saving', 'megtakarítás', 'discount', 'kedvezmény', 'free', 'ingyenes']
      opportunityKeywords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword)) {
          opportunities.push(this.extractBudgetOpportunity(keyword, text))
        }
      })
    })
    
    // Calculate total estimate
    let totalEstimate: number | undefined
    if (items.length > 0) {
      // Convert all to HUF for total (simplified)
      const conversionRates: Record<string, number> = {
        'HUF': 1,
        'EUR': 380,
        'USD': 350
      }
      
      totalEstimate = items.reduce((sum, item) => {
        if (item.estimatedAmount && item.currency) {
          const rate = conversionRates[item.currency] || 1
          let amount = item.estimatedAmount * rate
          
          // Adjust for timeframe (annualize)
          if (item.timeframe?.includes('havi') || item.timeframe?.includes('monthly')) {
            amount *= 12
          } else if (item.timeframe?.includes('negyedév') || item.timeframe?.includes('quarterly')) {
            amount *= 4
          }
          
          return sum + amount
        }
        return sum
      }, 0)
    }
    
    // Add general risks and opportunities based on total
    if (totalEstimate && totalEstimate > 10000000) { // 10M HUF
      budgetRisks.push('Jelentős költségvetési elköteleződés - vezetői jóváhagyás szükséges')
    }
    
    if (meeting.action_items?.some((item: any) => item.task.toLowerCase().includes('roi') || item.task.includes('megtérülés'))) {
      opportunities.push('ROI számítás tervezett - potenciális értékteremtés kimutatása')
    }
    
    return {
      items: items.slice(0, 20), // Limit to 20 items
      totalEstimate,
      budgetRisks: [...new Set(budgetRisks)], // Remove duplicates
      opportunities: [...new Set(opportunities)]
    }
  }
  
  /**
   * Identify business risks
   */
  async identifyRisks(meeting: any): Promise<BusinessRisk[]> {
    const risks: BusinessRisk[] = []
    const riskKeywords = {
      financial: ['financial risk', 'pénzügyi kockázat', 'cash flow', 'likviditás', 'payment delay', 'fizetési késedelem'],
      operational: ['operational risk', 'működési kockázat', 'capacity', 'kapacitás', 'resource', 'erőforrás'],
      strategic: ['strategic risk', 'stratégiai kockázat', 'market position', 'piaci pozíció', 'competitive', 'verseny'],
      compliance: ['compliance risk', 'megfelelőségi kockázat', 'regulation', 'szabályozás', 'legal', 'jogi'],
      reputational: ['reputation risk', 'reputációs kockázat', 'brand', 'márka', 'public', 'nyilvános']
    }
    
    if (!meeting.transcript?.segments) {
      return risks
    }
    
    // Analyze transcript for risks
    meeting.transcript.segments.forEach((segment: any) => {
      if (!segment.text) return
      
      const text = segment.text.toLowerCase()
      const originalText = segment.text
      
      // Check each risk category
      Object.entries(riskKeywords).forEach(([category, keywords]) => {
        keywords.forEach(keyword => {
          if (text.includes(keyword)) {
            // Determine likelihood and impact
            let likelihood: BusinessRisk['likelihood'] = 'medium'
            let impact: BusinessRisk['impact'] = 'medium'
            
            // Likelihood indicators
            if (text.includes('likely') || text.includes('valószínű') || text.includes('probably')) {
              likelihood = 'high'
            } else if (text.includes('unlikely') || text.includes('valószínűtlen') || text.includes('rarely')) {
              likelihood = 'low'
            }
            
            // Impact indicators
            if (text.includes('significant') || text.includes('jelentős') || text.includes('major')) {
              impact = 'high'
            } else if (text.includes('minor') || text.includes('kis') || text.includes('limited')) {
              impact = 'low'
            }
            
            // Extract timeframe if mentioned
            let timeframe: string | undefined
            const timeIndicators = ['immediate', 'azonnali', 'short-term', 'rövid távú', 'long-term', 'hosszú távú']
            timeIndicators.forEach(indicator => {
              if (text.includes(indicator)) {
                timeframe = indicator
              }
            })
            
            // Generate mitigation strategies
            const mitigationStrategies = this.generateMitigationStrategies(category, originalText)
            
            risks.push({
              category: category as BusinessRisk['category'],
              description: this.extractRiskDescription(category, originalText),
              likelihood,
              impact,
              mitigationStrategies,
              timeframe
            })
          }
        })
      })
    })
    
    // Add risks from action items if they indicate issues
    if (meeting.action_items && Array.isArray(meeting.action_items)) {
      meeting.action_items.forEach((item: any) => {
        if (item.task && (item.task.includes('risk') || item.task.includes('kockázat'))) {
          risks.push({
            category: 'operational',
            description: `Akció: ${item.task}`,
            likelihood: 'medium',
            impact: 'medium',
            mitigationStrategies: ['Kijelölt akció elem követése', 'Rendszeres státusz ellenőrzés'],
            timeframe: item.deadline
          })
        }
      })
    }
    
    // Sort by risk score (likelihood * impact)
    const riskScore = (risk: BusinessRisk): number => {
      const likelihoodScore = { low: 1, medium: 2, high: 3 }
      const impactScore = { low: 1, medium: 2, high: 3 }
      return likelihoodScore[risk.likelihood] * impactScore[risk.impact]
    }
    
    return risks.sort((a, b) => riskScore(b) - riskScore(a))
  }
  
  // Helper methods
  
  private getComplianceDescription(category: string, keyword: string): string {
    const descriptions: Record<string, Record<string, string>> = {
      gdpr: {
        'personal data': 'Személyes adatok kezelése említve',
        'privacy': 'Adatvédelmi kérdés felmerült',
        'consent': 'Hozzájárulási követelmény említve'
      },
      financial: {
        'tax': 'Adózási kérdés felmerült',
        'invoice': 'Számlázási követelmény említve',
        'payment terms': 'Fizetési feltételek megbeszélése'
      },
      legal: {
        'contract': 'Szerződéses kötelezettség említve',
        'liability': 'Felelősségi kérdés felmerült',
        'terms': 'Jogi feltételek megbeszélése'
      }
    }
    
    return descriptions[category]?.[keyword] || `${category} kérdés: ${keyword}`
  }
  
  private getComplianceRecommendation(category: string, severity: string): string {
    if (severity === 'critical') {
      return 'Azonnali jogi vagy compliance szakértői konzultáció szükséges'
    }
    
    const recommendations: Record<string, string> = {
      gdpr: 'Ellenőrizze a GDPR megfelelőséget és dokumentálja a hozzájárulásokat',
      financial: 'Egyeztessen a pénzügyi osztállyal a követelmények tisztázásához',
      legal: 'Vonja be a jogi osztályt a szerződéses feltételek áttekintéséhez',
      regulatory: 'Vizsgálja felül a vonatkozó szabályozási követelményeket',
      contractual: 'Ellenőrizze a meglévő szerződéses kötelezettségeket'
    }
    
    return recommendations[category] || 'Vizsgálja felül a compliance követelményeket'
  }
  
  private generateMarketAction(category: string, context: string): string {
    const actions: Record<string, string> = {
      competitor: 'Készítsen versenytárs elemzést és pozicionálási stratégiát',
      trend: 'Értékelje a trend hatását és alkalmazkodási lehetőségeket',
      opportunity: 'Dolgozzon ki akciótervet a lehetőség kihasználására',
      threat: 'Készítsen kockázatkezelési tervet a fenyegetés kivédésére',
      customer_need: 'Fejlesszen megoldást az ügyfél igény kielégítésére'
    }
    
    return actions[category] || 'További elemzés szükséges'
  }
  
  private extractInsightSummary(category: string, context: string): string {
    // Extract key insight from context
    const sentences = context.split(/[.!?]/).filter(s => s.trim().length > 10)
    const relevantSentence = sentences.find(s => 
      Object.values(this.marketKeywords).flat().some(keyword => 
        s.toLowerCase().includes(keyword)
      )
    ) || sentences[0] || context
    
    return relevantSentence.trim().substring(0, 200)
  }
  
  private extractBudgetRisk(keyword: string, text: string): string {
    const index = text.toLowerCase().indexOf(keyword)
    const start = Math.max(0, index - 30)
    const end = Math.min(text.length, index + keyword.length + 70)
    return text.substring(start, end).trim()
  }
  
  private extractBudgetOpportunity(keyword: string, text: string): string {
    const index = text.toLowerCase().indexOf(keyword)
    const start = Math.max(0, index - 30)
    const end = Math.min(text.length, index + keyword.length + 70)
    return text.substring(start, end).trim()
  }
  
  private generateMitigationStrategies(category: string, context: string): string[] {
    const strategies: Record<string, string[]> = {
      financial: [
        'Készítsen részletes cash flow előrejelzést',
        'Diverzifikálja a bevételi forrásokat',
        'Alakítson ki tartalékokat'
      ],
      operational: [
        'Dokumentálja és optimalizálja a folyamatokat',
        'Készítsen kapacitás tervet',
        'Képezzen tartalék erőforrásokat'
      ],
      strategic: [
        'Végezzen rendszeres piacelemzést',
        'Fejlesszen alternatív stratégiákat',
        'Erősítse az egyedi értékpropozíciót'
      ],
      compliance: [
        'Vezessen be compliance monitoring rendszert',
        'Képezze a munkatársakat',
        'Végezzen rendszeres auditokat'
      ],
      reputational: [
        'Fejlesszen kríziskommunikációs tervet',
        'Monitorozza a brand említéseket',
        'Építsen proaktív PR stratégiát'
      ]
    }
    
    return strategies[category] || ['További elemzés és tervezés szükséges']
  }
  
  private extractRiskDescription(category: string, text: string): string {
    // Extract most relevant sentence about the risk
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 20)
    const riskSentence = sentences.find(s => 
      s.toLowerCase().includes('risk') || s.toLowerCase().includes('kockázat')
    ) || sentences[0] || text
    
    return riskSentence.trim().substring(0, 200)
  }
  
  private generateInsightsSummary(insights: Omit<BusinessInsights, 'meetingId' | 'summary' | 'strategicRecommendations'>): string {
    const parts: string[] = []
    
    if (insights.dealProbability) {
      parts.push(`Üzletkötési valószínűség: ${insights.dealProbability.probability}%`)
    }
    
    if (insights.complianceIssues.length > 0) {
      const criticalCount = insights.complianceIssues.filter(i => i.severity === 'critical').length
      if (criticalCount > 0) {
        parts.push(`${criticalCount} kritikus compliance kérdés azonosítva`)
      } else {
        parts.push(`${insights.complianceIssues.length} compliance kérdés figyelmet igényel`)
      }
    }
    
    if (insights.marketInsights.length > 0) {
      const actionableCount = insights.marketInsights.filter(i => i.actionable).length
      parts.push(`${actionableCount} azonnal kezelhető piaci információ`)
    }
    
    if (insights.budgetImpact.totalEstimate) {
      parts.push(`Becsült költségvetési hatás: ${(insights.budgetImpact.totalEstimate / 1000000).toFixed(1)}M HUF`)
    }
    
    if (insights.risks.filter(r => r.likelihood === 'high' && r.impact === 'high').length > 0) {
      parts.push('Magas prioritású kockázatok azonosítva')
    }
    
    return parts.join('. ') || 'Nincs kiemelkedő üzleti információ.'
  }
  
  private generateStrategicRecommendations(insights: Omit<BusinessInsights, 'meetingId' | 'summary' | 'strategicRecommendations'>): string[] {
    const recommendations: string[] = []
    
    // Deal-based recommendations
    if (insights.dealProbability && insights.dealProbability.probability > 70) {
      recommendations.push('Gyorsítsa fel az üzletkötési folyamatot - a jelzések pozitívak')
    } else if (insights.dealProbability && insights.dealProbability.probability < 30) {
      recommendations.push('Értékelje újra az üzleti lehetőséget vagy módosítsa az ajánlatot')
    }
    
    // Compliance-based recommendations
    const criticalCompliance = insights.complianceIssues.filter(i => i.severity === 'critical')
    if (criticalCompliance.length > 0) {
      recommendations.push('Sürgősen kezelje a kritikus compliance kérdéseket a jogi csapattal')
    }
    
    // Market-based recommendations
    const opportunities = insights.marketInsights.filter(i => i.category === 'opportunity' && i.actionable)
    if (opportunities.length > 0) {
      recommendations.push('Használja ki az azonosított piaci lehetőségeket gyors cselekvéssel')
    }
    
    const threats = insights.marketInsights.filter(i => i.category === 'threat' && i.confidence > 70)
    if (threats.length > 0) {
      recommendations.push('Készítsen védelmi stratégiát az azonosított piaci fenyegetések ellen')
    }
    
    // Budget-based recommendations
    if (insights.budgetImpact.budgetRisks.length > 2) {
      recommendations.push('Végezzen részletes költség-haszon elemzést a költségvetési kockázatok miatt')
    }
    
    if (insights.budgetImpact.opportunities.length > 0) {
      recommendations.push('Maximalizálja a költségmegtakarítási lehetőségeket')
    }
    
    // Risk-based recommendations
    const highRisks = insights.risks.filter(r => r.likelihood === 'high' && r.impact === 'high')
    if (highRisks.length > 0) {
      recommendations.push('Alakítson ki azonnali kockázatkezelési akciótervet a magas prioritású kockázatokra')
    }
    
    // General strategic recommendations
    if (recommendations.length === 0) {
      recommendations.push('Folytassa a normál üzletmenetet, de maradjon éber a változásokra')
    }
    
    return recommendations.slice(0, 5) // Top 5 recommendations
  }
}

// Export singleton instance
export const insightsEngine = new InsightsEngine()