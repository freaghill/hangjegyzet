import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInsightGenerator } from '@/lib/realtime/insight-generator'
import { headers } from 'next/headers'

export const runtime = 'nodejs'

// Server-Sent Events for live insights streaming
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const meetingId = request.nextUrl.searchParams.get('meetingId')
    const stream = request.nextUrl.searchParams.get('stream') === 'true'
    
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID required' },
        { status: 400 }
      )
    }
    
    // Verify user has access to the meeting
    const { data: meeting } = await supabase
      .from('meetings')
      .select('organization_id')
      .eq('id', meetingId)
      .single()
    
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.organization_id !== meeting.organization_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    const insightGenerator = getInsightGenerator()
    
    if (stream) {
      // Set up Server-Sent Events for live streaming
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        start(controller) {
          // Send initial data
          const summary = insightGenerator.getSummary()
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'initial',
              summary
            })}\n\n`)
          )
          
          // Set up insight listener
          const onInsight = (insight: any) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'insight',
                insight
              })}\n\n`)
            )
          }
          
          insightGenerator.on('insight:generated', onInsight)
          
          // Send heartbeat every 30 seconds
          const heartbeat = setInterval(() => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'heartbeat',
                timestamp: Date.now()
              })}\n\n`)
            )
          }, 30000)
          
          // Clean up on close
          request.signal.addEventListener('abort', () => {
            insightGenerator.off('insight:generated', onInsight)
            clearInterval(heartbeat)
            controller.close()
          })
        }
      })
      
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    }
    
    // Return current insights and summary
    const summary = insightGenerator.getSummary()
    const recentInsights = insightGenerator.getRecentInsights(20)
    
    return NextResponse.json({
      meetingId,
      summary,
      insights: recentInsights,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Get insights error:', error)
    return NextResponse.json(
      { error: 'Failed to get insights' },
      { status: 500 }
    )
  }
}

// POST - Generate specific insights on demand
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { meetingId, type, params } = body
    
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID required' },
        { status: 400 }
      )
    }
    
    // Verify access
    const { data: meeting } = await supabase
      .from('meetings')
      .select('organization_id, transcript')
      .eq('id', meetingId)
      .single()
    
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.organization_id !== meeting.organization_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    const insightGenerator = getInsightGenerator()
    
    switch (type) {
      case 'keyword-analysis':
        const { keywords } = params || {}
        if (!keywords || !Array.isArray(keywords)) {
          return NextResponse.json(
            { error: 'Keywords array required' },
            { status: 400 }
          )
        }
        
        // Analyze specific keywords in transcript
        const keywordResults = analyzeKeywords(meeting.transcript, keywords)
        
        return NextResponse.json({
          type: 'keyword-analysis',
          results: keywordResults
        })
      
      case 'topic-timeline':
        // Generate topic timeline
        const topicTimeline = generateTopicTimeline(meeting.transcript)
        
        return NextResponse.json({
          type: 'topic-timeline',
          timeline: topicTimeline
        })
      
      case 'interaction-matrix':
        // Generate participant interaction matrix
        const matrix = generateInteractionMatrix(meeting.transcript)
        
        return NextResponse.json({
          type: 'interaction-matrix',
          matrix
        })
      
      case 'energy-analysis':
        // Analyze meeting energy over time
        const energyData = analyzeMeetingEnergy(meeting.transcript)
        
        return NextResponse.json({
          type: 'energy-analysis',
          data: energyData
        })
      
      case 'summary':
        // Get comprehensive summary
        const summary = insightGenerator.getSummary()
        
        return NextResponse.json({
          type: 'summary',
          summary
        })
      
      default:
        return NextResponse.json(
          { error: 'Invalid insight type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Generate insights error:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}

// Helper functions for insight generation

function analyzeKeywords(
  transcript: any[],
  keywords: string[]
): Record<string, any> {
  const results: Record<string, any> = {}
  
  for (const keyword of keywords) {
    const occurrences = []
    let totalCount = 0
    
    for (const entry of transcript) {
      const text = entry.text.toLowerCase()
      const keywordLower = keyword.toLowerCase()
      
      if (text.includes(keywordLower)) {
        totalCount++
        occurrences.push({
          speaker: entry.speaker,
          text: entry.text,
          timestamp: entry.timestamp,
          context: extractContext(entry.text, keyword)
        })
      }
    }
    
    results[keyword] = {
      count: totalCount,
      occurrences: occurrences.slice(0, 10), // Limit to 10 examples
      speakers: [...new Set(occurrences.map(o => o.speaker))],
      firstMention: occurrences[0]?.timestamp,
      lastMention: occurrences[occurrences.length - 1]?.timestamp
    }
  }
  
  return results
}

function extractContext(text: string, keyword: string, contextLength: number = 50): string {
  const index = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (index === -1) return text
  
  const start = Math.max(0, index - contextLength)
  const end = Math.min(text.length, index + keyword.length + contextLength)
  
  let context = text.substring(start, end)
  if (start > 0) context = '...' + context
  if (end < text.length) context = context + '...'
  
  return context
}

function generateTopicTimeline(transcript: any[]): any[] {
  const timeline = []
  const topicWindows = []
  let currentTopics: Set<string> = new Set()
  let windowStart = 0
  
  // Topic keywords mapping
  const topicKeywords: Record<string, string[]> = {
    'budget': ['budget', 'költségvetés', 'pénz', 'money', 'ár', 'price'],
    'timeline': ['deadline', 'határidő', 'időpont', 'when', 'mikor'],
    'technical': ['technical', 'technikai', 'fejlesztés', 'development'],
    'planning': ['terv', 'plan', 'stratégia', 'strategy'],
    'team': ['team', 'csapat', 'kolléga', 'colleague']
  }
  
  for (let i = 0; i < transcript.length; i++) {
    const entry = transcript[i]
    const text = entry.text.toLowerCase()
    const detectedTopics = new Set<string>()
    
    // Detect topics in current segment
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(kw => text.includes(kw))) {
        detectedTopics.add(topic)
      }
    }
    
    // Check if topics changed significantly
    const topicsChanged = 
      detectedTopics.size !== currentTopics.size ||
      ![...detectedTopics].every(t => currentTopics.has(t))
    
    if (topicsChanged && i > 0) {
      // Save current window
      topicWindows.push({
        startTime: transcript[windowStart].timestamp,
        endTime: entry.timestamp,
        topics: [...currentTopics],
        duration: entry.timestamp - transcript[windowStart].timestamp
      })
      
      windowStart = i
      currentTopics = detectedTopics
    } else {
      // Add to current topics
      detectedTopics.forEach(t => currentTopics.add(t))
    }
  }
  
  // Save final window
  if (windowStart < transcript.length - 1) {
    topicWindows.push({
      startTime: transcript[windowStart].timestamp,
      endTime: transcript[transcript.length - 1].timestamp,
      topics: [...currentTopics],
      duration: transcript[transcript.length - 1].timestamp - transcript[windowStart].timestamp
    })
  }
  
  return topicWindows
}

function generateInteractionMatrix(transcript: any[]): any {
  const interactions: Record<string, number> = {}
  const speakers = new Set<string>()
  let lastSpeaker = ''
  
  for (const entry of transcript) {
    speakers.add(entry.speaker)
    
    if (lastSpeaker && lastSpeaker !== entry.speaker) {
      const key = [lastSpeaker, entry.speaker].sort().join('-')
      interactions[key] = (interactions[key] || 0) + 1
    }
    
    lastSpeaker = entry.speaker
  }
  
  // Build matrix
  const speakerArray = Array.from(speakers)
  const matrix: number[][] = Array(speakerArray.length)
    .fill(null)
    .map(() => Array(speakerArray.length).fill(0))
  
  for (const [interaction, count] of Object.entries(interactions)) {
    const [speaker1, speaker2] = interaction.split('-')
    const idx1 = speakerArray.indexOf(speaker1)
    const idx2 = speakerArray.indexOf(speaker2)
    
    if (idx1 >= 0 && idx2 >= 0) {
      matrix[idx1][idx2] = count
      matrix[idx2][idx1] = count
    }
  }
  
  return {
    speakers: speakerArray,
    matrix,
    totalInteractions: Object.values(interactions).reduce((a, b) => a + b, 0)
  }
}

function analyzeMeetingEnergy(transcript: any[]): any {
  const energyPoints = []
  const windowSize = 10 // Analyze 10 entries at a time
  
  for (let i = 0; i < transcript.length; i += windowSize / 2) {
    const window = transcript.slice(i, i + windowSize)
    if (window.length === 0) continue
    
    let energy = 50 // Base energy
    
    for (const entry of window) {
      // Factors that affect energy
      const exclamations = (entry.text.match(/!/g) || []).length
      const questions = (entry.text.match(/\?/g) || []).length
      const wordCount = entry.text.split(/\s+/).length
      
      energy += exclamations * 5
      energy += questions * 3
      energy += Math.min(wordCount / 20, 5)
      
      // Positive/negative words
      const positiveWords = ['great', 'excellent', 'nagyszerű', 'kiváló']
      const negativeWords = ['problem', 'issue', 'probléma', 'nehéz']
      
      for (const word of positiveWords) {
        if (entry.text.toLowerCase().includes(word)) energy += 3
      }
      
      for (const word of negativeWords) {
        if (entry.text.toLowerCase().includes(word)) energy -= 3
      }
    }
    
    energyPoints.push({
      timestamp: window[0].timestamp,
      energy: Math.max(0, Math.min(100, energy / window.length)),
      sampleSize: window.length
    })
  }
  
  // Calculate statistics
  const energyValues = energyPoints.map(p => p.energy)
  const avgEnergy = energyValues.reduce((a, b) => a + b, 0) / energyValues.length
  const maxEnergy = Math.max(...energyValues)
  const minEnergy = Math.min(...energyValues)
  
  return {
    timeline: energyPoints,
    statistics: {
      average: avgEnergy,
      max: maxEnergy,
      min: minEnergy,
      variance: energyValues.reduce((sum, val) => sum + Math.pow(val - avgEnergy, 2), 0) / energyValues.length
    }
  }
}