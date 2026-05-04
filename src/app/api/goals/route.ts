import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/goals - Fetch all goals
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const goals = await prisma.goal.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ goals })
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    )
  }
}

// POST /api/goals - Create a new goal
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // Validate required fields
    const { name, year, annualWeightTarget, minutesPerSession, weeklySessionsTarget } = body
    
    if (!name || !year || !annualWeightTarget || !minutesPerSession || !weeklySessionsTarget) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (typeof year !== 'number' || year < 2020 || year > 2100) {
      return NextResponse.json(
        { error: 'year must be between 2020 and 2100' },
        { status: 400 }
      )
    }
    if (typeof annualWeightTarget !== 'number' || annualWeightTarget <= 0 || annualWeightTarget >= 10000000) {
      return NextResponse.json(
        { error: 'annualWeightTarget must be > 0 and < 10000000' },
        { status: 400 }
      )
    }
    if (typeof minutesPerSession !== 'number' || minutesPerSession < 1 || minutesPerSession > 480) {
      return NextResponse.json(
        { error: 'minutesPerSession must be between 1 and 480' },
        { status: 400 }
      )
    }
    if (typeof weeklySessionsTarget !== 'number' || weeklySessionsTarget < 1 || weeklySessionsTarget > 30) {
      return NextResponse.json(
        { error: 'weeklySessionsTarget must be between 1 and 30' },
        { status: 400 }
      )
    }
    
    // Calculate derived fields
    const weeklyMinutesTarget = minutesPerSession * weeklySessionsTarget
    const annualMinutesTarget = weeklyMinutesTarget * 52
    const quarterlyWeightTarget = annualWeightTarget / 4
    const quarterlyMinutesTarget = annualMinutesTarget / 4
    const quarterlySessionsTarget = weeklySessionsTarget * 13
    
    const goal = await prisma.goal.create({
      data: {
        name,
        year,
        annualWeightTarget,
        minutesPerSession,
        weeklySessionsTarget,
        weeklyMinutesTarget,
        annualMinutesTarget,
        quarterlyWeightTarget,
        quarterlyMinutesTarget,
        quarterlySessionsTarget
      }
    })
    
    return NextResponse.json({ goal }, { status: 201 })
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    )
  }
}

// PUT /api/goals - Update an existing goal
export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, name, year, annualWeightTarget, minutesPerSession, weeklySessionsTarget } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      )
    }

    if (year !== undefined && (typeof year !== 'number' || year < 2020 || year > 2100)) {
      return NextResponse.json(
        { error: 'year must be between 2020 and 2100' },
        { status: 400 }
      )
    }
    if (annualWeightTarget !== undefined && (typeof annualWeightTarget !== 'number' || annualWeightTarget <= 0 || annualWeightTarget >= 10000000)) {
      return NextResponse.json(
        { error: 'annualWeightTarget must be > 0 and < 10000000' },
        { status: 400 }
      )
    }
    if (minutesPerSession !== undefined && (typeof minutesPerSession !== 'number' || minutesPerSession < 1 || minutesPerSession > 480)) {
      return NextResponse.json(
        { error: 'minutesPerSession must be between 1 and 480' },
        { status: 400 }
      )
    }
    if (weeklySessionsTarget !== undefined && (typeof weeklySessionsTarget !== 'number' || weeklySessionsTarget < 1 || weeklySessionsTarget > 30)) {
      return NextResponse.json(
        { error: 'weeklySessionsTarget must be between 1 and 30' },
        { status: 400 }
      )
    }
    
    // Calculate derived fields
    const weeklyMinutesTarget = minutesPerSession * weeklySessionsTarget
    const annualMinutesTarget = weeklyMinutesTarget * 52
    const quarterlyWeightTarget = annualWeightTarget / 4
    const quarterlyMinutesTarget = annualMinutesTarget / 4
    const quarterlySessionsTarget = weeklySessionsTarget * 13
    
    const goal = await prisma.goal.update({
      where: { id },
      data: {
        name,
        year,
        annualWeightTarget,
        minutesPerSession,
        weeklySessionsTarget,
        weeklyMinutesTarget,
        annualMinutesTarget,
        quarterlyWeightTarget,
        quarterlyMinutesTarget,
        quarterlySessionsTarget
      }
    })
    
    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Error updating goal:', error)
    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    )
  }
}