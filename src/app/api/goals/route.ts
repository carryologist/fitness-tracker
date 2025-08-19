import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/goals - Fetch all goals
export async function GET() {
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
  try {
    const body = await request.json()
    const { id, name, year, annualWeightTarget, minutesPerSession, weeklySessionsTarget } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
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