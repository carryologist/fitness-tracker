/**
 * Workout deduplication logic.
 *
 * Historical duplication patterns (P1-P3) from the original May cleanup
 * (findDupes()/softDeleteWorkouts(), since removed as dead code once
 * their one-shot admin route was deleted) have been superseded by P4
 * below, the live Tonal/Peloton weight-lifting merge.
 *
 * P4. Peloton+Tonal overlapping weight-lifting double-count: the Peloton
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
import { withSyncWrite } from '@/lib/sync-write'
import { sameWorkout } from '@/lib/workout-match'

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
 * Find time-compatible same-day pairs of a real Tonal "Weight Lifting" row and a
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
    if ((peloton.weightLifted ?? 0) > 0 || !peloton.pelotonWorkoutId || !/traditional strength training/i.test(peloton.notes ?? '') ||
        !sameWorkout(tonal, peloton, true) ||
        (tonal.pelotonWorkoutId && tonal.pelotonWorkoutId !== peloton.pelotonWorkoutId)) continue
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
    const didMerge = await withSyncWrite(async tx => {
      const tonal = await tx.workoutSession.findUnique({ where: { id: c.tonalId } })
      const peloton = await tx.workoutSession.findUnique({ where: { id: c.pelotonId } })
      // Candidates may be stale by the time an admin applies them.
      if (!tonal || !peloton || tonal.deletedAt || peloton.deletedAt ||
          tonal.source !== 'Tonal' || peloton.source !== 'Peloton' ||
          tonal.activity !== 'Weight Lifting' || peloton.activity !== 'Weight Lifting' ||
          (peloton.weightLifted ?? 0) > 0 ||
          !(tonal.weightLifted ?? 0) || !peloton.pelotonWorkoutId ||
          !/traditional strength training/i.test(peloton.notes ?? '') ||
          !sameWorkout(tonal, peloton, true) ||
          (tonal.pelotonWorkoutId && tonal.pelotonWorkoutId !== peloton.pelotonWorkoutId)) return false
      const retired = await tx.workoutSession.updateMany({
        where: { id: peloton.id, deletedAt: null, pelotonWorkoutId: peloton.pelotonWorkoutId },
        data: { deletedAt: new Date(), pelotonWorkoutId: null },
      })
      if (!retired.count) return false
      const adopted = await tx.workoutSession.updateMany({
        where: { id: tonal.id, deletedAt: null, pelotonWorkoutId: tonal.pelotonWorkoutId },
        data: { pelotonWorkoutId: peloton.pelotonWorkoutId },
      })
      if (!adopted.count) throw new Error('Workout changed during merge; rolled back')
      return true
    })
    if (didMerge) merged++
  }
  return merged
}
