import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { templateManager } from '@/lib/templates/meeting-templates'

// GET /api/templates - Get all templates for organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
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
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get templates
    const templates = await templateManager.getTemplates(profile.organization_id)

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/templates - Create new template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { name, slug, description, sections, prompts, fields, analysis_config } = body

    // Validate required fields
    if (!name || !slug || !sections || !prompts) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, slug, sections, prompts' 
      }, { status: 400 })
    }

    // Create template
    const template = await templateManager.createTemplate(profile.organization_id, {
      organization_id: profile.organization_id,
      name,
      slug,
      description: description || null,
      is_default: false,
      is_active: true,
      template_type: 'custom',
      sections,
      prompts,
      fields: fields || {},
      analysis_config: analysis_config || {
        extractActionItems: true,
        generateSummary: true,
        identifySections: true,
        trackMetrics: true,
        customPrompts: []
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/templates - Update template
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { templateId, ...updates } = body

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    // Check if template belongs to organization
    const { data: existingTemplate } = await supabase
      .from('meeting_templates')
      .select('organization_id')
      .eq('id', templateId)
      .single()

    if (!existingTemplate || existingTemplate.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Update template
    const template = await templateManager.updateTemplate(templateId, updates)

    if (!template) {
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/templates - Delete template (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get template ID from query params
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    // Check if template belongs to organization
    const { data: existingTemplate } = await supabase
      .from('meeting_templates')
      .select('organization_id')
      .eq('id', templateId)
      .single()

    if (!existingTemplate || existingTemplate.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Delete template
    const success = await templateManager.deleteTemplate(templateId)

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}