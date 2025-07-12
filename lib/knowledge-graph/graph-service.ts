import { createClient } from '@/lib/supabase/server'

export interface GraphNode {
  id: string
  name: string
  type: 'meeting' | 'person' | 'topic' | 'action_item' | 'decision' | 'organization'
  group: number
  size: number
  metadata?: Record<string, any>
}

export interface GraphLink {
  source: string
  target: string
  type: 'participated' | 'assigned' | 'mentioned' | 'related' | 'decided' | 'created'
  value: number
  metadata?: Record<string, any>
}

export interface KnowledgeGraph {
  nodes: GraphNode[]
  links: GraphLink[]
  metadata: {
    totalMeetings: number
    totalParticipants: number
    totalTopics: number
    totalActionItems: number
    dateRange: {
      from: Date
      to: Date
    }
  }
}

export class KnowledgeGraphService {
  private supabase: any

  constructor() {
    this.initializeSupabase()
  }

  private async initializeSupabase() {
    this.supabase = await createClient()
  }

  /**
   * Build knowledge graph for organization
   */
  async buildOrganizationGraph(
    organizationId: string,
    options?: {
      dateFrom?: Date
      dateTo?: Date
      includeTranscripts?: boolean
      minConnections?: number
    }
  ): Promise<KnowledgeGraph> {
    const nodes = new Map<string, GraphNode>()
    const links: GraphLink[] = []
    
    // Add organization as root node
    nodes.set(`org_${organizationId}`, {
      id: `org_${organizationId}`,
      name: 'Organization',
      type: 'organization',
      group: 0,
      size: 50
    })

    // Get meetings
    let meetingsQuery = this.supabase
      .from('meetings')
      .select(`
        *,
        meeting_participants(name, email),
        meeting_action_items(text, assignee_name, priority, status),
        meeting_ai_summaries(key_points, decisions, insights)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'completed')

    if (options?.dateFrom) {
      meetingsQuery = meetingsQuery.gte('created_at', options.dateFrom.toISOString())
    }
    if (options?.dateTo) {
      meetingsQuery = meetingsQuery.lte('created_at', options.dateTo.toISOString())
    }

    const { data: meetings, error } = await meetingsQuery

    if (error || !meetings) return this.getEmptyGraph()

    // Process meetings
    for (const meeting of meetings) {
      const meetingId = `meeting_${meeting.id}`
      
      // Add meeting node
      nodes.set(meetingId, {
        id: meetingId,
        name: meeting.title,
        type: 'meeting',
        group: 1,
        size: 20 + Math.min(meeting.duration_seconds / 3600, 10),
        metadata: {
          date: meeting.created_at,
          duration: meeting.duration_seconds,
          participantCount: meeting.meeting_participants?.length || 0
        }
      })

      // Link meeting to organization
      links.push({
        source: `org_${organizationId}`,
        target: meetingId,
        type: 'created',
        value: 1
      })

      // Process participants
      const participantMap = new Map<string, number>()
      for (const participant of meeting.meeting_participants || []) {
        const participantId = `person_${participant.email || participant.name}`
        
        if (!nodes.has(participantId)) {
          nodes.set(participantId, {
            id: participantId,
            name: participant.name,
            type: 'person',
            group: 2,
            size: 10,
            metadata: {
              email: participant.email,
              meetingCount: 1
            }
          })
        } else {
          const node = nodes.get(participantId)!
          node.size = Math.min(node.size + 2, 30)
          node.metadata.meetingCount++
        }

        // Link participant to meeting
        links.push({
          source: participantId,
          target: meetingId,
          type: 'participated',
          value: 1
        })

        participantMap.set(participantId, (participantMap.get(participantId) || 0) + 1)
      }

      // Create connections between participants who were in the same meeting
      const participantIds = Array.from(participantMap.keys())
      for (let i = 0; i < participantIds.length; i++) {
        for (let j = i + 1; j < participantIds.length; j++) {
          const existingLink = links.find(
            l => (l.source === participantIds[i] && l.target === participantIds[j]) ||
                 (l.source === participantIds[j] && l.target === participantIds[i])
          )
          
          if (existingLink) {
            existingLink.value++
          } else {
            links.push({
              source: participantIds[i],
              target: participantIds[j],
              type: 'related',
              value: 1
            })
          }
        }
      }

      // Process topics from AI summary
      const topics = meeting.metadata?.topics || []
      const keyPoints = meeting.meeting_ai_summaries?.[0]?.key_points || []
      
      const allTopics = [...new Set([...topics, ...this.extractTopicsFromKeyPoints(keyPoints)])]
      
      for (const topic of allTopics) {
        const topicId = `topic_${topic.toLowerCase().replace(/\s+/g, '_')}`
        
        if (!nodes.has(topicId)) {
          nodes.set(topicId, {
            id: topicId,
            name: topic,
            type: 'topic',
            group: 3,
            size: 8,
            metadata: {
              mentionCount: 1
            }
          })
        } else {
          const node = nodes.get(topicId)!
          node.size = Math.min(node.size + 1, 20)
          node.metadata.mentionCount++
        }

        // Link topic to meeting
        links.push({
          source: meetingId,
          target: topicId,
          type: 'mentioned',
          value: 1
        })
      }

      // Process action items
      for (const actionItem of meeting.meeting_action_items || []) {
        const actionId = `action_${actionItem.text.substring(0, 20).replace(/\s+/g, '_')}_${meeting.id}`
        
        nodes.set(actionId, {
          id: actionId,
          name: actionItem.text.substring(0, 50) + (actionItem.text.length > 50 ? '...' : ''),
          type: 'action_item',
          group: 4,
          size: actionItem.priority === 'high' ? 12 : actionItem.priority === 'medium' ? 10 : 8,
          metadata: {
            fullText: actionItem.text,
            priority: actionItem.priority,
            status: actionItem.status,
            assignee: actionItem.assignee_name
          }
        })

        // Link action item to meeting
        links.push({
          source: meetingId,
          target: actionId,
          type: 'created',
          value: 1
        })

        // Link to assignee if exists
        if (actionItem.assignee_name) {
          const assigneeId = `person_${actionItem.assignee_name}`
          if (nodes.has(assigneeId)) {
            links.push({
              source: assigneeId,
              target: actionId,
              type: 'assigned',
              value: 2
            })
          }
        }
      }

      // Process decisions
      const decisions = meeting.meeting_ai_summaries?.[0]?.decisions || []
      for (const decision of decisions) {
        const decisionId = `decision_${decision.substring(0, 20).replace(/\s+/g, '_')}_${meeting.id}`
        
        nodes.set(decisionId, {
          id: decisionId,
          name: decision.substring(0, 50) + (decision.length > 50 ? '...' : ''),
          type: 'decision',
          group: 5,
          size: 10,
          metadata: {
            fullText: decision,
            meetingTitle: meeting.title
          }
        })

        // Link decision to meeting
        links.push({
          source: meetingId,
          target: decisionId,
          type: 'decided',
          value: 2
        })
      }
    }

    // Filter nodes based on minimum connections if specified
    if (options?.minConnections) {
      const connectionCount = new Map<string, number>()
      
      links.forEach(link => {
        connectionCount.set(link.source, (connectionCount.get(link.source) || 0) + 1)
        connectionCount.set(link.target, (connectionCount.get(link.target) || 0) + 1)
      })
      
      const filteredNodeIds = new Set<string>()
      nodes.forEach((node, id) => {
        if (node.type === 'organization' || (connectionCount.get(id) || 0) >= options.minConnections) {
          filteredNodeIds.add(id)
        }
      })
      
      // Filter nodes and links
      const filteredNodes = Array.from(nodes.values()).filter(n => filteredNodeIds.has(n.id))
      const filteredLinks = links.filter(l => 
        filteredNodeIds.has(l.source) && filteredNodeIds.has(l.target)
      )
      
      return {
        nodes: filteredNodes,
        links: filteredLinks,
        metadata: {
          totalMeetings: meetings.length,
          totalParticipants: nodes.size,
          totalTopics: Array.from(nodes.values()).filter(n => n.type === 'topic').length,
          totalActionItems: Array.from(nodes.values()).filter(n => n.type === 'action_item').length,
          dateRange: {
            from: options?.dateFrom || new Date(meetings[meetings.length - 1]?.created_at || Date.now()),
            to: options?.dateTo || new Date(meetings[0]?.created_at || Date.now())
          }
        }
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      links,
      metadata: {
        totalMeetings: meetings.length,
        totalParticipants: nodes.size,
        totalTopics: Array.from(nodes.values()).filter(n => n.type === 'topic').length,
        totalActionItems: Array.from(nodes.values()).filter(n => n.type === 'action_item').length,
        dateRange: {
          from: options?.dateFrom || new Date(meetings[meetings.length - 1]?.created_at || Date.now()),
          to: options?.dateTo || new Date(meetings[0]?.created_at || Date.now())
        }
      }
    }
  }

  /**
   * Build relationship graph for a specific person
   */
  async buildPersonGraph(
    organizationId: string,
    personIdentifier: string
  ): Promise<KnowledgeGraph> {
    const nodes = new Map<string, GraphNode>()
    const links: GraphLink[] = []

    // Get all meetings where person participated
    const { data: meetings } = await this.supabase
      .from('meetings')
      .select(`
        *,
        meeting_participants(name, email),
        meeting_action_items(text, assignee_name, priority, status)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .or(`meeting_participants.email.eq.${personIdentifier},meeting_participants.name.eq.${personIdentifier}`)

    if (!meetings) return this.getEmptyGraph()

    // Add person as center node
    const personId = `person_${personIdentifier}`
    nodes.set(personId, {
      id: personId,
      name: personIdentifier,
      type: 'person',
      group: 2,
      size: 30,
      metadata: {
        meetingCount: meetings.length
      }
    })

    // Process meetings and connections
    const coParticipants = new Map<string, number>()
    
    for (const meeting of meetings) {
      // Add meeting node
      const meetingId = `meeting_${meeting.id}`
      nodes.set(meetingId, {
        id: meetingId,
        name: meeting.title,
        type: 'meeting',
        group: 1,
        size: 15,
        metadata: {
          date: meeting.created_at
        }
      })

      // Link person to meeting
      links.push({
        source: personId,
        target: meetingId,
        type: 'participated',
        value: 2
      })

      // Track co-participants
      for (const participant of meeting.meeting_participants || []) {
        if (participant.email !== personIdentifier && participant.name !== personIdentifier) {
          const coParticipantId = participant.email || participant.name
          coParticipants.set(coParticipantId, (coParticipants.get(coParticipantId) || 0) + 1)
        }
      }

      // Add assigned action items
      for (const actionItem of meeting.meeting_action_items || []) {
        if (actionItem.assignee_name === personIdentifier) {
          const actionId = `action_${actionItem.text.substring(0, 20).replace(/\s+/g, '_')}_${meeting.id}`
          
          nodes.set(actionId, {
            id: actionId,
            name: actionItem.text.substring(0, 50) + (actionItem.text.length > 50 ? '...' : ''),
            type: 'action_item',
            group: 4,
            size: 10,
            metadata: {
              priority: actionItem.priority,
              status: actionItem.status
            }
          })

          links.push({
            source: personId,
            target: actionId,
            type: 'assigned',
            value: 3
          })
        }
      }
    }

    // Add top co-participants
    const topCoParticipants = Array.from(coParticipants.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    for (const [participantId, count] of topCoParticipants) {
      const nodeId = `person_${participantId}`
      nodes.set(nodeId, {
        id: nodeId,
        name: participantId,
        type: 'person',
        group: 2,
        size: 10 + Math.min(count * 2, 20),
        metadata: {
          sharedMeetings: count
        }
      })

      links.push({
        source: personId,
        target: nodeId,
        type: 'related',
        value: count
      })
    }

    return {
      nodes: Array.from(nodes.values()),
      links,
      metadata: {
        totalMeetings: meetings.length,
        totalParticipants: nodes.size,
        totalTopics: 0,
        totalActionItems: Array.from(nodes.values()).filter(n => n.type === 'action_item').length,
        dateRange: {
          from: new Date(meetings[meetings.length - 1]?.created_at || Date.now()),
          to: new Date(meetings[0]?.created_at || Date.now())
        }
      }
    }
  }

  /**
   * Extract topics from key points using simple NLP
   */
  private extractTopicsFromKeyPoints(keyPoints: string[]): string[] {
    const topics: string[] = []
    const stopWords = new Set(['a', 'az', 'és', 'vagy', 'de', 'hogy', 'nem', 'is', 'volt', 'van'])
    
    for (const point of keyPoints) {
      // Extract potential topics (2-3 word phrases)
      const words = point.toLowerCase().split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word))
      
      for (let i = 0; i < words.length - 1; i++) {
        if (words[i].length > 4 && words[i + 1].length > 4) {
          topics.push(`${words[i]} ${words[i + 1]}`)
        }
      }
    }
    
    return [...new Set(topics)].slice(0, 5)
  }

  private getEmptyGraph(): KnowledgeGraph {
    return {
      nodes: [],
      links: [],
      metadata: {
        totalMeetings: 0,
        totalParticipants: 0,
        totalTopics: 0,
        totalActionItems: 0,
        dateRange: {
          from: new Date(),
          to: new Date()
        }
      }
    }
  }
}

export const knowledgeGraphService = new KnowledgeGraphService()