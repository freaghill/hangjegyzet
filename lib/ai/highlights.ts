import { generateText } from './claude'

interface MeetingSegment {
  text: string
  start: number
  end: number
  speaker?: string
}

interface MeetingHighlight {
  type: 'key_decision' | 'action_item' | 'important_discussion' | 'question' | 'summary'
  content: string
  timestamp?: number
  speaker?: string
  priority?: 'high' | 'medium' | 'low'
}

interface HighlightsResult {
  summary: string
  keyMoments: MeetingHighlight[]
  actionItems: string[]
  decisions: string[]
  duration: number
  originalDuration: number
}

export class MeetingHighlightsGenerator {
  /**
   * Generate meeting highlights from transcript
   */
  async generateHighlights(
    transcript: string,
    segments?: MeetingSegment[],
    meetingTitle?: string
  ): Promise<HighlightsResult> {
    const prompt = this.buildHighlightsPrompt(transcript, meetingTitle)
    
    try {
      const response = await generateText(prompt)
      const highlights = this.parseHighlightsResponse(response, segments)
      
      // Calculate estimated reading/review time (2-3 minutes)
      const duration = Math.min(180, Math.max(120, highlights.keyMoments.length * 15))
      const originalDuration = segments ? 
        Math.max(...segments.map(s => s.end || 0)) : 
        transcript.split(' ').length / 150 * 60 // Estimate from word count
      
      return {
        ...highlights,
        duration,
        originalDuration
      }
    } catch (error) {
      console.error('Failed to generate highlights:', error)
      throw new Error('Failed to generate meeting highlights')
    }
  }

  /**
   * Extract key moments with timestamps from segments
   */
  extractKeyMoments(
    segments: MeetingSegment[],
    keyPhrases: string[]
  ): MeetingHighlight[] {
    const moments: MeetingHighlight[] = []
    
    segments.forEach(segment => {
      const lowerText = segment.text.toLowerCase()
      
      // Check for action items
      if (this.isActionItem(lowerText)) {
        moments.push({
          type: 'action_item',
          content: segment.text,
          timestamp: segment.start,
          speaker: segment.speaker,
          priority: this.getActionPriority(lowerText)
        })
      }
      
      // Check for decisions
      if (this.isDecision(lowerText)) {
        moments.push({
          type: 'key_decision',
          content: segment.text,
          timestamp: segment.start,
          speaker: segment.speaker,
          priority: 'high'
        })
      }
      
      // Check for important discussions matching key phrases
      keyPhrases.forEach(phrase => {
        if (lowerText.includes(phrase.toLowerCase())) {
          moments.push({
            type: 'important_discussion',
            content: segment.text,
            timestamp: segment.start,
            speaker: segment.speaker,
            priority: 'medium'
          })
        }
      })
    })
    
    // Sort by timestamp and limit to most important
    return moments
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .slice(0, 10) // Top 10 moments
  }

  /**
   * Check if text contains action item indicators
   */
  private isActionItem(text: string): boolean {
    const actionIndicators = [
      'meg kell csinálni', 'el kell végezni', 'fel kell venni',
      'küldj', 'küldd', 'készítsd', 'készíts', 'csináld', 'csinálj',
      'intézd', 'intézz', 'nézd meg', 'nézzd meg', 'ellenőrizd',
      'deadline', 'határidő', 'legkésőbb', 'holnapig', 'péntekig',
      'felelős:', 'felelős lesz', 'te fogod', 'ő fogja',
      'action item', 'teendő', 'feladat'
    ]
    
    return actionIndicators.some(indicator => text.includes(indicator))
  }

  /**
   * Check if text contains decision indicators
   */
  private isDecision(text: string): boolean {
    const decisionIndicators = [
      'eldöntöttük', 'döntöttünk', 'döntés', 'megegyeztünk',
      'megállapodtunk', 'úgy döntöttünk', 'az lesz hogy',
      'végül is', 'akkor marad', 'legyen', 'így lesz',
      'jóváhagyva', 'elfogadva', 'rendben van', 'oké'
    ]
    
    return decisionIndicators.some(indicator => text.includes(indicator))
  }

  /**
   * Determine action item priority
   */
  private getActionPriority(text: string): 'high' | 'medium' | 'low' {
    if (text.includes('sürgős') || text.includes('azonnal') || text.includes('ma')) {
      return 'high'
    }
    if (text.includes('fontos') || text.includes('prioritás')) {
      return 'medium'
    }
    return 'low'
  }

  /**
   * Build prompt for highlights generation
   */
  private buildHighlightsPrompt(transcript: string, meetingTitle?: string): string {
    return `Kérlek készíts egy tömör, 2-3 perces összefoglalót az alábbi meeting átírásból. 
    
${meetingTitle ? `Meeting címe: ${meetingTitle}\n` : ''}

A válaszod legyen JSON formátumban, a következő struktúrával:
{
  "summary": "Rövid, 2-3 mondatos összefoglaló a meeting lényegéről",
  "keyPhrases": ["fontos kifejezés 1", "fontos kifejezés 2", ...],
  "actionItems": ["Konkrét teendő 1", "Konkrét teendő 2", ...],
  "decisions": ["Meghozott döntés 1", "Meghozott döntés 2", ...],
  "questions": ["Megválaszolatlan kérdés 1", ...]
}

Fókuszálj a következőkre:
- Mi volt a meeting fő célja és eredménye?
- Milyen konkrét döntések születtek?
- Milyen teendők lettek kiosztva és kinek?
- Milyen fontos témák vagy problémák merültek fel?
- Maradtak-e nyitott kérdések?

Meeting átirat:
${transcript}`
  }

  /**
   * Parse AI response into structured highlights
   */
  private parseHighlightsResponse(
    response: string,
    segments?: MeetingSegment[]
  ): Omit<HighlightsResult, 'duration' | 'originalDuration'> {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(response)
      
      const keyMoments: MeetingHighlight[] = []
      
      // Add summary as first highlight
      if (parsed.summary) {
        keyMoments.push({
          type: 'summary',
          content: parsed.summary,
          priority: 'high'
        })
      }
      
      // Add decisions
      if (parsed.decisions?.length > 0) {
        parsed.decisions.forEach((decision: string) => {
          keyMoments.push({
            type: 'key_decision',
            content: decision,
            priority: 'high'
          })
        })
      }
      
      // Extract key moments from segments if available
      if (segments && parsed.keyPhrases) {
        const segmentMoments = this.extractKeyMoments(segments, parsed.keyPhrases)
        keyMoments.push(...segmentMoments)
      }
      
      return {
        summary: parsed.summary || 'Nincs elérhető összefoglaló',
        keyMoments,
        actionItems: parsed.actionItems || [],
        decisions: parsed.decisions || []
      }
    } catch (error) {
      // Fallback for non-JSON response
      console.error('Failed to parse highlights JSON:', error)
      
      return {
        summary: response.slice(0, 200),
        keyMoments: [{
          type: 'summary',
          content: response.slice(0, 200),
          priority: 'medium'
        }],
        actionItems: [],
        decisions: []
      }
    }
  }

  /**
   * Format highlights for display
   */
  formatHighlights(highlights: HighlightsResult): string {
    let formatted = `# Meeting összefoglaló (${Math.floor(highlights.duration / 60)} perc)\n\n`
    formatted += `*Eredeti hossz: ${Math.floor(highlights.originalDuration / 60)} perc*\n\n`
    
    formatted += `## Összefoglaló\n${highlights.summary}\n\n`
    
    if (highlights.decisions.length > 0) {
      formatted += `## Döntések\n`
      highlights.decisions.forEach((decision, i) => {
        formatted += `${i + 1}. ${decision}\n`
      })
      formatted += '\n'
    }
    
    if (highlights.actionItems.length > 0) {
      formatted += `## Teendők\n`
      highlights.actionItems.forEach((item, i) => {
        formatted += `- [ ] ${item}\n`
      })
      formatted += '\n'
    }
    
    if (highlights.keyMoments.length > 0) {
      formatted += `## Kulcs pillanatok\n`
      highlights.keyMoments
        .filter(m => m.type !== 'summary')
        .forEach(moment => {
          const time = moment.timestamp ? 
            `[${this.formatTimestamp(moment.timestamp)}] ` : ''
          const speaker = moment.speaker ? `**${moment.speaker}**: ` : ''
          formatted += `- ${time}${speaker}${moment.content}\n`
        })
    }
    
    return formatted
  }

  /**
   * Format timestamp to MM:SS
   */
  private formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
}

export const highlightsGenerator = new MeetingHighlightsGenerator()