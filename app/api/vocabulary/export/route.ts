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
    const csv = await vocabularyManager.exportToCSV(profile.organization_id, category)

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="vocabulary-${category || 'all'}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting vocabulary:', error)
    return NextResponse.json(
      { error: 'Failed to export vocabulary' },
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as any || 'general'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (10MB limit for CSV files)
    const maxCsvSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxCsvSize) {
      return NextResponse.json(
        { 
          error: `CSV file too large. Maximum size is 10MB, received ${Math.round(file.size / 1024 / 1024)}MB` 
        },
        { status: 413 }
      )
    }

    const csvData = await file.text()
    
    const vocabularyManager = new VocabularyManager()
    const importResult = await vocabularyManager.importFromCSV(
      profile.organization_id,
      csvData,
      category,
      user.id
    )

    return NextResponse.json({ 
      success: true,
      importId: importResult.id,
      termsCount: importResult.terms_count
    })
  } catch (error) {
    console.error('Error importing vocabulary:', error)
    return NextResponse.json(
      { error: 'Failed to import vocabulary' },
      { status: 500 }
    )
  }
}

// Share vocabulary endpoint
export async function PUT(request: NextRequest) {
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
    const { name, description, category, termIds, isPublic } = body

    if (!name || !termIds || termIds.length === 0) {
      return NextResponse.json(
        { error: 'Name and terms are required' },
        { status: 400 }
      )
    }

    const vocabularyManager = new VocabularyManager()
    const sharedVocabulary = await vocabularyManager.createSharedVocabulary(
      profile.organization_id,
      name,
      description || '',
      category || 'general',
      termIds,
      isPublic || false,
      user.id
    )

    return NextResponse.json({ sharedVocabulary })
  } catch (error) {
    console.error('Error sharing vocabulary:', error)
    return NextResponse.json(
      { error: 'Failed to share vocabulary' },
      { status: 500 }
    )
  }
}

// Import shared vocabulary
export async function PATCH(request: NextRequest) {
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
    const { sharedVocabularyId } = body

    if (!sharedVocabularyId) {
      return NextResponse.json(
        { error: 'Shared vocabulary ID is required' },
        { status: 400 }
      )
    }

    const vocabularyManager = new VocabularyManager()
    const importedCount = await vocabularyManager.importSharedVocabulary(
      profile.organization_id,
      sharedVocabularyId,
      user.id
    )

    return NextResponse.json({ 
      success: true,
      importedCount
    })
  } catch (error) {
    console.error('Error importing shared vocabulary:', error)
    return NextResponse.json(
      { error: 'Failed to import shared vocabulary' },
      { status: 500 }
    )
  }
}