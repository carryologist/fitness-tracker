/**
 * Peloton sync — pure orchestration extracted from
 * `src/app/api/peloton/sync/route.ts` so that the MCP tool can call it
 * directly without a self-fetch (F-04 fix).
 *
 * The route handler is now a thin auth wrapper around `runPelotonSync()`.
 */
import prisma from '@/lib/prisma'
import { withSyncWrite, validateSyncLimit } from '@/lib/sync-write'
import { matchingWindow, uniqueWorkoutMatch } from '@/lib/workout-match'
import {
  fetchPelotonWorkouts,
  fetchPelotonWorkoutSummary,
  mapPelotonWorkout,
  refreshPelotonCredential,
} from '@/lib/peloton'
import { decryptSecret } from '@/lib/crypto'

export interface SyncResult {
  synced: number
  updated: number
  skipped: number
  total: number
}

/**
 * Return a valid sessionId + userId, re-authenticating if the token is
 * expired or missing.  Called once before the sync loop starts.
 */
async function getValidCredential(): Promise<{ sessionId: string; userId: string }> {
  const credential = await prisma.pelotonCredential.findFirst()
  if (!credential) return refreshPelotonCredential()

  // Proactively refresh if expiresAt is within 5 minutes
  const now = Math.floor(Date.now() / 1000)
  if (credential.expiresAt && credential.expiresAt < now + 300) {
    return refreshPelotonCredential()
  }

  return { sessionId: decryptSecret(credential.sessionId), userId: credential.userId }
}

/**
 * Run a Peloton sync. Pages through workouts (newest first), skipping
 * already-synced rows, backfilling manually-entered rows that match by
 * source, activity, start time and duration, and creating new rows for the rest.
 *
 * @param limit  Max workouts to inspect from Peloton (default 200).
 */
export async function runPelotonSync(limit = 200): Promise<SyncResult> {
  validateSyncLimit(limit)
  let { sessionId, userId } = await getValidCredential()

  const maxPages = Math.ceil(limit / 50)

  let synced = 0
  let skipped = 0
  let updated = 0
  let total = 0
  let page = 0
  let retriedAuth = false

  while (true) {
    let response
    try {
      response = await fetchPelotonWorkouts(sessionId, userId, page)
    } catch (err) {
      if (!retriedAuth && err instanceof Error && err.message.includes('(401)')) {
        const fresh = await refreshPelotonCredential()
        sessionId = fresh.sessionId
        userId = fresh.userId
        retriedAuth = true
        response = await fetchPelotonWorkouts(sessionId, userId, page)
      } else {
        throw err
      }
    }
    const workouts = response.data.slice(0, limit - total)
    total += workouts.length

    if (workouts.length === 0) break

    const pageWorkoutIds = workouts
      .filter((w: { status: string }) => w.status === 'COMPLETE')
      .map((w: { id: string }) => w.id)
    const alreadySynced = await prisma.workoutSession.findMany({
      where: { pelotonWorkoutId: { in: pageWorkoutIds } },
      select: { pelotonWorkoutId: true },
    })
    const syncedIdSet = new Set(alreadySynced.map((r) => r.pelotonWorkoutId))

    for (const workout of workouts) {
      if (workout.status !== 'COMPLETE') {
        skipped++
        continue
      }
      if (syncedIdSet.has(workout.id)) {
        skipped++
        continue
      }

      if (!workout.overall_summary) {
        try {
          workout.overall_summary = await fetchPelotonWorkoutSummary(sessionId, workout.id)
        } catch {
          // Continue without summary data
        }
      }

      const mapped = mapPelotonWorkout(workout)
      if (!Number.isFinite(mapped.date.getTime()) || !Number.isFinite(mapped.minutes)) {
        skipped++
        continue
      }

      if (mapped.minutes < 1) {
        skipped++
        continue
      }

      const action = await withSyncWrite(async tx => {
        if (await tx.workoutSession.findUnique({ where: { pelotonWorkoutId: workout.id } })) return 'skipped'
        const candidates = await tx.workoutSession.findMany({
          where: { activity: mapped.activity, deletedAt: null, date: matchingWindow(mapped.date) },
        })
        const tonalEcho = mapped.activity === 'Weight Lifting' &&
          /traditional strength training/i.test(mapped.notes ?? '')
          ? uniqueWorkoutMatch(candidates.filter(row => row.source === 'Tonal' &&
            (row.weightLifted ?? 0) > 0 && !row.pelotonWorkoutId), mapped, true) : undefined
        const manualMatch = uniqueWorkoutMatch(candidates.filter(row =>
          row.source === mapped.source && !row.pelotonWorkoutId), mapped)
        const match = tonalEcho ?? manualMatch
        if (match) {
          const result = await tx.workoutSession.updateMany({
            where: { id: match.id, deletedAt: null, pelotonWorkoutId: null },
            data: tonalEcho ? { pelotonWorkoutId: workout.id } : {
              miles: mapped.miles ?? match.miles, notes: mapped.notes ?? match.notes,
              pelotonWorkoutId: workout.id,
            },
          })
          if (result.count) return 'updated'
        }
        await tx.workoutSession.create({ data: {
          ...mapped, weightLifted: null, miles: mapped.miles ?? null, notes: mapped.notes ?? null,
        } })
        return 'synced'
      })
      if (action === 'updated') updated++
      else if (action === 'synced') synced++
      else skipped++
    }

    if (page + 1 >= response.page_count) break
    if (total >= limit || page + 1 >= maxPages) break
    page++
  }

  return { synced, updated, skipped, total }
}
