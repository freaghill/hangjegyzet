import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface Annotation {
  id: string
  meeting_id: string
  user_id: string
  timestamp_seconds: number
  content: string
  is_action_item: boolean
  created_at: string
  updated_at: string
  user?: {
    name: string
    avatar_url?: string
  }
  thread_count?: number
  mentions?: string[]
}

export interface AnnotationThread {
  id: string
  annotation_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user?: {
    name: string
    avatar_url?: string
  }
  mentions?: string[]
}

export interface MeetingPresence {
  user_id: string
  current_position?: number
  last_seen: string
  user?: {
    name: string
    avatar_url?: string
  }
}

export interface AnnotationMention {
  id: string
  annotation_id?: string
  thread_id?: string
  mentioned_user_id: string
  mentioned_by_user_id: string
  notified: boolean
  created_at: string
}

export class AnnotationManager {
  private supabase = createClient()
  private channels: Map<string, RealtimeChannel> = new Map()
  
  // Subscribe to real-time updates for a meeting
  subscribeToMeeting(
    meetingId: string,
    callbacks: {
      onAnnotationAdded?: (annotation: Annotation) => void
      onAnnotationUpdated?: (annotation: Annotation) => void
      onAnnotationDeleted?: (id: string) => void
      onThreadAdded?: (thread: AnnotationThread) => void
      onPresenceUpdate?: (presence: MeetingPresence[]) => void
    }
  ): () => void {
    // Unsubscribe from existing channel if any
    this.unsubscribeFromMeeting(meetingId)
    
    const channel = this.supabase
      .channel(`meeting-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'annotations',
          filter: `meeting_id=eq.${meetingId}`
        },
        async (payload) => {
          if (callbacks.onAnnotationAdded) {
            const annotation = await this.enrichAnnotation(payload.new as Annotation)
            callbacks.onAnnotationAdded(annotation)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'annotations',
          filter: `meeting_id=eq.${meetingId}`
        },
        async (payload) => {
          if (callbacks.onAnnotationUpdated) {
            const annotation = await this.enrichAnnotation(payload.new as Annotation)
            callbacks.onAnnotationUpdated(annotation)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'annotations',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          if (callbacks.onAnnotationDeleted) {
            callbacks.onAnnotationDeleted(payload.old.id)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'annotation_threads'
        },
        async (payload) => {
          const thread = payload.new as AnnotationThread
          // Check if thread belongs to an annotation in this meeting
          const { data: annotation } = await this.supabase
            .from('annotations')
            .select('meeting_id')
            .eq('id', thread.annotation_id)
            .single()
            
          if (annotation?.meeting_id === meetingId && callbacks.onThreadAdded) {
            const enrichedThread = await this.enrichThread(thread)
            callbacks.onThreadAdded(enrichedThread)
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        if (callbacks.onPresenceUpdate) {
          const state = channel.presenceState()
          const presenceList: MeetingPresence[] = Object.values(state)
            .flat()
            .map((presence: any) => ({
              user_id: presence.user_id,
              current_position: presence.current_position,
              last_seen: new Date().toISOString(),
              user: presence.user
            }))
          callbacks.onPresenceUpdate(presenceList)
        }
      })
      .subscribe()
    
    this.channels.set(meetingId, channel)
    
    // Return unsubscribe function
    return () => this.unsubscribeFromMeeting(meetingId)
  }
  
  // Unsubscribe from a meeting's real-time updates
  unsubscribeFromMeeting(meetingId: string) {
    const channel = this.channels.get(meetingId)
    if (channel) {
      channel.unsubscribe()
      this.channels.delete(meetingId)
    }
  }
  
  // Track user presence in a meeting
  async trackPresence(meetingId: string, userId: string, currentPosition?: number) {
    const channel = this.channels.get(meetingId)
    if (channel) {
      const { data: user } = await this.supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', userId)
        .single()
      
      await channel.track({
        user_id: userId,
        current_position: currentPosition,
        user: user
      })
    }
    
    // Also update database presence
    await this.supabase
      .from('meeting_presence')
      .upsert({
        meeting_id: meetingId,
        user_id: userId,
        current_position: currentPosition,
        last_seen: new Date().toISOString()
      }, {
        onConflict: 'meeting_id,user_id'
      })
  }
  
  // Get all annotations for a meeting
  async getAnnotations(meetingId: string): Promise<Annotation[]> {
    const { data, error } = await this.supabase
      .from('annotations')
      .select(`
        *,
        profiles!user_id (
          name,
          avatar_url
        ),
        annotation_threads (
          id
        )
      `)
      .eq('meeting_id', meetingId)
      .order('timestamp_seconds')
    
    if (error) throw error
    
    return data.map(ann => ({
      ...ann,
      user: ann.profiles,
      thread_count: ann.annotation_threads?.length || 0,
      profiles: undefined,
      annotation_threads: undefined
    }))
  }
  
  // Create a new annotation
  async createAnnotation(
    meetingId: string,
    userId: string,
    timestampSeconds: number,
    content: string,
    isActionItem: boolean = false
  ): Promise<Annotation> {
    // Extract mentions from content
    const mentions = this.extractMentions(content)
    
    const { data, error } = await this.supabase
      .from('annotations')
      .insert({
        meeting_id: meetingId,
        user_id: userId,
        timestamp_seconds: timestampSeconds,
        content: content,
        is_action_item: isActionItem
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Create mention records
    if (mentions.length > 0) {
      await this.createMentions(data.id, null, mentions, userId)
    }
    
    return this.enrichAnnotation(data)
  }
  
  // Update an annotation
  async updateAnnotation(
    annotationId: string,
    content: string,
    isActionItem?: boolean
  ): Promise<Annotation> {
    const updates: any = { content }
    if (isActionItem !== undefined) {
      updates.is_action_item = isActionItem
    }
    
    const { data, error } = await this.supabase
      .from('annotations')
      .update(updates)
      .eq('id', annotationId)
      .select()
      .single()
    
    if (error) throw error
    
    return this.enrichAnnotation(data)
  }
  
  // Delete an annotation
  async deleteAnnotation(annotationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('annotations')
      .delete()
      .eq('id', annotationId)
    
    if (error) throw error
  }
  
  // Get threads for an annotation
  async getThreads(annotationId: string): Promise<AnnotationThread[]> {
    const { data, error } = await this.supabase
      .from('annotation_threads')
      .select(`
        *,
        profiles!user_id (
          name,
          avatar_url
        )
      `)
      .eq('annotation_id', annotationId)
      .order('created_at')
    
    if (error) throw error
    
    return data.map(thread => ({
      ...thread,
      user: thread.profiles,
      profiles: undefined
    }))
  }
  
  // Add a thread to an annotation
  async addThread(
    annotationId: string,
    userId: string,
    content: string
  ): Promise<AnnotationThread> {
    // Extract mentions from content
    const mentions = this.extractMentions(content)
    
    const { data, error } = await this.supabase
      .from('annotation_threads')
      .insert({
        annotation_id: annotationId,
        user_id: userId,
        content: content
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Create mention records
    if (mentions.length > 0) {
      await this.createMentions(null, data.id, mentions, userId)
    }
    
    return this.enrichThread(data)
  }
  
  // Create action item from annotation
  async createActionItem(annotation: Annotation, assignee?: string, deadline?: string): Promise<void> {
    // Update annotation to mark as action item
    await this.updateAnnotation(annotation.id, annotation.content, true)
    
    // Add to meeting's action items
    const { data: meeting } = await this.supabase
      .from('meetings')
      .select('action_items')
      .eq('id', annotation.meeting_id)
      .single()
    
    if (meeting) {
      const actionItems = meeting.action_items || []
      actionItems.push({
        task: annotation.content,
        assignee: assignee,
        deadline: deadline,
        priority: 'medium',
        annotation_id: annotation.id
      })
      
      await this.supabase
        .from('meetings')
        .update({ action_items: actionItems })
        .eq('id', annotation.meeting_id)
    }
  }
  
  // Get users for @mention autocomplete
  async getOrganizationUsers(userId: string): Promise<Array<{ id: string; name: string; avatar_url?: string }>> {
    // Get user's organization
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()
    
    if (!profile) return []
    
    // Get all users in the organization
    const { data: users } = await this.supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('organization_id', profile.organization_id)
      .neq('id', userId) // Exclude current user
    
    return users || []
  }
  
  // Get unread mentions for a user
  async getUnreadMentions(userId: string): Promise<AnnotationMention[]> {
    const { data, error } = await this.supabase
      .from('annotation_mentions')
      .select(`
        *,
        annotations!annotation_id (
          content,
          meeting_id,
          meetings (
            title
          )
        ),
        annotation_threads!thread_id (
          content,
          annotations (
            meeting_id,
            meetings (
              title
            )
          )
        )
      `)
      .eq('mentioned_user_id', userId)
      .eq('notified', false)
    
    if (error) throw error
    return data || []
  }
  
  // Mark mentions as notified
  async markMentionsAsNotified(mentionIds: string[]): Promise<void> {
    const { error } = await this.supabase
      .from('annotation_mentions')
      .update({ notified: true })
      .in('id', mentionIds)
    
    if (error) throw error
  }
  
  // Private helper methods
  private async enrichAnnotation(annotation: Annotation): Promise<Annotation> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', annotation.user_id)
      .single()
    
    const { data: threads } = await this.supabase
      .from('annotation_threads')
      .select('id')
      .eq('annotation_id', annotation.id)
    
    return {
      ...annotation,
      user: profile || undefined,
      thread_count: threads?.length || 0,
      mentions: this.extractMentions(annotation.content)
    }
  }
  
  private async enrichThread(thread: AnnotationThread): Promise<AnnotationThread> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', thread.user_id)
      .single()
    
    return {
      ...thread,
      user: profile || undefined,
      mentions: this.extractMentions(thread.content)
    }
  }
  
  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1])
    }
    
    return [...new Set(mentions)] // Remove duplicates
  }
  
  private async createMentions(
    annotationId: string | null,
    threadId: string | null,
    mentionedNames: string[],
    mentionedByUserId: string
  ): Promise<void> {
    // Get user IDs from names
    const { data: users } = await this.supabase
      .from('profiles')
      .select('id, name')
      .in('name', mentionedNames)
    
    if (!users || users.length === 0) return
    
    const mentions = users.map(user => ({
      annotation_id: annotationId,
      thread_id: threadId,
      mentioned_user_id: user.id,
      mentioned_by_user_id: mentionedByUserId,
      notified: false
    }))
    
    await this.supabase
      .from('annotation_mentions')
      .insert(mentions)
  }
}