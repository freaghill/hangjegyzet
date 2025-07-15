import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cacheManager } from '@/lib/cache/cache-manager'
import { withCache } from '@/lib/cache/cache-middleware'

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get meeting with caching
    const meeting = await cacheManager.getMeeting(params.id)
    
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }

    // Check user has access
    const { data: member } = await cacheManager.getUserPermissions(
      user.id,
      meeting.organization_id
    )

    if (!member) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get insights with caching
    const insights = await cacheManager.getMeetingInsights(params.id)

    return NextResponse.json({
      meeting,
      insights,
      cached: true
    })

  } catch (error) {
    console.error('Meeting fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    )
  }
}

// Export with cache middleware
export const GET = withCache(handler, {
  ttl: 300, // 5 minutes
  key: (req) => {
    const url = new URL(req.url)
    const meetingId = url.pathname.split('/').slice(-2)[0]
    return `meeting:${meetingId}`
  }
})