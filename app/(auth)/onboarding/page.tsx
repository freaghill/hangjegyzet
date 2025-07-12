'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { Logo } from '@/components/ui/logo'

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user already completed onboarding
      const { data: onboarding } = await supabase
        .from('user_onboarding')
        .select('completed_at')
        .eq('user_id', user.id)
        .single()

      if (onboarding?.completed_at) {
        router.push('/dashboard')
        return
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to check onboarding status:', error)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="absolute top-8 left-8">
        <Logo variant="full" size="md" />
      </div>
      
      <div className="flex items-center justify-center min-h-screen p-4">
        <OnboardingFlow onComplete={() => router.push('/dashboard')} />
      </div>
    </div>
  )
}