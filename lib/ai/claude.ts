import Anthropic from '@anthropic-ai/sdk'
import { TranscriptionResult } from '@/lib/transcription/whisper'
import { trackMetric } from '@/lib/monitoring'
import { MeetingTemplate } from '@/lib/templates/meeting-templates'

export interface AnalysisResult {
  summary: string
  actionItems: Array<{
    task: string
    assignee?: string
    deadline?: string
    priority: 'high' | 'medium' | 'low'
  }>
  keyPoints: string[]
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  topics: string[]
  nextSteps: string[]
  intelligenceScore: number
  sections?: Array<{
    name: string
    content: string
    found: boolean
  }>
}

export class ClaudeAnalyzer {
  private anthropic: Anthropic

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })
  }

  /**
   * Analyze meeting transcript with Claude
   */
  async analyze(
    transcript: TranscriptionResult, 
    language: string = 'hu',
    template?: MeetingTemplate | null
  ): Promise<AnalysisResult> {
    const startTime = Date.now()
    
    try {
      const systemPrompt = template
        ? this.getTemplateSystemPrompt(template, language)
        : language === 'hu' 
          ? this.getHungarianSystemPrompt()
          : this.getEnglishSystemPrompt()

      const userPrompt = template
        ? this.getTemplateUserPrompt(template, transcript.text)
        : this.getDefaultUserPrompt(transcript.text)

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userPrompt
        }]
      })

      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : ''

      // Parse JSON response
      const analysis = this.parseAnalysisResponse(content)
      
      // Track metrics
      const duration = Date.now() - startTime
      trackMetric('ai.analysis_duration', duration / 1000, {
        model: 'claude-3-haiku',
        language,
        template: template?.slug || 'none'
      })
      
      trackMetric('ai.intelligence_score', analysis.intelligenceScore, {
        model: 'claude-3-haiku'
      })

      return analysis
    } catch (error) {
      console.error('Claude analysis error:', error)
      trackMetric('ai.analysis_error', 1, {
        model: 'claude-3-haiku',
        error: error instanceof Error ? error.message : 'unknown'
      })
      
      // Return default analysis on error
      return this.getDefaultAnalysis()
    }
  }

  /**
   * Generate meeting insights
   */
  async generateInsights(
    transcript: TranscriptionResult,
    previousMeetings?: Array<{ summary: string; date: string }>
  ): Promise<string> {
    try {
      const context = previousMeetings?.length 
        ? `Korábbi meetingek összefoglalói:\n${previousMeetings.map(m => `- ${m.date}: ${m.summary}`).join('\n')}\n\n`
        : ''

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: 0.5,
        messages: [{
          role: 'user',
          content: `${context}Adj rövid betekintést a mostani meeting alapján: Mi változott az előző alkalmak óta? Milyen trendeket látsz? Van-e előrelépés a korábban megbeszélt témákban?

Meeting átirat:
${transcript.text.substring(0, 3000)}...`
        }]
      })

      return response.content[0].type === 'text' 
        ? response.content[0].text 
        : 'Nincs elérhető betekintés.'
    } catch (error) {
      console.error('Claude insights error:', error)
      return 'Nem sikerült betekintést generálni.'
    }
  }

  /**
   * Parse Claude's JSON response
   */
  private parseAnalysisResponse(content: string): AnalysisResult {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      // Validate and normalize the response
      return {
        summary: parsed.summary || 'Nincs elérhető összefoglaló',
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        sentiment: parsed.sentiment || 'neutral',
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
        intelligenceScore: parsed.intelligenceScore || 70
      }
    } catch (error) {
      console.error('Error parsing Claude response:', error)
      return this.getDefaultAnalysis()
    }
  }

  /**
   * Get Hungarian system prompt
   */
  private getHungarianSystemPrompt(): string {
    return `Te egy magyar üzleti meeting elemző asszisztens vagy. 
    A feladatod meeting átiratok elemzése és strukturált összefoglalók készítése.
    Mindig magyarul válaszolj, kivéve ha az eredeti szöveg angol kifejezéseket tartalmaz.
    Fokuszálj a lényeges üzleti döntésekre, feladatokra és következő lépésekre.
    Az intelligencia pontszám meghatározásánál vedd figyelembe:
    - Mennyire voltak konkrét döntések
    - Tisztázódtak-e a feladatok és felelősök
    - Volt-e előrelépés a témákban
    - Mennyire volt strukturált a megbeszélés`
  }

  /**
   * Get English system prompt
   */
  private getEnglishSystemPrompt(): string {
    return `You are a business meeting analysis assistant.
    Your task is to analyze meeting transcripts and create structured summaries.
    Focus on key business decisions, action items, and next steps.
    When determining the intelligence score, consider:
    - How concrete the decisions were
    - Whether tasks and responsibilities were clarified
    - Progress made on topics
    - How structured the meeting was`
  }

  /**
   * Get template-specific system prompt
   */
  private getTemplateSystemPrompt(template: MeetingTemplate, language: string): string {
    const basePrompt = language === 'hu'
      ? `Te egy ${template.name} meeting elemző asszisztens vagy. 
         A feladatod ${template.template_type} típusú meetingek elemzése a megadott sablon szerint.
         Fokuszálj a sablon szerinti szakaszokra és elemzési szempontokra.`
      : `You are a ${template.name} meeting analysis assistant.
         Your task is to analyze ${template.template_type} type meetings according to the provided template.
         Focus on template-defined sections and analysis criteria.`

    return basePrompt
  }

  /**
   * Get template-specific user prompt
   */
  private getTemplateUserPrompt(template: MeetingTemplate, transcript: string): string {
    const sections = template.sections
      .map(s => `- ${s.name}: ${s.description}`)
      .join('\n')

    const customPrompts = template.analysis_config.customPrompts
      .map(p => `- ${p}`)
      .join('\n')

    return `Elemezd ezt a ${template.name} meeting átiratot a következő szempontok szerint:

Várt szakaszok:
${sections}

${template.prompts.summary ? `Összefoglaló szempont: ${template.prompts.summary}` : ''}
${template.prompts.actionItems ? `Akciók azonosítása: ${template.prompts.actionItems}` : ''}

Egyéb elemzési szempontok:
${customPrompts}

Meeting átirat:
${transcript}

A válaszod legyen JSON formátumú az alábbi struktúrával:
{
  "summary": "Rövid összefoglaló (2-3 mondat)",
  "actionItems": [
    {
      "task": "Feladat leírása",
      "assignee": "Felelős neve (ha említésre került)",
      "deadline": "Határidő (ha említésre került)",
      "priority": "high/medium/low"
    }
  ],
  "keyPoints": ["Fontos pont 1", "Fontos pont 2"],
  "sentiment": "positive/neutral/negative/mixed",
  "topics": ["Téma 1", "Téma 2"],
  "nextSteps": ["Következő lépés 1", "Következő lépés 2"],
  "intelligenceScore": 85,
  "sections": [
    {
      "name": "Szakasz neve",
      "content": "Szakasz tartalma",
      "found": true/false
    }
  ]
}

Az intelligenceScore 0-100 közötti szám, ami azt mutatja, mennyire volt produktív és eredményes a meeting a sablon elvárásai szerint.`
  }

  /**
   * Get default user prompt
   */
  private getDefaultUserPrompt(transcript: string): string {
    return `Kérlek elemezd az alábbi meeting átiratot és adj strukturált választ JSON formátumban:

${transcript}

A válaszod legyen JSON formátumú az alábbi struktúrával:
{
  "summary": "Rövid összefoglaló (2-3 mondat)",
  "actionItems": [
    {
      "task": "Feladat leírása",
      "assignee": "Felelős neve (ha említésre került)",
      "deadline": "Határidő (ha említésre került)",
      "priority": "high/medium/low"
    }
  ],
  "keyPoints": ["Fontos pont 1", "Fontos pont 2"],
  "sentiment": "positive/neutral/negative/mixed",
  "topics": ["Téma 1", "Téma 2"],
  "nextSteps": ["Következő lépés 1", "Következő lépés 2"],
  "intelligenceScore": 85
}

Az intelligenceScore 0-100 közötti szám, ami azt mutatja, mennyire volt produktív és eredményes a meeting.`
  }

  /**
   * Get default analysis for fallback
   */
  private getDefaultAnalysis(): AnalysisResult {
    return {
      summary: 'Az elemzés jelenleg nem elérhető. Kérjük próbálja újra később.',
      actionItems: [],
      keyPoints: [],
      sentiment: 'neutral',
      topics: [],
      nextSteps: [],
      intelligenceScore: 0
    }
  }
}

// Export singleton instance
export const claudeAnalyzer = new ClaudeAnalyzer()

// Simple text generation function for highlights
export async function generateText(prompt: string): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  })

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    return completion.content[0].type === 'text' 
      ? completion.content[0].text 
      : ''
  } catch (error) {
    console.error('Error generating text:', error)
    throw new Error('Failed to generate text')
  }
}