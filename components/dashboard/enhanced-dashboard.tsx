'use client'

import { useEffect, useState } from 'react'
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist'
import { FeatureAnnouncements, ProgressTips } from '@/components/help/feature-announcements'
import { InteractiveTour } from '@/components/help/interactive-tour'
import { HelpWidget } from '@/components/help/help-widget'
import { createClient } from '@/lib/supabase/client'

interface EnhancedDashboardProps {
  children: React.ReactNode
}

export function EnhancedDashboard({ children }: EnhancedDashboardProps) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => {
    checkUserStatus()
  }, [])

  const checkUserStatus = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at, onboarding_completed')
        .eq('id', user.id)
        .single()

      if (profile) {
        // Check if user is new (created within last 7 days)
        const createdAt = new Date(profile.created_at)
        const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        
        setIsNewUser(daysSinceCreation < 7)
        
        // Show onboarding if user is new and hasn't completed all steps
        const hasCompletedOnboarding = profile.onboarding_completed?.length >= 6
        setShowOnboarding(daysSinceCreation < 30 && !hasCompletedOnboarding)
      }
    } catch (error) {
      console.error('Failed to check user status:', error)
    }
  }

  return (
    <>
      {/* Main dashboard content */}
      <div className="relative">
        {children}
      </div>

      {/* Onboarding checklist - shown for new users */}
      {showOnboarding && (
        <div className="fixed bottom-4 left-4 z-40 max-w-sm">
          <OnboardingChecklist />
        </div>
      )}

      {/* Feature announcements - shown to all users */}
      <FeatureAnnouncements />

      {/* Progress-based tips - shown as users hit milestones */}
      <ProgressTips />

      {/* Interactive tour - available to all users */}
      <InteractiveTour />

      {/* Help widget - always available */}
      <HelpWidget />
    </>
  )
}

// Example usage with contextual help
import { ContextualHelp, HelpContent } from '@/components/help/contextual-help'

export function DashboardWithHelp() {
  return (
    <EnhancedDashboard>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-3xl font-bold">Vezérlőpult</h1>
          <ContextualHelp 
            content="Itt láthatja a legfontosabb statisztikákat és gyorsan elérheti a főbb funkciókat."
          />
        </div>
        
        {/* Meeting upload section with help */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Meeting feltöltése</h2>
            <ContextualHelp 
              content={HelpContent.meetingUpload}
              icon="info"
            />
          </div>
          {/* Upload component */}
        </div>
        
        {/* Transcription mode selector with help */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Feldolgozási mód</h2>
            <ContextualHelp 
              content={HelpContent.transcriptionMode}
            />
          </div>
          {/* Mode selector component */}
        </div>
        
        {/* Google Drive sync with help */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Google Drive szinkronizálás</h2>
            <ContextualHelp 
              content={HelpContent.googleDriveSync}
              side="right"
            />
          </div>
          {/* Google Drive component */}
        </div>
      </div>
    </EnhancedDashboard>
  )
}