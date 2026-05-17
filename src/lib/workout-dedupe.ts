/**
 * Workout deduplication logic.
 *
 * Three duplication patterns observed in the historical data:
 *
 * P1 — Peloton+Tonal same-day weight-lifting double-count: the Peloton
 *      Watch/app records a "Weight Lifting" session that mirrors a real
 *      Tonal session. Tonal is the canonical record (has the actual
 *      weight number); the Peloton row is the duplicate.
 *
 * P2 — Tonal ghost activity: the Tonal API sometimes returns activity
 *      rows with duration_seconds > 0 but total_weight_lifted == 0.
 *      These mirror whatever other workout was happening (often
 *      outdoor cycling) and are not real strength workouts.
 *
 * P3 — Peloton legacy CSV import re-creating live-synced rows: an
 *      earlier bulk import inserted rows with no pelotonWorkoutId that
 *      collide with live-synced rows on the same date. Keep the
 *      live-synced row (has pelotonWorkoutId); drop the unlinked copy.
 *
 * The functions below identify dupes without mutating anything. The
 * caller decides whether to soft-delete (set deletedAt) or hard-delete.
 */
import prisma from '@/lib/prisma'

export type Reason = 'P1_peloton_dup_of_tonal_weight' | 'P2_tonal_ghost' | 'P3_unlinked_peloton'

export interface DupeCandidate {
  id: string
  date: string
  source: string
  activity: string
  minutes: number
  miles: number | null
  weightLifted: number | null
  pelotonWorkoutId: string | null
  tonalWorkoutId: string | null
  reason: Reason
  // The row we believe is the canonical one this duplicates
  keepId: string
}

/**
 * Find all duplicate workout rows (not yet soft-deleted) according to
 * the three patterns above. Pure read; never mutates.
 */
export async function findDupes(): Promise<DupeCandidate[]> {
  const rows = await prisma.workoutSession.findMany({
    where: { deletedAt: null },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })

  // Group by calendar date (YYYY-MM-DD in local time of the stored value).
  const byDate = new Map<string, typeof rows>()
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10)
    const arr = byDate.get(key) ?? []
    arr.push(r)
    byDate.set(key, arr)
  }

  const dupes: DupeCandidate[] = []

  for (const [, dayRows] of byDate) {
    // ---- P1: Peloton + Tonal both "Weight Lifting" with same minutes ----
    // Match Tonal rows that have real weight against Peloton rows on
    // the same day with the same minutes and activity = "Weight Lifting".
    const tonalLifting = dayRows.filter(
      (r) =>
        r.source === 'Tonal' &&
        r.activity === 'Weight Lifting' &&
        (r.weightLifted ?? 0) > 0,
    )
    for (const tonal of tonalLifting) {
      const pelotonMatch = dayRows.find(
        (r) =>
          r.source === 'Peloton' &&
          r.activity === 'Weight Lifting' &&
          r.minutes === tonal.minutes &&
          r.id !== tonal.id,
      )
      if (pelotonMatch) {
        dupes.push({
          ...serialize(pelotonMatch),
          reason: 'P1_peloton_dup_of_tonal_weight',
          keepId: tonal.id,
        })
      }
    }

    // ---- P2: Tonal "Weight Lifting" with weightLifted=0 or null ----
    // These ghost rows mirror the duration of whatever else you were
    // doing that day (often outdoor cycling). Drop unconditionally —
    // a real Tonal strength workout always has a non-zero weight.
    const ghostTonal = dayRows.filter(
      (r) =>
        r.source === 'Tonal' &&
        r.activity === 'Weight Lifting' &&
        (r.weightLifted == null || r.weightLifted === 0),
    )
    for (const ghost of ghostTonal) {
      // Find any same-day non-Tonal row with matching minutes to cite
      // as the "real" workout, for the audit trail. Falls back to
      // self-id when no obvious pair exists (still drop — a Tonal
      // session with zero weight is not a real strength workout).
      const pair = dayRows.find(
        (r) => r.source !== 'Tonal' && r.minutes === ghost.minutes && r.id !== ghost.id,
      )
      dupes.push({
        ...serialize(ghost),
        reason: 'P2_tonal_ghost',
        keepId: pair?.id ?? ghost.id,
      })
    }

    // ---- P3: Same-source same-day rows where one has the workoutId ----
    // For each (source, activity) bucket on this day, if multiple rows
    // exist and at least one has a pelotonWorkoutId, drop the rows
    // without an ID whose minutes/miles approximately match a linked
    // sibling.
    const bySrcAct = new Map<string, typeof dayRows>()
    for (const r of dayRows) {
      const k = `${r.source}|${r.activity}`
      const a = bySrcAct.get(k) ?? []
      a.push(r)
      bySrcAct.set(k, a)
    }
    for (const [, group] of bySrcAct) {
      if (group.length < 2) continue
      const linked = group.filter((r) => r.pelotonWorkoutId != null || r.tonalWorkoutId != null)
      const unlinked = group.filter((r) => r.pelotonWorkoutId == null && r.tonalWorkoutId == null)
      if (linked.length === 0 || unlinked.length === 0) continue
      for (const u of unlinked) {
        // Find a linked sibling whose minutes match exactly and miles
        // are within 0.2 (rounding differences from CSV vs API).
        const sibling = linked.find(
          (l) =>
            l.minutes === u.minutes &&
            milesClose(l.miles, u.miles),
        )
        if (sibling) {
          // Skip if we already flagged this row under P1/P2
          if (dupes.some((d) => d.id === u.id)) continue
          dupes.push({
            ...serialize(u),
            reason: 'P3_unlinked_peloton',
            keepId: sibling.id,
          })
        }
      }
    }
  }

  return dupes
}

function milesClose(a: number | null, b: number | null): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return Math.abs(a - b) <= 0.2
}

function serialize(r: {
  id: string
  date: Date
  source: string
  activity: string
  minutes: number
  miles: number | null
  weightLifted: number | null
  pelotonWorkoutId: string | null
  tonalWorkoutId: string | null
}) {
  return {
    id: r.id,
    date: r.date.toISOString(),
    source: r.source,
    activity: r.activity,
    minutes: r.minutes,
    miles: r.miles,
    weightLifted: r.weightLifted,
    pelotonWorkoutId: r.pelotonWorkoutId,
    tonalWorkoutId: r.tonalWorkoutId,
  }
}

/**
 * Soft-delete the given workout IDs by setting deletedAt to now. Returns
 * the number of rows updated.
 */
export async function softDeleteWorkouts(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const result = await prisma.workoutSession.updateMany({
    where: { id: { in: ids }, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  return result.count
}
