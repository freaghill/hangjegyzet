import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/nav'
import { DashboardHeader } from '@/components/dashboard/header'
import { HelpWidget } from '@/components/help/help-widget'
import { InteractiveTour } from '@/components/help/interactive-tour'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile for tour status
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="flex">
        <DashboardNav />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
      
      {/* Help widget - always visible */}
      <HelpWidget />
      
      {/* Interactive tour - only for new users */}
      {!profile?.onboarding_completed && (
        <InteractiveTour autoStart={true} />
      )}
    </div>
  )
}