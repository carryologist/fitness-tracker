import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { isValidCombinedWeight, combinedWeightOptions } from '@/lib/freeWeights'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const rows = await prisma.freeWeightProgress.findMany()
    return NextResponse.json({ progress: rows })
  } catch (error) {
    console.error('Error fetching free weight progress:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { exerciseId, reps, weightPerDumbbell } = body

    if (!exerciseId || typeof exerciseId !== 'string') {
      return NextResponse.json({ error: 'exerciseId is required' }, { status: 400 })
    }
    const parsedReps = parseInt(reps)
    if (isNaN(parsedReps) || parsedReps < 1 || parsedReps > 100) {
      return NextResponse.json({ error: 'reps must be between 1 and 100' }, { status: 400 })
    }
    const parsedWeight = parseInt(weightPerDumbbell)
    if (isNaN(parsedWeight) || !isValidCombinedWeight(parsedWeight)) {
      return NextResponse.json(
        { error: `weightPerDumbbell must be one of ${combinedWeightOptions().join(', ')} (single or stacked dumbbell tiers)` },
        { status: 400 }
      )
    }

    const updated = await prisma.freeWeightProgress.upsert({
      where: { exerciseId },
      update: { reps: parsedReps, weightPerDumbbell: parsedWeight },
      create: { exerciseId, reps: parsedReps, weightPerDumbbell: parsedWeight },
    })

    return NextResponse.json({ progress: updated })
  } catch (error) {
    console.error('Error updating free weight progress:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
  }
}
