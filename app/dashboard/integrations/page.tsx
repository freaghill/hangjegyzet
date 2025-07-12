import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IntegrationsManager } from '@/components/integrations/integrations-manager'

export default async function IntegrationsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto py-8">
      <IntegrationsManager />
    </div>
  )
}