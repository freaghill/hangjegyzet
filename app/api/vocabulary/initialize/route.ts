import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VocabularyEnhancedTranscription } from '@/lib/transcription/vocabulary-enhanced'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if vocabulary already exists for the organization
    const { data: existingTerms } = await supabase
      .from('vocabulary_terms')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .limit(1)

    if (existingTerms && existingTerms.length > 0) {
      return NextResponse.json({ 
        message: 'Vocabulary already initialized',
        initialized: true 
      })
    }

    // Initialize default vocabulary
    const vocabularyEnhancer = new VocabularyEnhancedTranscription()
    await vocabularyEnhancer.initializeForOrganization(
      profile.organization_id,
      user.id
    )

    return NextResponse.json({ 
      success: true,
      message: 'Default vocabulary initialized successfully'
    })
  } catch (error) {
    console.error('Error initializing vocabulary:', error)
    return NextResponse.json(
      { error: 'Failed to initialize vocabulary' },
      { status: 500 }
    )
  }
}