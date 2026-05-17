/**
 * Peloton sync — pure orchestration extracted from
 * `src/app/api/peloton/sync/route.ts` so that the MCP tool can call it
 * directly without a self-fetch (F-04 fix).
 *
 * The route handler is now a thin auth wrapper around `runPelotonSync()`.
 */
import prisma from '@/lib/prisma'
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
 * date+source, and creating new rows for the rest.
 *
 * @param limit  Max workouts to inspect from Peloton (default 200).
 */
export async function runPelotonSync(limit = 200): Promise<SyncResult> {
  let { sessionId, userId } = await getValidCredential()

  const maxPages = Math.ceil(limit / 50)

  let synced = 0
  let skipped = 0
  let updated = 0
  let total = 0
  let page = 0
  let caughtUp = false
  let retriedAuth = false

  while (!caughtUp) {
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
    const workouts = response.data
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

    let newOnThisPage = false

    for (const workout of workouts) {
      if (workout.status !== 'COMPLETE') {
        skipped++
        continue
      }
      if (syncedIdSet.has(workout.id)) {
        skipped++
        continue
      }

      newOnThisPage = true

      if (!workout.overall_summary) {
        try {
          workout.overall_summary = await fetchPelotonWorkoutSummary(sessionId, workout.id)
        } catch {
          // Continue without summary data
        }
      }

      const mapped = mapPelotonWorkout(workout)

      if (mapped.minutes < 1) {
        skipped++
        continue
      }

      const startOfDay = new Date(mapped.date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(mapped.date)
      endOfDay.setHours(23, 59, 59, 999)

      // Tonal-dup guard (dedupe pattern P1): if the Peloton activity
      // is "Weight Lifting" and there's already a real Tonal row on
      // the same day with matching minutes, this Peloton record is
      // the Watch/app mirror of that Tonal workout. Skip the create
      // to avoid double-counting. The Tonal row is canonical because
      // it carries the actual lifted-weight number.
      if (mapped.activity === 'Weight Lifting') {
        const tonalDup = await prisma.workoutSession.findFirst({
          where: {
            source: 'Tonal',
            activity: 'Weight Lifting',
            minutes: mapped.minutes,
            weightLifted: { gt: 0 },
            date: { gte: startOfDay, lte: endOfDay },
            deletedAt: null,
          },
        })
        if (tonalDup) {
          skipped++
          continue
        }
      }

      const manualMatch = await prisma.workoutSession.findFirst({
        where: {
          source: mapped.source,
          pelotonWorkoutId: null,
          date: { gte: startOfDay, lte: endOfDay },
          deletedAt: null,
        },
      })

      if (manualMatch) {
        await prisma.workoutSession.update({
          where: { id: manualMatch.id },
          data: {
            miles: mapped.miles ?? manualMatch.miles,
            notes: mapped.notes ?? manualMatch.notes,
            pelotonWorkoutId: mapped.pelotonWorkoutId,
          },
        })
        updated++
        continue
      }

      await prisma.workoutSession.create({
        data: {
          date: mapped.date,
          source: mapped.source,
          activity: mapped.activity,
          minutes: mapped.minutes,
          miles: mapped.miles ?? null,
          weightLifted: null,
          notes: mapped.notes ?? null,
          pelotonWorkoutId: mapped.pelotonWorkoutId,
        },
      })
      synced++
    }

    if (!newOnThisPage && !caughtUp) {
      caughtUp = true
      break
    }

    if (page + 1 >= response.page_count) break
    if (page + 1 >= maxPages) break
    page++
  }

  return { synced, updated, skipped, total }
}
