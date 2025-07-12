import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { miniCRM } from '@/lib/integrations/minicrm'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const type = searchParams.get('type') // 'all', 'contacts', 'companies', 'projects'

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

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

    if (!profile) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Get MiniCRM integration
    const { data: integration } = await supabase
      .from('minicrm_integrations')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .single()

    if (!integration) {
      return NextResponse.json(
        { error: 'MiniCRM integration not found' },
        { status: 404 }
      )
    }

    // Get fresh tokens
    const { accessToken, refreshToken, expiryDate } = await miniCRM.getFreshTokens(
      integration.system_id,
      integration.access_token,
      integration.refresh_token,
      integration.token_expiry
    )

    // Update tokens if refreshed
    if (refreshToken !== integration.refresh_token || expiryDate) {
      await supabase
        .from('minicrm_integrations')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expiry: expiryDate?.toISOString(),
        })
        .eq('id', integration.id)
    }

    // Search based on type
    let results
    switch (type) {
      case 'contacts':
        results = {
          contacts: await miniCRM.searchContacts(
            integration.system_id,
            accessToken,
            query
          ),
          companies: [],
          projects: [],
        }
        break
      case 'companies':
        results = {
          contacts: [],
          companies: await miniCRM.searchCompanies(
            integration.system_id,
            accessToken,
            query
          ),
          projects: [],
        }
        break
      case 'projects':
        results = {
          contacts: [],
          companies: [],
          projects: await miniCRM.searchProjects(
            integration.system_id,
            accessToken,
            query
          ),
        }
        break
      default:
        results = await miniCRM.searchAll(
          integration.system_id,
          accessToken,
          query
        )
    }

    // Cache results
    const cachePromises = []
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Cache contacts
    for (const contact of results.contacts) {
      cachePromises.push(
        supabase
          .from('minicrm_entity_cache')
          .upsert({
            organization_id: profile.organization_id,
            entity_type: 'contact',
            entity_id: contact.Id,
            name: contact.Name,
            email: contact.Email,
            phone: contact.Phone,
            additional_data: contact,
            expires_at: expiresAt.toISOString(),
          }, {
            onConflict: 'organization_id,entity_type,entity_id'
          })
      )
    }

    // Cache companies
    for (const company of results.companies) {
      cachePromises.push(
        supabase
          .from('minicrm_entity_cache')
          .upsert({
            organization_id: profile.organization_id,
            entity_type: 'company',
            entity_id: company.Id,
            name: company.Name,
            email: company.Email,
            phone: company.Phone,
            additional_data: company,
            expires_at: expiresAt.toISOString(),
          }, {
            onConflict: 'organization_id,entity_type,entity_id'
          })
      )
    }

    // Cache projects
    for (const project of results.projects) {
      cachePromises.push(
        supabase
          .from('minicrm_entity_cache')
          .upsert({
            organization_id: profile.organization_id,
            entity_type: 'project',
            entity_id: project.Id,
            name: project.Name,
            additional_data: project,
            expires_at: expiresAt.toISOString(),
          }, {
            onConflict: 'organization_id,entity_type,entity_id'
          })
      )
    }

    // Execute cache updates in parallel
    await Promise.all(cachePromises)

    return NextResponse.json(results)
  } catch (error) {
    console.error('MiniCRM search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

// Detect entities in meeting transcript
export async function POST(request: NextRequest) {
  try {
    const { meetingId } = await request.json()

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get meeting details
    const { data: meeting } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single()

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Get MiniCRM integration
    const { data: integration } = await supabase
      .from('minicrm_integrations')
      .select('*')
      .eq('organization_id', meeting.organization_id)
      .eq('is_active', true)
      .single()

    if (!integration) {
      return NextResponse.json({
        detected: [],
        matched: [],
      })
    }

    // Detect entities in transcript
    const transcriptText = meeting.transcript?.text || ''
    const detectedEntities = miniCRM.detectEntitiesInText(transcriptText)

    // Store detected entities
    const detectedPromises = detectedEntities.map(entity =>
      supabase
        .from('minicrm_detected_entities')
        .insert({
          meeting_id: meetingId,
          entity_type: entity.type,
          entity_value: entity.value,
          start_position: entity.startPosition,
          end_position: entity.endPosition,
          context: transcriptText.substring(
            Math.max(0, entity.startPosition - 50),
            Math.min(transcriptText.length, entity.endPosition + 50)
          ),
        })
    )

    await Promise.all(detectedPromises)

    // Get fresh tokens
    const { accessToken } = await miniCRM.getFreshTokens(
      integration.system_id,
      integration.access_token,
      integration.refresh_token,
      integration.token_expiry
    )

    // Try to match detected entities with CRM data
    const matchedEntities = []

    for (const entity of detectedEntities) {
      if (entity.type === 'email') {
        // Search for contacts by email
        try {
          const contacts = await miniCRM.searchContacts(
            integration.system_id,
            accessToken,
            entity.value
          )
          if (contacts.length > 0) {
            matchedEntities.push({
              ...entity,
              matched: {
                type: 'contact',
                id: contacts[0].Id,
                name: contacts[0].Name,
              },
            })
          }
        } catch (error) {
          console.error('Error searching contacts:', error)
        }
      } else if (entity.type === 'company') {
        // Search for companies by name
        try {
          const companies = await miniCRM.searchCompanies(
            integration.system_id,
            accessToken,
            entity.value
          )
          if (companies.length > 0) {
            matchedEntities.push({
              ...entity,
              matched: {
                type: 'company',
                id: companies[0].Id,
                name: companies[0].Name,
              },
            })
          }
        } catch (error) {
          console.error('Error searching companies:', error)
        }
      }
    }

    // Update matched entities in database
    for (const matched of matchedEntities) {
      await supabase
        .from('minicrm_detected_entities')
        .update({
          matched_entity_type: matched.matched.type,
          matched_entity_id: matched.matched.id,
          matched_at: new Date().toISOString(),
        })
        .eq('meeting_id', meetingId)
        .eq('entity_value', matched.value)
    }

    return NextResponse.json({
      detected: detectedEntities,
      matched: matchedEntities,
    })
  } catch (error) {
    console.error('Entity detection error:', error)
    return NextResponse.json(
      { error: 'Entity detection failed' },
      { status: 500 }
    )
  }
}