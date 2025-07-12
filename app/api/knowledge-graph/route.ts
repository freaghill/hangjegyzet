import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { knowledgeGraphService } from '@/lib/knowledge-graph/graph-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { organizationId, viewMode, personIdentifier, minConnections } = body
    
    // Verify user has access to organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()
    
    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Build graph based on view mode
    let graph
    if (viewMode === 'person' && personIdentifier) {
      graph = await knowledgeGraphService.buildPersonGraph(organizationId, personIdentifier)
    } else {
      graph = await knowledgeGraphService.buildOrganizationGraph(organizationId, {
        minConnections
      })
    }
    
    return NextResponse.json(graph)
    
  } catch (error) {
    console.error('Knowledge graph error:', error)
    return NextResponse.json(
      { error: 'Failed to build knowledge graph' },
      { status: 500 }
    )
  }
}