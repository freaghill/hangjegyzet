import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAlertEngine } from '@/lib/realtime/alert-engine'

export const runtime = 'nodejs'

// GET - Get alerts for a meeting or organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const meetingId = request.nextUrl.searchParams.get('meetingId')
    const organizationId = request.nextUrl.searchParams.get('organizationId')
    const type = request.nextUrl.searchParams.get('type') // 'alerts' or 'rules'
    
    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }
    
    const alertEngine = getAlertEngine()
    
    if (type === 'rules') {
      // Get alert rules
      const rules = alertEngine.getRules(organizationId || profile.organization_id)
      
      return NextResponse.json({
        rules,
        count: rules.length
      })
    }
    
    // Get alerts for a specific meeting
    if (meetingId) {
      // Verify user has access to the meeting
      const { data: meeting } = await supabase
        .from('meetings')
        .select('organization_id')
        .eq('id', meetingId)
        .single()
      
      if (!meeting || meeting.organization_id !== profile.organization_id) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
      
      const alerts = await alertEngine.getMeetingAlerts(meetingId)
      
      return NextResponse.json({
        alerts,
        count: alerts.length
      })
    }
    
    // Get recent alerts for organization
    const { data: recentAlerts, error } = await supabase
      .from('meeting_alerts')
      .select(`
        *,
        meetings!inner(
          id,
          title,
          organization_id
        )
      `)
      .eq('meetings.organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (error) throw error
    
    return NextResponse.json({
      alerts: recentAlerts || [],
      count: recentAlerts?.length || 0
    })
  } catch (error) {
    console.error('Get alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to get alerts' },
      { status: 500 }
    )
  }
}

// POST - Create or update alert rules
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { action, rule, ruleId, updates } = body
    
    // Get user's organization and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }
    
    // Only admins can manage alert rules
    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    const alertEngine = getAlertEngine()
    
    switch (action) {
      case 'create':
        if (!rule) {
          return NextResponse.json(
            { error: 'Rule data required' },
            { status: 400 }
          )
        }
        
        const newRule = await alertEngine.createCustomRule(
          profile.organization_id,
          rule
        )
        
        return NextResponse.json({
          success: true,
          rule: newRule
        })
      
      case 'update':
        if (!ruleId || !updates) {
          return NextResponse.json(
            { error: 'Rule ID and updates required' },
            { status: 400 }
          )
        }
        
        await alertEngine.updateRule(ruleId, updates)
        
        return NextResponse.json({
          success: true,
          message: 'Rule updated successfully'
        })
      
      case 'delete':
        if (!ruleId) {
          return NextResponse.json(
            { error: 'Rule ID required' },
            { status: 400 }
          )
        }
        
        await alertEngine.deleteRule(ruleId)
        
        return NextResponse.json({
          success: true,
          message: 'Rule deleted successfully'
        })
      
      case 'acknowledge':
        const { alertId } = body
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID required' },
            { status: 400 }
          )
        }
        
        await alertEngine.acknowledgeAlert(alertId)
        
        return NextResponse.json({
          success: true,
          message: 'Alert acknowledged'
        })
      
      case 'load':
        // Load organization rules
        await alertEngine.loadOrganizationRules(profile.organization_id)
        
        return NextResponse.json({
          success: true,
          message: 'Rules loaded successfully'
        })
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Alert management error:', error)
    return NextResponse.json(
      { error: 'Failed to manage alerts' },
      { status: 500 }
    )
  }
}

// DELETE - Delete alert or rule
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const ruleId = request.nextUrl.searchParams.get('ruleId')
    const alertId = request.nextUrl.searchParams.get('alertId')
    
    if (!ruleId && !alertId) {
      return NextResponse.json(
        { error: 'Rule ID or Alert ID required' },
        { status: 400 }
      )
    }
    
    // Get user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }
    
    if (ruleId) {
      // Only admins can delete rules
      if (profile.role !== 'admin' && profile.role !== 'owner') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        )
      }
      
      const alertEngine = getAlertEngine()
      await alertEngine.deleteRule(ruleId)
      
      return NextResponse.json({
        success: true,
        message: 'Rule deleted successfully'
      })
    }
    
    if (alertId) {
      // Users can delete alerts for their organization's meetings
      const { error } = await supabase
        .from('meeting_alerts')
        .delete()
        .eq('id', alertId)
      
      if (error) throw error
      
      return NextResponse.json({
        success: true,
        message: 'Alert deleted successfully'
      })
    }
  } catch (error) {
    console.error('Delete alert/rule error:', error)
    return NextResponse.json(
      { error: 'Failed to delete' },
      { status: 500 }
    )
  }
}

// PATCH - Acknowledge alerts
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { alertIds, acknowledged = true } = body
    
    if (!alertIds || !Array.isArray(alertIds)) {
      return NextResponse.json(
        { error: 'Alert IDs array required' },
        { status: 400 }
      )
    }
    
    // Update alerts
    const { error } = await supabase
      .from('meeting_alerts')
      .update({ is_acknowledged: acknowledged })
      .in('id', alertIds)
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      message: `${alertIds.length} alerts ${acknowledged ? 'acknowledged' : 'unacknowledged'}`
    })
  } catch (error) {
    console.error('Acknowledge alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to acknowledge alerts' },
      { status: 500 }
    )
  }
}