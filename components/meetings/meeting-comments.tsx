'use client'

import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MessageSquare, Send, Pin, MoreVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { hu } from 'date-fns/locale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Comment {
  id: string
  meeting_id: string
  user_id: string
  parent_id?: string
  content: string
  mentions: string[]
  is_pinned: boolean
  created_at: string
  updated_at: string
  user: {
    id: string
    email: string
    full_name: string
    avatar_url?: string
  }
  replies?: Comment[]
}

interface MeetingCommentsProps {
  meetingId: string
  currentUserId: string
  participants: Array<{ id: string; name: string; email: string }>
}

export function MeetingComments({ 
  meetingId, 
  currentUserId,
  participants 
}: MeetingCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()
  
  // Initialize editor with mentions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: 'Írjon megjegyzést... @ használatával említhet meg valakit',
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: {
          items: ({ query }) => {
            return participants
              .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 5)
          },
          render: () => {
            let component: any
            let popup: any
            
            return {
              onStart: props => {
                // Simple dropdown for mentions
                const items = props.items.map((item: any) => `
                  <button class="mention-item" data-id="${item.id}">
                    ${item.name} (${item.email})
                  </button>
                `).join('')
                
                popup = document.createElement('div')
                popup.className = 'mention-dropdown'
                popup.innerHTML = items
                document.body.appendChild(popup)
                
                // Position dropdown
                const rect = props.clientRect()
                popup.style.position = 'absolute'
                popup.style.left = `${rect.left}px`
                popup.style.top = `${rect.bottom + 5}px`
                
                // Handle clicks
                popup.addEventListener('click', (e: any) => {
                  if (e.target.classList.contains('mention-item')) {
                    const id = e.target.dataset.id
                    const item = props.items.find((i: any) => i.id === id)
                    if (item) props.command(item)
                  }
                })
              },
              onUpdate: props => {
                if (popup) {
                  const items = props.items.map((item: any) => `
                    <button class="mention-item" data-id="${item.id}">
                      ${item.name} (${item.email})
                    </button>
                  `).join('')
                  popup.innerHTML = items
                }
              },
              onKeyDown: props => {
                if (props.event.key === 'Escape') {
                  popup?.remove()
                  return true
                }
                return false
              },
              onExit: () => {
                popup?.remove()
              },
            }
          },
        },
      }),
    ],
    content: '',
  })
  
  useEffect(() => {
    loadComments()
    
    // Subscribe to new comments
    const subscription = supabase
      .channel(`comments:${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_comments',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          loadComments()
        }
      )
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [meetingId])
  
  async function loadComments() {
    const { data, error } = await supabase
      .from('meeting_comments')
      .select(`
        *,
        user:profiles!meeting_comments_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('meeting_id', meetingId)
      .is('parent_id', null)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      // Load replies for each comment
      const commentsWithReplies = await Promise.all(
        data.map(async (comment) => {
          const { data: replies } = await supabase
            .from('meeting_comments')
            .select(`
              *,
              user:profiles!meeting_comments_user_id_fkey(
                id,
                email,
                full_name,
                avatar_url
              )
            `)
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true })
          
          return { ...comment, replies: replies || [] }
        })
      )
      
      setComments(commentsWithReplies as any)
    }
    setLoading(false)
  }
  
  async function submitComment(parentId?: string) {
    if (!editor || editor.isEmpty || submitting) return
    
    setSubmitting(true)
    
    const content = editor.getHTML()
    const mentions = extractMentions(content)
    
    const { error } = await supabase
      .from('meeting_comments')
      .insert({
        meeting_id: meetingId,
        user_id: currentUserId,
        parent_id: parentId,
        content,
        mentions,
      })
    
    if (!error) {
      editor.commands.clearContent()
      loadComments()
      
      // Send notifications to mentioned users
      if (mentions.length > 0) {
        // This would trigger notification system
      }
    }
    
    setSubmitting(false)
  }
  
  async function togglePin(commentId: string, currentlyPinned: boolean) {
    await supabase
      .from('meeting_comments')
      .update({ is_pinned: !currentlyPinned })
      .eq('id', commentId)
    
    loadComments()
  }
  
  async function deleteComment(commentId: string) {
    await supabase
      .from('meeting_comments')
      .delete()
      .eq('id', commentId)
    
    loadComments()
  }
  
  function extractMentions(html: string): string[] {
    const regex = /data-id="([^"]+)"/g
    const matches = []
    let match
    while ((match = regex.exec(html)) !== null) {
      matches.push(match[1])
    }
    return matches
  }
  
  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-12' : ''} mb-4`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user.avatar_url} />
          <AvatarFallback>{comment.user.full_name[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{comment.user.full_name}</span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.created_at), { 
                addSuffix: true, 
                locale: hu 
              })}
            </span>
            {comment.is_pinned && (
              <Badge variant="secondary" className="text-xs">
                <Pin className="w-3 h-3 mr-1" />
                Kitűzve
              </Badge>
            )}
          </div>
          
          <div 
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: comment.content }}
          />
          
          <div className="flex items-center gap-2 mt-2">
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  // Focus reply editor
                }}
              >
                Válasz
              </Button>
            )}
            
            {comment.user_id === currentUserId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {!isReply && (
                    <DropdownMenuItem onClick={() => togglePin(comment.id, comment.is_pinned)}>
                      {comment.is_pinned ? 'Kitűzés megszüntetése' : 'Kitűzés'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => deleteComment(comment.id)}
                  >
                    Törlés
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4">
              {comment.replies.map(reply => (
                <CommentItem key={reply.id} comment={reply} isReply />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Megjegyzések
          {comments.length > 0 && (
            <Badge variant="secondary">{comments.length}</Badge>
          )}
        </h3>
      </div>
      
      <Separator />
      
      {/* Comment input */}
      <div className="space-y-3">
        <div className="border rounded-lg p-3 min-h-[100px]">
          <EditorContent editor={editor} className="prose prose-sm max-w-none" />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => submitComment()}
            disabled={!editor || editor.isEmpty || submitting}
          >
            <Send className="w-4 h-4 mr-2" />
            Küldés
          </Button>
        </div>
      </div>
      
      {/* Comments list */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Betöltés...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Még nincsenek megjegyzések. Legyen Ön az első!
          </div>
        ) : (
          comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  )
}

// Add styles for mentions
const style = document.createElement('style')
style.textContent = `
  .mention {
    background-color: #e3f2fd;
    color: #1976d2;
    padding: 2px 4px;
    border-radius: 4px;
    font-weight: 500;
  }
  
  .mention-dropdown {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
  }
  
  .mention-item {
    display: block;
    width: 100%;
    padding: 8px 12px;
    text-align: left;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 14px;
  }
  
  .mention-item:hover {
    background-color: #f5f5f5;
  }
`
document.head.appendChild(style)