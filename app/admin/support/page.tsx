'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  User,
  Building,
  FileAudio,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { hu } from 'date-fns/locale'

interface SupportTicket {
  id: string
  user_id: string
  organization_id: string
  meeting_id?: string
  type: 'transcription_failed' | 'billing_issue' | 'technical_support' | 'feature_request'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  subject: string
  description: string
  created_at: string
  updated_at: string
  user?: {
    email: string
    full_name: string
  }
  organization?: {
    name: string
  }
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    loadTickets()
  }, [statusFilter, typeFilter])

  async function loadTickets() {
    setLoading(true)
    
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        user:profiles!support_tickets_user_id_fkey(email, full_name),
        organization:organizations!support_tickets_organization_id_fkey(name)
      `)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }
    
    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter)
    }

    const { data, error } = await query

    if (!error && data) {
      setTickets(data as any)
    }
    
    setLoading(false)
  }

  async function updateTicketStatus(ticketId: string, newStatus: string) {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', ticketId)

    if (!error) {
      loadTickets()
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      ticket.subject.toLowerCase().includes(searchLower) ||
      ticket.user?.email.toLowerCase().includes(searchLower) ||
      ticket.organization?.name.toLowerCase().includes(searchLower)
    )
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      open: { variant: 'destructive', icon: AlertCircle },
      in_progress: { variant: 'warning', icon: Clock },
      resolved: { variant: 'success', icon: CheckCircle },
      closed: { variant: 'secondary', icon: CheckCircle },
    }
    
    const config = variants[status] || variants.open
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      low: 'secondary',
      medium: 'default',
      high: 'warning',
      urgent: 'destructive',
    }
    
    return <Badge variant={variants[priority] as any}>{priority}</Badge>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Customer Support</h1>
        <p className="text-gray-600 mt-2">Manage support tickets and help customers</p>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by email, organization, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="transcription_failed">Transcription Failed</SelectItem>
              <SelectItem value="billing_issue">Billing Issue</SelectItem>
              <SelectItem value="technical_support">Technical Support</SelectItem>
              <SelectItem value="feature_request">Feature Request</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={loadTickets}
            variant="outline"
            size="icon"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </Card>

      {/* Tickets Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </TableCell>
              </TableRow>
            ) : filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No tickets found
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{ticket.subject}</p>
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {ticket.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">{ticket.user?.full_name}</p>
                        <p className="text-xs text-gray-500">{ticket.user?.email}</p>
                      </div>
                    </div>
                    {ticket.organization && (
                      <div className="flex items-center gap-1 mt-1">
                        <Building className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-500">{ticket.organization.name}</p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ticket.type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(ticket.priority)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(ticket.status)}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(ticket.created_at), { 
                        addSuffix: true,
                        locale: hu 
                      })}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `/admin/support/${ticket.id}`}
                      >
                        View
                      </Button>
                      {ticket.status === 'open' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateTicketStatus(ticket.id, 'in_progress')}
                        >
                          Start
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}