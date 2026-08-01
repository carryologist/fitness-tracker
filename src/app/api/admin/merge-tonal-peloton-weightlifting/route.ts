import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { findWeightLiftingMergeCandidates, mergeWeightLiftingCandidates } from '@/lib/workout-dedupe'
import { logAudit } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

/**
 * One-shot cleanup endpoint for the historical Tonal/Peloton
 * weight-lifting duplicate pass (dedupe pattern P4).
 *
 *   GET  /api/admin/merge-tonal-peloton-weightlifting              → dry-run preview
 *   POST /api/admin/merge-tonal-peloton-weightlifting?confirm=yes  → apply the merge
 *
 * Both require either a NextAuth session or `Authorization: Bearer
 * $MCP_API_TOKEN`. The Peloton row is soft-deleted (deletedAt set, still
 * present in the table); the surviving Tonal row keeps its own minutes
 * and weightLifted and gains the Peloton row's pelotonWorkoutId for
 * traceability. See src/lib/workout-dedupe.ts for the matching logic and
 * src/lib/tonal-sync.ts / src/lib/peloton-sync.ts for the live-sync
 * guards that prevent this pattern from recurring.
 */
export async function GET(request: Request) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const candidates = await findWeightLiftingMergeCandidates()
  return NextResponse.json({
    dryRun: true,
    count: candidates.length,
    candidates,
  })
}

export async function POST(request: Request) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const url = new URL(request.url)
  if (url.searchParams.get('confirm') !== 'yes') {
    return NextResponse.json(
      { error: 'pass ?confirm=yes to actually merge' },
      { status: 400 },
    )
  }

  const candidates = await findWeightLiftingMergeCandidates()
  const merged = await mergeWeightLiftingCandidates(candidates)

  await logAudit(request, authResult, 'admin.merge_tonal_peloton_weightlifting', {
    merged,
    candidates,
  })

  return NextResponse.json({
    merged,
    candidates,
  })
}
