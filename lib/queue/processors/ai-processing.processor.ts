import { Worker, Job } from 'bullmq'
import { createClient } from '@/lib/supabase/server'
import { Anthropic } from '@anthropic-ai/sdk'
import { QUEUE_NAMES, WORKER_SETTINGS } from '../config'
import { auditLogger } from '@/lib/security/audit-logger'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface AIProcessingJobData {
  meetingId: string
  userId: string
  organizationId: string
  type: 'summary' | 'action-items' | 'insights'
  transcript: string
  metadata?: Record<string, any>
}

async function processAI(job: Job<AIProcessingJobData>) {
  const { meetingId, userId, organizationId, type, transcript, metadata } = job.data
  
  try {
    await job.updateProgress(10)
    
    let prompt: string
    let systemPrompt = 'You are a professional meeting assistant specialized in Hungarian business meetings.'
    
    switch (type) {
      case 'summary':
        prompt = `Készíts egy strukturált összefoglalót az alábbi meeting átíratról magyarul:

${transcript}

Az összefoglalónak tartalmaznia kell:
1. Főbb témák és megbeszélt pontok
2. Hozott döntések
3. Következő lépések
4. Résztvevők főbb hozzászólásai`
        break
        
      case 'action-items':
        prompt = `Azonosítsd és listázd ki az összes teendőt az alábbi meeting átíratból:

${transcript}

Minden teendőnél add meg:
- A teendő leírását
- Felelős személy (ha említésre került)
- Határidő (ha említésre került)
- Prioritás (sürgős/fontos/normál)`
        break
        
      case 'insights':
        prompt = `Elemezd az alábbi meeting átíratot és adj üzleti betekintéseket:

${transcript}

Fókuszálj:
- Kulcs üzleti döntésekre
- Azonosított kockázatokra
- Lehetőségekre
- Stratégiai irányokra`
        break
        
      default:
        throw new Error(`Unknown AI processing type: ${type}`)
    }
    
    await job.updateProgress(30)
    
    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    })
    
    await job.updateProgress(70)
    
    const result = response.content[0].type === 'text' ? response.content[0].text : ''
    
    // Update meeting in database
    const supabase = await createClient()
    
    const updateData: any = {}
    switch (type) {
      case 'summary':
        updateData.summary = result
        break
      case 'action-items':
        updateData.action_items = parseActionItems(result)
        break
      case 'insights':
        updateData.metadata = {
          ...(metadata || {}),
          insights: result,
          insights_generated_at: new Date().toISOString(),
        }
        break
    }
    
    await job.updateProgress(90)
    
    const { error: updateError } = await supabase
      .from('meetings')
      .update(updateData)
      .eq('id', meetingId)
    
    if (updateError) throw updateError
    
    // Log successful processing
    await auditLogger.log({
      user_id: userId,
      organization_id: organizationId,
      action: `ai.${type}.complete`,
      resource_type: 'meeting',
      resource_id: meetingId,
      metadata: {
        type,
        tokens_used: response.usage.output_tokens,
      },
    })
    
    await job.updateProgress(100)
    
    return {
      success: true,
      meetingId,
      type,
      tokensUsed: response.usage.output_tokens,
    }
    
  } catch (error) {
    await auditLogger.log({
      user_id: userId,
      organization_id: organizationId,
      action: `ai.${type}.failed`,
      resource_type: 'meeting',
      resource_id: meetingId,
      status: 'failure',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    })
    
    throw error
  }
}

function parseActionItems(text: string): any[] {
  // Basic parsing - in production, use more sophisticated parsing
  const lines = text.split('\n').filter(line => line.trim())
  const actionItems = []
  
  for (const line of lines) {
    if (line.includes('-') || line.includes('•')) {
      const item = line.replace(/^[-•]\s*/, '').trim()
      actionItems.push({
        text: item,
        completed: false,
        created_at: new Date().toISOString(),
      })
    }
  }
  
  return actionItems
}

// Create worker
export const aiProcessingWorker = new Worker(
  QUEUE_NAMES.AI_PROCESSING,
  processAI,
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    ...WORKER_SETTINGS[QUEUE_NAMES.AI_PROCESSING],
  }
)

// Worker event handlers
aiProcessingWorker.on('completed', (job) => {
  console.log(`AI processing completed for meeting ${job.data.meetingId} (${job.data.type})`)
})

aiProcessingWorker.on('failed', (job, err) => {
  console.error(`AI processing failed for meeting ${job?.data.meetingId}:`, err)
})