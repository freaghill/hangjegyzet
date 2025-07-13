import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !userOrg?.organization_id) {
      return NextResponse.json({
        companyName: '',
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        fontFamily: 'Arial, sans-serif',
        includeContactInfo: false
      })
    }

    // Fetch organization branding
    const { data: org, error } = await supabase
      .from('organizations')
      .select('name, branding, contact_email, contact_phone, website, address')
      .eq('id', userOrg.organization_id)
      .single()

    if (error || !org) {
      return NextResponse.json({
        companyName: '',
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        fontFamily: 'Arial, sans-serif',
        includeContactInfo: false
      })
    }

    const branding = {
      companyName: org.name || '',
      primaryColor: org.branding?.primaryColor || '#2563eb',
      secondaryColor: org.branding?.secondaryColor || '#64748b',
      fontFamily: org.branding?.fontFamily || 'Arial, sans-serif',
      logoUrl: org.branding?.logoUrl,
      headerText: org.branding?.headerText,
      footerText: org.branding?.footerText,
      watermark: org.branding?.watermark || false,
      includeContactInfo: org.branding?.includeContactInfo || false,
      contactInfo: {
        email: org.contact_email || org.branding?.contactInfo?.email || '',
        phone: org.contact_phone || org.branding?.contactInfo?.phone || '',
        website: org.website || org.branding?.contactInfo?.website || '',
        address: org.address || org.branding?.contactInfo?.address || ''
      }
    }

    return NextResponse.json(branding)
  } catch (error) {
    console.error('Branding fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch branding' },
      { status: 500 }
    )
  }
}