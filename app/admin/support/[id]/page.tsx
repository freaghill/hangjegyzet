'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  Building,
  FileAudio,
  Clock,
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow, format } from 'date-fns'
import { hu } from 'date-fns/locale'

interface TicketDetail {
  id: string
  user_id: string
  organization_id: string
  meeting_id?: string
  type: string
  status: string
  priority: string
  subject: string
  description: string
  created_at: string
  updated_at: string
  resolution?: string
  user?: {
    email: string
    full_name: string
    id: string
  }
  organization?: {
    name: string
    plan: string
  }
  meeting?: {
    title: string
    created_at: string
    status: string
  }
  comments?: Comment[]
}

interface Comment {
  id: string
  ticket_id: string
  user_id: string
  content: string
  is_internal: boolean
  created_at: string
  user?: {
    email: string
    full_name: string
    role: string
  }
}

export default function SupportTicketDetailPage() {
  const params = useParams()
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      loadTicket()
    }
  }, [params.id])

  async function loadTicket() {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        user:profiles!support_tickets_user_id_fkey(id, email, full_name),
        organization:organizations!support_tickets_organization_id_fkey(name, plan),
        meeting:meetings!support_tickets_meeting_id_fkey(title, created_at, status),
        comments:support_comments(
          *,
          user:profiles!support_comments_user_id_fkey(email, full_name, role)
        )
      `)
      .eq('id', params.id)
      .single()

    if (!error && data) {
      setTicket(data as any)
    }
    setLoading(false)
  }

  async function updateTicketStatus(newStatus: string) {
    const { error } = await supabase
      .from('support_tickets')
      .update({ 
        status: newStatus, 
        updated_at: new Date().toISOString(),
        resolution: newStatus === 'resolved' ? newComment || 'Resolved by admin' : undefined
      })
      .eq('id', params.id)

    if (!error) {
      loadTicket()
    }
  }

  async function addComment(isInternal: boolean = false) {
    if (!newComment.trim() || !ticket) return

    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('support_comments')
      .insert({
        ticket_id: ticket.id,
        user_id: user?.id,
        content: newComment,
        is_internal: isInternal,
      })

    if (!error) {
      setNewComment('')
      loadTicket()
    }
    setSubmitting(false)
  }

  async function runDiagnostics() {
    if (!ticket?.meeting_id) return

    // Check meeting status and logs
    const { data: meeting } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', ticket.meeting_id)
      .single()

    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('resource_id', ticket.meeting_id)
      .eq('resource_type', 'meeting')
      .order('created_at', { ascending: false })
      .limit(10)

    const diagnosticInfo = `
Diagnostic Report:
==================
Meeting Status: ${meeting?.status || 'Unknown'}
Processing Mode: ${meeting?.processing_mode || 'N/A'}
Duration: ${meeting?.duration_seconds ? `${Math.round(meeting.duration_seconds / 60)} minutes` : 'Unknown'}
File URL: ${meeting?.file_url ? 'Present' : 'Missing'}
Transcript: ${meeting?.transcript ? 'Generated' : 'Not generated'}

Recent Activity:
${logs?.map(log => `- ${log.action} at ${format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}`).join('\n') || 'No logs found'}
    `

    setNewComment(diagnosticInfo)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ticket not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => window.location.href = '/admin/support'}
        >
          ← Back to Support
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header */}
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold">{ticket.subject}</h1>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{ticket.type.replace('_', ' ')}</Badge>
                  <Badge variant={ticket.priority === 'urgent' ? 'destructive' : 'default'}>
                    {ticket.priority}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-sm font-medium">
                  {format(new Date(ticket.created_at), 'yyyy-MM-dd HH:mm')}
                </p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {ticket.resolution && (
              <>
                <Separator className="my-4" />
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="font-medium text-green-900 mb-1">Resolution</p>
                  <p className="text-green-800">{ticket.resolution}</p>
                </div>
              </>
            )}
          </Card>

          {/* Comments */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comments
            </h2>
            
            <div className="space-y-4 mb-6">
              {ticket.comments?.map((comment) => (
                <div key={comment.id} className={`p-4 rounded-lg ${
                  comment.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {comment.user?.full_name || comment.user?.email}
                      </p>
                      {comment.user?.role === 'admin' && (
                        <Badge variant="secondary" className="text-xs">Admin</Badge>
                      )}
                      {comment.is_internal && (
                        <Badge variant="warning" className="text-xs">Internal</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.created_at), { 
                        addSuffix: true,
                        locale: hu 
                      })}
                    </p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                disabled={submitting}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => addComment(false)}
                  disabled={!newComment.trim() || submitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to Customer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => addComment(true)}
                  disabled={!newComment.trim() || submitting}
                >
                  Add Internal Note
                </Button>
                {ticket.meeting_id && (
                  <Button
                    variant="outline"
                    onClick={runDiagnostics}
                  >
                    Run Diagnostics
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Ticket Status</h3>
            <Select value={ticket.status} onValueChange={updateTicketStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Open
                  </div>
                </SelectItem>
                <SelectItem value="in_progress">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    In Progress
                  </div>
                </SelectItem>
                <SelectItem value="resolved">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Resolved
                  </div>
                </SelectItem>
                <SelectItem value="closed">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-gray-500" />
                    Closed
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {/* Customer Info */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Customer Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">User</p>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{ticket.user?.full_name}</p>
                    <p className="text-xs text-gray-500">{ticket.user?.email}</p>
                  </div>
                </div>
              </div>
              
              {ticket.organization && (
                <div>
                  <p className="text-sm text-gray-500">Organization</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Building className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{ticket.organization.name}</p>
                      <p className="text-xs text-gray-500">{ticket.organization.plan} plan</p>
                    </div>
                  </div>
                </div>
              )}

              {ticket.meeting && (
                <div>
                  <p className="text-sm text-gray-500">Related Meeting</p>
                  <div className="flex items-center gap-2 mt-1">
                    <FileAudio className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{ticket.meeting.title}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(ticket.meeting.created_at), 'yyyy-MM-dd')}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {ticket.meeting.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = `/admin/users?search=${ticket.user?.email}`}
              >
                <User className="w-4 h-4 mr-2" />
                View User Profile
              </Button>
              {ticket.organization_id && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.location.href = `/admin/organizations/${ticket.organization_id}`}
                >
                  <Building className="w-4 h-4 mr-2" />
                  View Organization
                </Button>
              )}
              {ticket.meeting_id && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.location.href = `/dashboard/meetings/${ticket.meeting_id}`}
                >
                  <FileAudio className="w-4 h-4 mr-2" />
                  View Meeting
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}