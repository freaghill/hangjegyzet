import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get usage data for the user
    const usage = await prisma.usageRecord.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    })

    return NextResponse.json({ usage })
  } catch (error) {
    console.error('Error fetching usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    const usageRecord = await prisma.usageRecord.create({
      data: {
        userId: session.user.id,
        type: data.type,
        quantity: data.quantity,
        metadata: data.metadata || {}
      }
    })

    return NextResponse.json({ usageRecord })
  } catch (error) {
    console.error('Error creating usage record:', error)
    return NextResponse.json(
      { error: 'Failed to create usage record' },
      { status: 500 }
    )
  }
}