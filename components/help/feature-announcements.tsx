'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, TrendingUp, Zap, Gift } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

interface Announcement {
  id: string
  title: string
  description: string
  type: 'feature' | 'tip' | 'improvement' | 'promotion'
  icon?: string
  action?: {
    label: string
    href: string
  }
  validUntil?: string
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'google-drive-sync',
    title: 'Új: Google Drive szinkronizálás',
    description: 'Automatikusan feldolgozzuk a Google Drive-ba feltöltött hangfájlokat.',
    type: 'feature',
    action: {
      label: 'Beállítás',
      href: '/dashboard/settings/integrations',
    },
  },
  {
    id: 'branded-exports',
    title: 'Márkajelzéses PDF exportok',
    description: 'Testreszabhatja a PDF exportok megjelenését a cége arculatával.',
    type: 'feature',
    action: {
      label: 'Testreszabás',
      href: '/dashboard/settings/branding',
    },
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Tipp: Billentyűparancsok',
    description: 'Használja a Ctrl+K kombinációt a gyors kereséshez és navigációhoz.',
    type: 'tip',
  },
  {
    id: 'precision-mode',
    title: 'Jobb pontosság precíz móddal',
    description: 'A precíz feldolgozási mód 97%+ pontosságot biztosít szakmai megbeszéléseknél.',
    type: 'improvement',
  },
]

export function FeatureAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    loadDismissedAnnouncements()
  }, [])

  useEffect(() => {
    // Filter out dismissed announcements
    const activeAnnouncements = ANNOUNCEMENTS.filter(
      (a) => !dismissedIds.includes(a.id)
    )
    setAnnouncements(activeAnnouncements)
  }, [dismissedIds])

  const loadDismissedAnnouncements = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .single()
        
        if (profile?.settings?.dismissedAnnouncements) {
          setDismissedIds(profile.settings.dismissedAnnouncements)
        }
      }
    } catch (error) {
      console.error('Failed to load dismissed announcements:', error)
    }
  }

  const dismissAnnouncement = async (id: string) => {
    const newDismissedIds = [...dismissedIds, id]
    setDismissedIds(newDismissedIds)
    
    // Save to database
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await supabase
          .from('profiles')
          .update({
            settings: {
              dismissedAnnouncements: newDismissedIds,
            },
          })
          .eq('id', user.id)
      }
    } catch (error) {
      console.error('Failed to save dismissed announcement:', error)
    }
  }

  const nextAnnouncement = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length)
  }

  if (announcements.length === 0) return null

  const current = announcements[currentIndex]
  if (!current) return null

  const getIcon = (type: string) => {
    switch (type) {
      case 'feature':
        return <Sparkles className="h-5 w-5 text-blue-500" />
      case 'improvement':
        return <TrendingUp className="h-5 w-5 text-green-500" />
      case 'tip':
        return <Zap className="h-5 w-5 text-yellow-500" />
      case 'promotion':
        return <Gift className="h-5 w-5 text-purple-500" />
      default:
        return <Sparkles className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-4 right-4 z-50 max-w-sm"
      >
        <Card className="shadow-lg border-2">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {getIcon(current.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">{current.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {current.description}
                </p>
                
                <div className="flex items-center gap-2">
                  {current.action && (
                    <Button
                      size="sm"
                      variant="default"
                      asChild
                    >
                      <a href={current.action.href}>
                        {current.action.label}
                      </a>
                    </Button>
                  )}
                  
                  {announcements.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={nextAnnouncement}
                    >
                      Következő ({currentIndex + 1}/{announcements.length})
                    </Button>
                  )}
                </div>
              </div>
              
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => dismissAnnouncement(current.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

// Progress-based tips that appear as users reach milestones
export function ProgressTips() {
  const [userStats, setUserStats] = useState({
    meetingsCount: 0,
    exportCount: 0,
    collaboratorsCount: 0,
  })
  const [shownTips, setShownTips] = useState<string[]>([])

  useEffect(() => {
    loadUserStats()
  }, [])

  const loadUserStats = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get user statistics
        const { data: meetings } = await supabase
          .from('meetings')
          .select('count')
          .eq('created_by', user.id)
        
        const { data: exports } = await supabase
          .from('meeting_exports')
          .select('count')
          .eq('exported_by', user.id)
        
        setUserStats({
          meetingsCount: meetings?.[0]?.count || 0,
          exportCount: exports?.[0]?.count || 0,
          collaboratorsCount: 0, // Would need to query organization members
        })
      }
    } catch (error) {
      console.error('Failed to load user stats:', error)
    }
  }

  // Define milestone tips
  const tips = [
    {
      id: 'first-meeting',
      condition: userStats.meetingsCount === 1,
      title: 'Gratulálunk az első meetinghez!',
      description: 'Tipp: Próbálja ki a különböző feldolgozási módokat a legjobb eredményért.',
    },
    {
      id: '5-meetings',
      condition: userStats.meetingsCount === 5,
      title: 'Már 5 meetinget feldolgozott!',
      description: 'Használja a keresést, hogy gyorsan megtalálja a fontos részleteket.',
    },
    {
      id: 'first-export',
      condition: userStats.exportCount === 1,
      title: 'Első sikeres exportálás!',
      description: 'Testreszabhatja az exportokat a szervezete arculatával.',
    },
  ]

  const currentTip = tips.find(
    (tip) => tip.condition && !shownTips.includes(tip.id)
  )

  if (!currentTip) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-20 right-4 z-40"
    >
      <Card className="max-w-sm shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Gift className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-sm mb-1">{currentTip.title}</h4>
              <p className="text-sm text-muted-foreground">
                {currentTip.description}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => setShownTips([...shownTips, currentTip.id])}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}