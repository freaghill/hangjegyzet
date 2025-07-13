import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ExportOptions } from '@/lib/export/types'
import { getExportTemplate } from '@/lib/export/templates'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const options: ExportOptions = await request.json()

    // Fetch meeting data
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        *,
        meeting_templates (
          id,
          name,
          template_type,
          sections
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Fetch organization branding
    const { data: userOrg } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    let branding = null
    if (userOrg?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, branding, contact_email, contact_phone, website, address')
        .eq('id', userOrg.organization_id)
        .single()

      if (org) {
        branding = {
          companyName: org.name,
          ...org.branding,
          contactInfo: {
            email: org.contact_email,
            phone: org.contact_phone,
            website: org.website,
            address: org.address,
            ...org.branding?.contactInfo
          }
        }
      }
    }

    // Get template configuration
    const template = getExportTemplate(options.template)
    const styles = {
      legal: {
        primary: '#1a365d',
        secondary: '#2d3748',
        headerBg: '#f7fafc',
        borderColor: '#e2e8f0'
      },
      medical: {
        primary: '#047857',
        secondary: '#064e3b',
        headerBg: '#ecfdf5',
        borderColor: '#d1fae5'
      },
      business: {
        primary: branding?.primaryColor || '#2563eb',
        secondary: branding?.secondaryColor || '#64748b',
        headerBg: '#f3f4f6',
        borderColor: '#e5e7eb'
      },
      custom: {
        primary: branding?.primaryColor || '#2563eb',
        secondary: branding?.secondaryColor || '#64748b',
        headerBg: '#f3f4f6',
        borderColor: '#e5e7eb'
      }
    }[options.template]

    // Generate preview HTML
    let html = `
      <div style="font-family: ${branding?.fontFamily || 'Arial, sans-serif'}; color: #1f2937; line-height: 1.6;">
    `

    // Header with branding
    if (options.includeBranding && branding) {
      html += `
        <div style="margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid ${styles.borderColor};">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.companyName}" style="height: 3rem; margin-bottom: 0.5rem;">` : ''}
              <h1 style="font-size: 1.5rem; font-weight: bold; color: ${styles.primary}; margin: 0;">
                ${branding.companyName}
              </h1>
            </div>
            ${options.includeBranding && branding.includeContactInfo ? `
              <div style="text-align: right; font-size: 0.875rem; color: ${styles.secondary};">
                ${branding.contactInfo?.email ? `<p style="margin: 0;">${branding.contactInfo.email}</p>` : ''}
                ${branding.contactInfo?.phone ? `<p style="margin: 0;">${branding.contactInfo.phone}</p>` : ''}
                ${branding.contactInfo?.website ? `<p style="margin: 0;">${branding.contactInfo.website}</p>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      `
    }

    // Document title
    html += `
      <div style="margin-bottom: 2rem;">
        <h2 style="font-size: 1.875rem; font-weight: bold; color: ${styles.primary}; margin: 0 0 0.5rem 0;">
          ${meeting.title}
        </h2>
    `

    // Metadata
    if (options.includeMetadata) {
      const duration = Math.floor(meeting.duration_seconds / 60)
      html += `
        <div style="display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.875rem; color: ${styles.secondary};">
          <span>📅 ${format(new Date(meeting.created_at), 'yyyy. MMMM d.', { locale: hu })}</span>
          <span>⏱️ ${duration} perc</span>
          <span>👥 ${meeting.speakers?.length || 0} résztvevő</span>
        </div>
      `
    }
    html += `</div>`

    // Template-specific headers
    if (options.template === 'legal') {
      html += `
        <div style="margin-bottom: 1.5rem; padding: 1rem; background-color: ${styles.headerBg}; border: 1px solid ${styles.borderColor}; border-radius: 0.375rem;">
          <p style="font-weight: 600; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; color: ${styles.primary}; margin: 0;">
            Bizalmas dokumentum
          </p>
          <p style="font-size: 0.75rem; margin-top: 0.25rem; color: ${styles.secondary};">
            Ez a dokumentum bizalmas információkat tartalmaz és kizárólag a címzett számára készült.
          </p>
        </div>
      `
    } else if (options.template === 'medical') {
      html += `
        <div style="margin-bottom: 1.5rem; padding: 1rem; background-color: ${styles.headerBg}; border: 1px solid ${styles.borderColor}; border-radius: 0.375rem;">
          <p style="font-weight: 600; font-size: 0.875rem; color: ${styles.primary}; margin: 0;">
            Egészségügyi dokumentum - GDPR védett
          </p>
          <p style="font-size: 0.75rem; margin-top: 0.25rem; color: ${styles.secondary};">
            Ez a dokumentum egészségügyi adatokat tartalmaz, kezelése a GDPR előírásai szerint történik.
          </p>
        </div>
      `
    }

    // Summary
    if (options.includeSummary && meeting.summary) {
      html += `
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.25rem; font-weight: 600; color: ${styles.primary}; margin: 0 0 0.75rem 0;">
            Összefoglaló
          </h3>
          <p style="color: ${styles.secondary}; margin: 0;">
            ${meeting.summary}
          </p>
        </div>
      `
    }

    // Action items (preview only first 3)
    if (options.includeActionItems && meeting.action_items?.length > 0) {
      html += `
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.25rem; font-weight: 600; color: ${styles.primary}; margin: 0 0 0.75rem 0;">
            Akció pontok
          </h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
      `
      
      meeting.action_items.slice(0, 3).forEach((item: any) => {
        html += `
          <li style="display: flex; align-items: start; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="color: ${styles.primary};">•</span>
            <div>
              <p style="margin: 0; color: ${styles.secondary};">${item.task}</p>
              ${item.assignee ? `<p style="font-size: 0.875rem; margin: 0.25rem 0 0 0; color: ${styles.secondary};">Felelős: ${item.assignee}</p>` : ''}
            </div>
          </li>
        `
      })
      
      if (meeting.action_items.length > 3) {
        html += `
          <li style="font-size: 0.875rem; font-style: italic; color: ${styles.secondary}; margin-top: 0.5rem;">
            ... és további ${meeting.action_items.length - 3} akció pont
          </li>
        `
      }
      
      html += `</ul></div>`
    }

    // Transcript preview
    if (options.includeTranscript) {
      html += `
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.25rem; font-weight: 600; color: ${styles.primary}; margin: 0 0 0.75rem 0;">
            Átírat
          </h3>
          <p style="font-size: 0.875rem; font-style: italic; color: ${styles.secondary}; margin: 0;">
            A teljes átírat az exportált dokumentumban lesz elérhető...
          </p>
        </div>
      `
    }

    // Footer
    if (branding?.footerText) {
      html += `
        <div style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid ${styles.borderColor}; text-align: center; font-size: 0.875rem; color: ${styles.secondary};">
          <p style="margin: 0;">${branding.footerText}</p>
        </div>
      `
    }

    html += `</div>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    })
  } catch (error) {
    console.error('Preview generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}