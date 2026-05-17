import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { findDupes, softDeleteWorkouts } from '@/lib/workout-dedupe'
import { logAudit } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

/**
 * One-shot dedupe endpoint for the historical-data cleanup pass.
 *
 *   GET  /api/admin/dedupe-workouts                  → dry-run preview
 *   POST /api/admin/dedupe-workouts?confirm=yes      → actually soft-delete
 *
 * Both require either a NextAuth session or `Authorization: Bearer
 * $MCP_API_TOKEN`. Soft-deletes only — every removed row remains in
 * the table with `deletedAt` set, and is excluded from /api/workouts.
 *
 * The dedupe logic lives in src/lib/workout-dedupe.ts; this route is
 * just the HTTP surface.
 */
export async function GET(request: Request) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const dupes = await findDupes()
  const byReason: Record<string, number> = {}
  let minutesAffected = 0
  for (const d of dupes) {
    byReason[d.reason] = (byReason[d.reason] ?? 0) + 1
    minutesAffected += d.minutes
  }

  return NextResponse.json({
    dryRun: true,
    count: dupes.length,
    minutesAffected,
    byReason,
    candidates: dupes,
  })
}

export async function POST(request: Request) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const url = new URL(request.url)
  if (url.searchParams.get('confirm') !== 'yes') {
    return NextResponse.json(
      { error: 'pass ?confirm=yes to actually soft-delete' },
      { status: 400 },
    )
  }

  const dupes = await findDupes()
  const ids = dupes.map((d) => d.id)
  const deleted = await softDeleteWorkouts(ids)

  await logAudit(request, authResult, 'admin.dedupe', {
    deleted,
    byReason: dupes.reduce<Record<string, number>>((acc, d) => {
      acc[d.reason] = (acc[d.reason] ?? 0) + 1
      return acc
    }, {}),
  })

  return NextResponse.json({
    deleted,
    candidates: dupes,
  })
}
