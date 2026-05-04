import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

interface TonalImportBody {
  weightLifted: number | null
  minutes: number
  date: string // ISO date string
  notes: string | null
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: TonalImportBody = await req.json()

    if (!body.date || !body.minutes) {
      return NextResponse.json(
        { success: false, error: 'date and minutes are required' },
        { status: 400 },
      )
    }

    if (typeof body.minutes !== 'number' || body.minutes < 1 || body.minutes > 480) {
      return NextResponse.json(
        { success: false, error: 'minutes must be between 1 and 480' },
        { status: 400 },
      )
    }
    if (body.weightLifted !== undefined && body.weightLifted !== null) {
      if (typeof body.weightLifted !== 'number' || body.weightLifted < 0 || body.weightLifted > 200000) {
        return NextResponse.json(
          { success: false, error: 'weightLifted must be between 0 and 200000' },
          { status: 400 },
        )
      }
    }

    const date = new Date(body.date)
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 },
      )
    }

    // Check for duplicate: same day + source + minutes
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const existing = await prisma.workoutSession.findFirst({
      where: {
        source: 'Tonal',
        date: { gte: startOfDay, lte: endOfDay },
        minutes: body.minutes,
      },
    })

    if (existing) {
      // If existing entry is missing weight data, update it
      if (!existing.weightLifted && body.weightLifted) {
        const updated = await prisma.workoutSession.update({
          where: { id: existing.id },
          data: {
            weightLifted: body.weightLifted,
            notes: body.notes || existing.notes,
          },
        })
        return NextResponse.json({
          success: true,
          updated: true,
          workout: {
            id: updated.id,
            date: updated.date,
            minutes: updated.minutes,
            weightLifted: updated.weightLifted,
            notes: updated.notes,
          },
        })
      }

      return NextResponse.json(
        { success: false, error: 'Workout already exists for this date', duplicate: true },
        { status: 409 },
      )
    }

    const workout = await prisma.workoutSession.create({
      data: {
        source: 'Tonal',
        activity: 'Weight Lifting',
        date,
        minutes: body.minutes,
        weightLifted: body.weightLifted ?? undefined,
        notes: body.notes || null,
        tonalWorkoutId: null,
      },
    })

    return NextResponse.json({
      success: true,
      workout: {
        id: workout.id,
        date: workout.date,
        minutes: workout.minutes,
        weightLifted: workout.weightLifted,
        notes: workout.notes,
      },
    })
  } catch (error) {
    console.error('💥 Tonal import error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Detailed error:', message)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
