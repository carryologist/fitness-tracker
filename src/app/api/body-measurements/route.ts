import { NextResponse } from 'next/server'
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
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
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
