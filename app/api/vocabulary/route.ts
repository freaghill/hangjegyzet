import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VocabularyManager } from '@/lib/vocabulary/hungarian-business'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') as any

    const vocabularyManager = new VocabularyManager()
    const terms = await vocabularyManager.getTerms(profile.organization_id, category)

    return NextResponse.json({ terms })
  } catch (error) {
    console.error('Error fetching vocabulary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vocabulary' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const body = await request.json()
    const { term, variations, category, customCategory, phoneticHint, contextHints } = body

    if (!term) {
      return NextResponse.json({ error: 'Term is required' }, { status: 400 })
    }

    const vocabularyManager = new VocabularyManager()
    const newTerm = await vocabularyManager.addTerm({
      organization_id: profile.organization_id,
      term,
      variations,
      category: category || 'general',
      custom_category: customCategory,
      phonetic_hint: phoneticHint,
      context_hints: contextHints,
      created_by: user.id
    })

    return NextResponse.json({ term: newTerm })
  } catch (error) {
    console.error('Error adding vocabulary term:', error)
    return NextResponse.json(
      { error: 'Failed to add vocabulary term' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Term ID is required' }, { status: 400 })
    }

    const vocabularyManager = new VocabularyManager()
    const updatedTerm = await vocabularyManager.updateTerm(id, updates)

    return NextResponse.json({ term: updatedTerm })
  } catch (error) {
    console.error('Error updating vocabulary term:', error)
    return NextResponse.json(
      { error: 'Failed to update vocabulary term' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Term ID is required' }, { status: 400 })
    }

    const vocabularyManager = new VocabularyManager()
    await vocabularyManager.deleteTerm(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vocabulary term:', error)
    return NextResponse.json(
      { error: 'Failed to delete vocabulary term' },
      { status: 500 }
    )
  }
}