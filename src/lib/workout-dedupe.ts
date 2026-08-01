/**
 * Workout deduplication logic.
 *
 * Historical duplication patterns (P1-P3) from the original May cleanup
 * (findDupes()/softDeleteWorkouts(), since removed as dead code once
 * their one-shot admin route was deleted) have been superseded by P4
 * below, the live Tonal/Peloton weight-lifting merge.
 *
 * P4. Peloton+Tonal same-day weight-lifting double-count: the Peloton
 *      Watch/app auto-logs a generic "Weight Lifting" row that mirrors
 *      a real Tonal session, with no weight number and a less accurate
 *      duration (Apple Watch strength-training auto-detection is known
 *      to miss rest-period gaps; Tonal's own start/stop timer is the
 *      accurate one). Tonal is canonical: its own minutes and
 *      weightLifted are kept, and the Peloton row's workout id is
 *      adopted onto the Tonal row before the Peloton row is retired.
 *      See the live-sync guards in tonal-sync.ts and peloton-sync.ts,
 *      which prevent this from recurring regardless of sync order.
 */
import prisma from '@/lib/prisma'

export interface WeightLiftingMergeCandidate {
  tonalId: string
  pelotonId: string
  date: string
  tonalMinutes: number
  pelotonMinutes: number
  weightLifted: number | null
  pelotonWorkoutId: string | null
  alreadyLinked: boolean
}

/**
 * Find same-day pairs of a real Tonal "Weight Lifting" row and a
 * Peloton "Weight Lifting" row, where the Peloton row is the Watch/app
 * auto-tracked echo of the Tonal session. Skips any day with more than
 * one row per source, since that ambiguity can't be resolved without a
 * person looking at it. Pure read; never mutates.
 */
export async function findWeightLiftingMergeCandidates(): Promise<WeightLiftingMergeCandidate[]> {
  const rows = await prisma.workoutSession.findMany({
    where: {
      activity: 'Weight Lifting',
      deletedAt: null,
      source: { in: ['Tonal', 'Peloton'] },
    },
    orderBy: [{ date: 'asc' }],
  })

  const byDate = new Map<string, typeof rows>()
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10)
    const arr = byDate.get(key) ?? []
    arr.push(r)
    byDate.set(key, arr)
  }

  const candidates: WeightLiftingMergeCandidate[] = []
  for (const [date, dayRows] of byDate) {
    const tonalRows = dayRows.filter((r) => r.source === 'Tonal' && (r.weightLifted ?? 0) > 0)
    const pelotonRows = dayRows.filter((r) => r.source === 'Peloton')
    if (tonalRows.length !== 1 || pelotonRows.length !== 1) continue

    const tonal = tonalRows[0]!
    const peloton = pelotonRows[0]!
    candidates.push({
      tonalId: tonal.id,
      pelotonId: peloton.id,
      date,
      tonalMinutes: tonal.minutes,
      pelotonMinutes: peloton.minutes,
      weightLifted: tonal.weightLifted,
      pelotonWorkoutId: peloton.pelotonWorkoutId,
      alreadyLinked: tonal.pelotonWorkoutId != null,
    })
  }

  return candidates
}

/**
 * Apply the merges found by findWeightLiftingMergeCandidates(): clear
 * pelotonWorkoutId off the retiring Peloton row and soft-delete it, then
 * adopt that id onto the surviving Tonal row (if not already linked).
 * Returns the number of pairs merged.
 *
 * Order matters: pelotonWorkoutId is unique across workout_sessions, so
 * the value has to be cleared off the old row before it's written to
 * the new one, in the same transaction. Doing it the other way around
 * throws a unique-constraint violation (caught running this by hand
 * against production before this ordering fix landed).
 */
export async function mergeWeightLiftingCandidates(
  candidates: WeightLiftingMergeCandidate[],
): Promise<number> {
  let merged = 0
  for (const c of candidates) {
    if (!c.alreadyLinked) {
      await prisma.workoutSession.update({
        where: { id: c.pelotonId },
        data: { deletedAt: new Date(), pelotonWorkoutId: null },
      })
      await prisma.workoutSession.update({
        where: { id: c.tonalId },
        data: { pelotonWorkoutId: c.pelotonWorkoutId },
      })
    } else {
      await prisma.workoutSession.update({
        where: { id: c.pelotonId },
        data: { deletedAt: new Date(), pelotonWorkoutId: null },
      })
    }
    merged++
  }
  return merged
}
