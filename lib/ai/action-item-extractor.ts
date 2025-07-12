import { z } from 'zod'
import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { JsonOutputParser, StructuredOutputParser } from '@langchain/core/output_parsers'
import { PromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'

// Schema for action items
const ActionItemSchema = z.object({
  text: z.string().describe('The action item description in Hungarian'),
  assignee: z.string().optional().describe('Person responsible for this action'),
  priority: z.enum(['high', 'medium', 'low']).describe('Priority level of the action'),
  category: z.enum(['task', 'decision', 'follow-up', 'research', 'meeting']).describe('Type of action item'),
  deadline: z.string().optional().describe('Suggested deadline if mentioned'),
  context: z.string().optional().describe('Additional context from the meeting'),
  confidence: z.number().min(0).max(1).describe('Confidence score for this extraction')
})

const MeetingInsightsSchema = z.object({
  action_items: z.array(ActionItemSchema).describe('List of extracted action items'),
  key_decisions: z.array(z.string()).describe('Important decisions made during the meeting'),
  follow_up_topics: z.array(z.string()).describe('Topics that need follow-up discussion'),
  blockers: z.array(z.string()).describe('Identified blockers or issues'),
  next_meeting_agenda: z.array(z.string()).describe('Suggested topics for next meeting'),
  participants_mentioned: z.array(z.string()).describe('People mentioned in the meeting'),
  metrics_kpis: z.array(z.object({
    metric: z.string(),
    value: z.string().optional(),
    target: z.string().optional()
  })).describe('Metrics or KPIs discussed')
})

export type ActionItem = z.infer<typeof ActionItemSchema>
export type MeetingInsights = z.infer<typeof MeetingInsightsSchema>

export class ActionItemExtractor {
  private model: ChatOpenAI | ChatAnthropic
  private parser: JsonOutputParser<MeetingInsights>
  
  constructor(provider: 'openai' | 'anthropic' = 'openai') {
    // Initialize the model based on provider
    if (provider === 'anthropic') {
      this.model = new ChatAnthropic({
        modelName: 'claude-3-sonnet-20240229',
        temperature: 0.1,
        maxTokens: 4000,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY
      })
    } else {
      this.model = new ChatOpenAI({
        modelName: 'gpt-4-turbo-preview',
        temperature: 0.1,
        maxTokens: 4000,
        openAIApiKey: process.env.OPENAI_API_KEY
      })
    }
    
    this.parser = new JsonOutputParser<MeetingInsights>()
  }
  
  /**
   * Extract action items and insights from meeting transcript
   */
  async extractFromTranscript(
    transcript: string,
    metadata?: {
      title?: string
      participants?: string[]
      duration?: number
      language?: string
    }
  ): Promise<MeetingInsights> {
    const systemPrompt = `You are an expert meeting analyst specializing in extracting actionable insights from Hungarian meeting transcripts.
Your task is to analyze the meeting transcript and extract:
1. Action items with clear ownership and deadlines
2. Key decisions that were made
3. Topics requiring follow-up
4. Blockers or issues raised
5. Suggested agenda items for the next meeting
6. People mentioned (even if not present)
7. Any metrics, KPIs, or measurable goals discussed

Guidelines:
- Be specific and actionable
- Extract names of people when mentioned
- Infer priorities based on language used (sürgős, fontos, kritikus = high)
- Look for deadline indicators (holnap, jövő hét, hónap végéig, etc.)
- Categorize action items appropriately
- Include confidence scores based on clarity of the statement
- All output should be in Hungarian

Output format: ${JSON.stringify(MeetingInsightsSchema.shape, null, 2)}`

    const userPrompt = `Meeting Title: ${metadata?.title || 'Untitled'}
Participants: ${metadata?.participants?.join(', ') || 'Unknown'}
Duration: ${metadata?.duration ? Math.round(metadata.duration / 60) + ' minutes' : 'Unknown'}

Transcript:
${transcript}

Please extract all action items, decisions, and insights from this meeting transcript.`

    try {
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ]
      
      const response = await this.model.invoke(messages)
      const parsed = await this.parser.parse(response.content as string)
      
      return parsed
    } catch (error) {
      console.error('Error extracting action items:', error)
      throw new Error('Failed to extract action items from transcript')
    }
  }
  
  /**
   * Extract action items using chain of thought reasoning
   */
  async extractWithReasoning(
    transcript: string,
    context?: {
      previousMeetings?: Array<{ title: string; action_items: ActionItem[] }>
      organizationContext?: string
      templateType?: string
    }
  ): Promise<{
    insights: MeetingInsights
    reasoning: string
  }> {
    const reasoningPrompt = PromptTemplate.fromTemplate(`
Analyze this Hungarian meeting transcript step by step:

1. First, identify the meeting type and main topics
2. Look for action verbs and commitment language (meg kell csinálni, el fogom intézni, vállalom, etc.)
3. Identify who is speaking and who is being assigned tasks
4. Look for timeline mentions and urgency indicators
5. Check for decisions (eldöntöttük, megegyeztünk, az lesz hogy, etc.)
6. Note any problems or blockers mentioned
7. Extract metrics or goals with numbers

Context:
{context}

Transcript:
{transcript}

Provide your reasoning for each extracted item.
`)

    const extractionPrompt = PromptTemplate.fromTemplate(`
Based on the following reasoning, extract structured action items and insights:

Reasoning:
{reasoning}

Output the results in this JSON format:
{format}
`)

    try {
      // Step 1: Reasoning
      const reasoningChain = RunnableSequence.from([
        reasoningPrompt,
        this.model,
        (output) => output.content
      ])
      
      const reasoning = await reasoningChain.invoke({
        transcript,
        context: JSON.stringify(context || {})
      })
      
      // Step 2: Structured extraction based on reasoning
      const extractionChain = RunnableSequence.from([
        extractionPrompt,
        this.model,
        this.parser
      ])
      
      const insights = await extractionChain.invoke({
        reasoning,
        format: JSON.stringify(MeetingInsightsSchema.shape, null, 2)
      })
      
      return { insights, reasoning: reasoning as string }
    } catch (error) {
      console.error('Error in reasoning extraction:', error)
      throw new Error('Failed to extract insights with reasoning')
    }
  }
  
  /**
   * Enhance action items with additional context
   */
  async enhanceActionItems(
    actionItems: ActionItem[],
    additionalContext: {
      organizationChart?: Record<string, { email: string; role: string }>
      projectDeadlines?: Record<string, Date>
      historicalData?: Array<{ action: string; completionTime: number }>
    }
  ): Promise<ActionItem[]> {
    const enhancementPrompt = `Enhance these action items with additional context:

Action Items:
${JSON.stringify(actionItems, null, 2)}

Organization Chart:
${JSON.stringify(additionalContext.organizationChart || {}, null, 2)}

Project Deadlines:
${JSON.stringify(additionalContext.projectDeadlines || {}, null, 2)}

Historical Completion Times:
${JSON.stringify(additionalContext.historicalData || [], null, 2)}

Tasks:
1. Match assignees to people in the organization chart
2. Suggest realistic deadlines based on historical data
3. Adjust priorities based on project deadlines
4. Add email addresses for assignees where possible
5. Improve action item descriptions for clarity

Return the enhanced action items in the same format.`

    try {
      const response = await this.model.invoke([
        new SystemMessage('You are a project management assistant helping to enhance action items with organizational context.'),
        new HumanMessage(enhancementPrompt)
      ])
      
      const enhanced = await this.parser.parse(response.content as string)
      return (enhanced as any).action_items || actionItems
    } catch (error) {
      console.error('Error enhancing action items:', error)
      return actionItems // Return original if enhancement fails
    }
  }
  
  /**
   * Generate follow-up email content
   */
  async generateFollowUpEmail(
    insights: MeetingInsights,
    meetingTitle: string,
    meetingDate: Date
  ): Promise<string> {
    const emailPrompt = `Generate a professional follow-up email in Hungarian for this meeting:

Meeting: ${meetingTitle}
Date: ${meetingDate.toLocaleDateString('hu-HU')}

Insights:
${JSON.stringify(insights, null, 2)}

The email should:
1. Start with a brief summary
2. List action items with owners and deadlines
3. Highlight key decisions
4. Note any blockers
5. Suggest next meeting agenda if applicable
6. Be professional but friendly
7. Use proper Hungarian business language

Format the email in HTML with proper structure.`

    try {
      const response = await this.model.invoke([
        new SystemMessage('You are a professional meeting coordinator writing follow-up emails in Hungarian.'),
        new HumanMessage(emailPrompt)
      ])
      
      return response.content as string
    } catch (error) {
      console.error('Error generating follow-up email:', error)
      throw new Error('Failed to generate follow-up email')
    }
  }
  
  /**
   * Validate and score action items
   */
  validateActionItems(actionItems: ActionItem[]): {
    valid: ActionItem[]
    invalid: Array<{ item: ActionItem; issues: string[] }>
    score: number
  } {
    const valid: ActionItem[] = []
    const invalid: Array<{ item: ActionItem; issues: string[] }> = []
    
    for (const item of actionItems) {
      const issues: string[] = []
      
      // Check for vague language
      const vagueTerms = ['valamikor', 'esetleg', 'talán', 'körülbelül']
      if (vagueTerms.some(term => item.text.toLowerCase().includes(term))) {
        issues.push('Contains vague language')
      }
      
      // Check for missing assignee on high priority items
      if (item.priority === 'high' && !item.assignee) {
        issues.push('High priority item missing assignee')
      }
      
      // Check for actionability
      const actionVerbs = ['készít', 'elküld', 'megír', 'felméri', 'elemez', 'megbeszél', 'dönt']
      if (!actionVerbs.some(verb => item.text.includes(verb))) {
        issues.push('May not be actionable - missing clear action verb')
      }
      
      if (issues.length === 0) {
        valid.push(item)
      } else {
        invalid.push({ item, issues })
      }
    }
    
    // Calculate quality score
    const score = valid.length / (valid.length + invalid.length) * 100
    
    return { valid, invalid, score: Math.round(score) }
  }
}

// Export singleton instance with OpenAI as default
export const actionItemExtractor = new ActionItemExtractor('openai')