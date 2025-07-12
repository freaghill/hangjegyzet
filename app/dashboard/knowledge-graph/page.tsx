import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KnowledgeGraphViz } from '@/components/knowledge-graph/knowledge-graph-viz'

export default async function KnowledgeGraphPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tudásgráf</h1>
        <p className="text-gray-600 mt-2">
          Vizualizálja a meetingek, résztvevők és témák közötti kapcsolatokat
        </p>
      </div>

      <KnowledgeGraphViz organizationId={profile.organization_id} />
    </div>
  )
}