import { NextResponse } from 'next/server'
import { parseWorkoutDate } from '@/lib/workout-date'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET — body measurement history, optionally filtered by date range.
// Query params: from, to (ISO date strings, inclusive).
export async function GET(request: Request) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const where: { date?: { gte?: Date; lte?: Date } } = {}
    if (from || to) {
      where.date = {}
      for (const value of [from, to]) {
        if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !parseWorkoutDate(value))) {
          return NextResponse.json({ error: 'from and to must be valid YYYY-MM-DD dates' }, { status: 400 })
        }
      }
      if (from && to && from > to) return NextResponse.json({ error: 'from must be on or before to' }, { status: 400 })
      if (from) where.date.gte = new Date(`${from}T00:00:00Z`)
      if (to) where.date.lte = new Date(`${to}T00:00:00Z`)
    }

    const measurements = await prisma.bodyMeasurement.findMany({
      where,
      orderBy: { date: 'asc' },
    })

    return NextResponse.json(measurements)
  } catch (error) {
    console.error('Body measurements fetch error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
