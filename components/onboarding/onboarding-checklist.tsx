'use client'

import { useState, useEffect } from 'react'
import { Check, Circle, ChevronRight, Trophy, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface ChecklistItem {
  id: string
  title: string
  description: string
  action: {
    label: string
    href?: string
    onClick?: () => void
  }
  completed: boolean
  icon?: React.ReactNode
}

export function OnboardingChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadChecklistProgress()
  }, [])

  const loadChecklistProgress = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Check various completion states
      const [
        { data: meetings },
        { data: exports },
        { data: integrations },
        { data: profile },
        { data: orgMembers },
      ] = await Promise.all([
        supabase.from('meetings').select('count').eq('created_by', user.id),
        supabase.from('meeting_exports').select('count').eq('exported_by', user.id),
        supabase.from('user_integrations').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('organization_members').select('count').eq('invited_by', user.id),
      ])

      const checklistItems: ChecklistItem[] = [
        {
          id: 'profile',
          title: 'Profil befejezése',
          description: 'Adja meg a nevét és profilképét',
          action: {
            label: 'Profil szerkesztése',
            href: '/dashboard/settings/profile',
          },
          completed: !!(profile?.full_name && profile?.avatar_url),
          icon: <Circle className="h-4 w-4" />,
        },
        {
          id: 'first-meeting',
          title: 'Első meeting feltöltése',
          description: 'Töltsön fel egy hangfájlt feldolgozásra',
          action: {
            label: 'Meeting feltöltése',
            href: '/dashboard/meetings/upload',
          },
          completed: (meetings?.[0]?.count || 0) > 0,
          icon: <Zap className="h-4 w-4" />,
        },
        {
          id: 'google-drive',
          title: 'Google Drive összekapcsolása',
          description: 'Automatikus szinkronizálás beállítása',
          action: {
            label: 'Összekapcsolás',
            href: '/dashboard/settings/integrations',
          },
          completed: integrations?.some((i: any) => i.provider === 'google'),
          icon: <Circle className="h-4 w-4" />,
        },
        {
          id: 'first-export',
          title: 'Első exportálás',
          description: 'Exportáljon egy meetinget PDF-be',
          action: {
            label: 'Exportálás',
            href: '/dashboard/meetings',
          },
          completed: (exports?.[0]?.count || 0) > 0,
          icon: <Circle className="h-4 w-4" />,
        },
        {
          id: 'invite-team',
          title: 'Csapattag meghívása',
          description: 'Dolgozzon együtt másokkal',
          action: {
            label: 'Meghívás küldése',
            href: '/dashboard/settings/team',
          },
          completed: (orgMembers?.[0]?.count || 0) > 0,
          icon: <Circle className="h-4 w-4" />,
        },
        {
          id: 'tour',
          title: 'Interaktív bemutató',
          description: 'Ismerje meg a főbb funkciókat',
          action: {
            label: 'Bemutató indítása',
            onClick: () => {
              // Trigger the interactive tour
              window.dispatchEvent(new Event('start-tour'))
            },
          },
          completed: profile?.onboarding_completed?.includes('tour'),
          icon: <Circle className="h-4 w-4" />,
        },
      ]

      setItems(checklistItems)
      
      // Auto-collapse if more than 50% complete
      const completedCount = checklistItems.filter(item => item.completed).length
      if (completedCount / checklistItems.length > 0.5) {
        setIsExpanded(false)
      }
    } catch (error) {
      console.error('Failed to load checklist progress:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markItemComplete = async (itemId: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Update profile with completed item
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

      const completed = profile?.onboarding_completed || []
      if (!completed.includes(itemId)) {
        completed.push(itemId)
        
        await supabase
          .from('profiles')
          .update({ onboarding_completed: completed })
          .eq('id', user.id)
      }

      // Update local state
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, completed: true } : item
      ))
    } catch (error) {
      console.error('Failed to mark item complete:', error)
    }
  }

  if (isLoading) {
    return null
  }

  const completedCount = items.filter(item => item.completed).length
  const progress = (completedCount / items.length) * 100
  const allCompleted = completedCount === items.length

  // Don't show if all completed and collapsed
  if (allCompleted && !isExpanded) {
    return null
  }

  return (
    <Card className={cn(
      'transition-all duration-300',
      isExpanded ? 'w-full' : 'w-64'
    )}>
      <CardHeader 
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {allCompleted ? (
              <Trophy className="h-5 w-5 text-yellow-500" />
            ) : (
              <div className="relative">
                <Progress value={progress} className="h-10 w-10 rounded-full" />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                  {completedCount}/{items.length}
                </span>
              </div>
            )}
            <CardTitle className="text-base">
              {allCompleted ? 'Onboarding befejezve! 🎉' : 'Kezdeti lépések'}
            </CardTitle>
          </div>
          <ChevronRight 
            className={cn(
              'h-4 w-4 transition-transform',
              isExpanded ? 'rotate-90' : ''
            )}
          />
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0">
              <div className="space-y-3">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg transition-colors',
                      item.completed ? 'bg-muted/50' : 'hover:bg-muted/30'
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {item.completed ? (
                        <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className={cn(
                        'font-medium text-sm',
                        item.completed && 'line-through text-muted-foreground'
                      )}>
                        {item.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    
                    {!item.completed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (item.action.onClick) {
                            item.action.onClick()
                            markItemComplete(item.id)
                          } else if (item.action.href) {
                            window.location.href = item.action.href
                          }
                        }}
                      >
                        {item.action.label}
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
              
              {!allCompleted && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    Fejezze be az összes lépést, hogy kihasználja a platform minden funkcióját
                  </p>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}