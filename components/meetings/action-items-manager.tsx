'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Plus,
  Calendar as CalendarIcon,
  User,
  Flag,
  CheckCircle2,
  Circle,
  AlertCircle,
  Edit2,
  Trash2,
  Send,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface ActionItem {
  id: string
  meeting_id: string
  text: string
  assignee_id?: string
  assignee?: {
    id: string
    email: string
    full_name: string
  }
  due_date?: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
  created_by: string
}

interface ActionItemsManagerProps {
  meetingId: string
  organizationId: string
  participants: Array<{ id: string; name: string; email: string }>
  canEdit: boolean
}

export function ActionItemsManager({
  meetingId,
  organizationId,
  participants,
  canEdit,
}: ActionItemsManagerProps) {
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newItem, setNewItem] = useState({
    text: '',
    assignee_id: '',
    due_date: undefined as Date | undefined,
    priority: 'medium' as const,
  })
  const supabase = createClient()

  useEffect(() => {
    loadActionItems()

    // Subscribe to changes
    const subscription = supabase
      .channel(`action_items:${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'action_items',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          loadActionItems()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [meetingId])

  async function loadActionItems() {
    const { data, error } = await supabase
      .from('action_items')
      .select(`
        *,
        assignee:profiles!action_items_assignee_id_fkey(
          id,
          email,
          full_name
        )
      `)
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setActionItems(data as any)
    }
    setLoading(false)
  }

  async function addActionItem() {
    if (!newItem.text.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('action_items')
      .insert({
        meeting_id: meetingId,
        text: newItem.text,
        assignee_id: newItem.assignee_id || null,
        due_date: newItem.due_date?.toISOString() || null,
        priority: newItem.priority,
        status: 'pending',
        created_by: user?.id,
      })

    if (!error) {
      setNewItem({
        text: '',
        assignee_id: '',
        due_date: undefined,
        priority: 'medium',
      })
      setIsAdding(false)
      loadActionItems()
      
      // Send notification to assignee
      if (newItem.assignee_id) {
        await sendAssignmentNotification(newItem.assignee_id, newItem.text)
      }
    }
  }

  async function updateActionItem(id: string, updates: Partial<ActionItem>) {
    const { error } = await supabase
      .from('action_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (!error) {
      setEditingId(null)
      loadActionItems()
      
      // Send notification if assignee changed
      if (updates.assignee_id) {
        const item = actionItems.find(i => i.id === id)
        if (item && updates.assignee_id !== item.assignee_id) {
          await sendAssignmentNotification(updates.assignee_id, item.text)
        }
      }
    }
  }

  async function deleteActionItem(id: string) {
    const { error } = await supabase
      .from('action_items')
      .delete()
      .eq('id', id)

    if (!error) {
      loadActionItems()
    }
  }

  async function sendAssignmentNotification(userId: string, task: string) {
    // This would integrate with the notification system
    // For now, just a placeholder
    console.log(`Notification sent to ${userId} for task: ${task}`)
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'medium':
        return <Flag className="w-4 h-4 text-yellow-500" />
      case 'low':
        return <Flag className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'in_progress':
        return <Circle className="w-4 h-4 text-blue-500" />
      default:
        return <Circle className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Feladatok</span>
          {canEdit && (
            <Button
              size="sm"
              onClick={() => setIsAdding(true)}
              disabled={isAdding}
            >
              <Plus className="w-4 h-4 mr-1" />
              Új feladat
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          A megbeszélésen meghatározott teendők és felelősök
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Add new item form */}
        {isAdding && (
          <div className="mb-4 p-4 border rounded-lg space-y-3">
            <Input
              placeholder="Feladat leírása..."
              value={newItem.text}
              onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
              autoFocus
            />
            
            <div className="flex gap-2">
              <Select
                value={newItem.assignee_id}
                onValueChange={(value) => setNewItem({ ...newItem, assignee_id: value })}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Felelős kiválasztása" />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newItem.due_date ? (
                      format(newItem.due_date, 'yyyy. MM. dd.', { locale: hu })
                    ) : (
                      'Határidő'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newItem.due_date}
                    onSelect={(date) => setNewItem({ ...newItem, due_date: date })}
                    initialFocus
                    locale={hu}
                  />
                </PopoverContent>
              </Popover>

              <Select
                value={newItem.priority}
                onValueChange={(value: any) => setNewItem({ ...newItem, priority: value })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Alacsony</SelectItem>
                  <SelectItem value="medium">Közepes</SelectItem>
                  <SelectItem value="high">Magas</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={addActionItem} disabled={!newItem.text.trim()}>
                <Send className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Mégse
              </Button>
            </div>
          </div>
        )}

        {/* Action items list */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Betöltés...</div>
        ) : actionItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Még nincsenek feladatok meghatározva
          </div>
        ) : (
          <div className="space-y-2">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  item.status === 'completed' && "bg-gray-50 opacity-75"
                )}
              >
                <Checkbox
                  checked={item.status === 'completed'}
                  onCheckedChange={(checked) =>
                    updateActionItem(item.id, {
                      status: checked ? 'completed' : 'pending',
                    })
                  }
                  disabled={!canEdit}
                />

                {getStatusIcon(item.status)}
                {getPriorityIcon(item.priority)}

                <div className="flex-1">
                  {editingId === item.id ? (
                    <Input
                      value={item.text}
                      onChange={(e) =>
                        setActionItems(items =>
                          items.map(i =>
                            i.id === item.id ? { ...i, text: e.target.value } : i
                          )
                        )
                      }
                      onBlur={() => {
                        updateActionItem(item.id, { text: item.text })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateActionItem(item.id, { text: item.text })
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <p
                      className={cn(
                        "text-sm",
                        item.status === 'completed' && "line-through"
                      )}
                    >
                      {item.text}
                    </p>
                  )}
                </div>

                {item.assignee && (
                  <Badge variant="secondary" className="gap-1">
                    <User className="w-3 h-3" />
                    {item.assignee.full_name}
                  </Badge>
                )}

                {item.due_date && (
                  <Badge
                    variant={
                      new Date(item.due_date) < new Date() && item.status !== 'completed'
                        ? 'destructive'
                        : 'outline'
                    }
                    className="gap-1"
                  >
                    <CalendarIcon className="w-3 h-3" />
                    {format(new Date(item.due_date), 'MM.dd.', { locale: hu })}
                  </Badge>
                )}

                {canEdit && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(item.id)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteActionItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}