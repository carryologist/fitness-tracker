/**
 * Tonal sync — pure orchestration extracted from
 * `src/app/api/tonal/sync/route.ts` so that the MCP tool can call it
 * directly without a self-fetch (F-04 fix).
 *
 * The route handler is now a thin auth wrapper around `runTonalSync()`.
 */
import prisma from '@/lib/prisma'
import {
  refreshTonalToken,
  fetchTonalActivitySummaries,
  fetchTonalWorkoutActivity,
  mapTonalActivity,
  getUserIdFromToken,
} from '@/lib/tonal'
import type { TonalCredential } from '@prisma/client'
import { encryptSecret, decryptSecret } from '@/lib/crypto'

export interface SyncResult {
  synced: number
  updated: number
  skipped: number
  total: number
}

export class TonalSyncError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function getCredentialOrFail(): Promise<TonalCredential> {
  const cred = await prisma.tonalCredential.findFirst()
  if (!cred) {
    throw new TonalSyncError(
      'No Tonal credentials found. POST /api/tonal/auth first.',
      401,
    )
  }
  return cred
}

/** Refresh tokens if expired. Returns an up-to-date credential. */
export async function ensureFreshToken(cred: TonalCredential): Promise<TonalCredential> {
  const now = Math.floor(Date.now() / 1000)
  if (cred.expiresAt && cred.expiresAt > now) return cred

  if (!cred.refreshToken) {
    throw new TonalSyncError(
      'Tonal token expired and no refresh token available. Re-auth required.',
      401,
    )
  }

  const authResponse = await refreshTonalToken(decryptSecret(cred.refreshToken)!)
  const userId = await getUserIdFromToken(authResponse.id_token)
  const expiresAt = Math.floor(Date.now() / 1000) + authResponse.expires_in

  return prisma.tonalCredential.update({
    where: { id: cred.id },
    data: {
      idToken: encryptSecret(authResponse.id_token),
      accessToken: encryptSecret(authResponse.access_token ?? null),
      refreshToken: encryptSecret(authResponse.refresh_token ?? decryptSecret(cred.refreshToken)),
      expiresAt,
      userId,
    },
  })
}

function pickBearerToken(cred: TonalCredential): string {
  // Tonal API only accepts the id_token (Auth0 opaque access_token rejected).
  // Stored value may be encrypted (F-05).
  return decryptSecret(cred.idToken)
}

/**
 * Run a Tonal sync. Pages through activities (newest first), backfills
 * 0-minute rows with detailed durations, links manually-entered rows by
 * date, creates new rows for the rest.
 */
export async function runTonalSync(limit = 200): Promise<SyncResult> {
  let cred = await getCredentialOrFail()
  cred = await ensureFreshToken(cred)

  const batchSize = 50
  const maxBatches = Math.ceil(limit / batchSize)

  let synced = 0
  let skipped = 0
  let updated = 0
  let total = 0
  let offset = 0
  let hasMore = true
  let caughtUp = false
  let batchCount = 0

  while (hasMore && !caughtUp) {
    const token = pickBearerToken(cred)
    const activities = await fetchTonalActivitySummaries(token, cred.userId, batchSize, offset)

    if (!activities || activities.length === 0) {
      hasMore = false
      break
    }

    total += activities.length
    batchCount++

    let newOnThisPage = false

    const pageActivityIds = activities
      .map((a) => a.activityId ?? a.id)
      .filter(Boolean) as string[]
    const alreadySynced = await prisma.workoutSession.findMany({
      where: { tonalWorkoutId: { in: pageActivityIds } },
      select: { tonalWorkoutId: true, minutes: true },
    })
    const syncedIdSet = new Set(alreadySynced.map((r) => r.tonalWorkoutId))

    for (const activity of activities) {
      const tonalWorkoutId = activity.activityId ?? activity.id ?? ''
      if (!tonalWorkoutId) {
        skipped++
        continue
      }

      if (syncedIdSet.has(tonalWorkoutId)) {
        const existingRow = alreadySynced.find((r) => r.tonalWorkoutId === tonalWorkoutId)
        if (existingRow && existingRow.minutes === 0) {
          try {
            const t = pickBearerToken(cred)
            const detailed = await fetchTonalWorkoutActivity(t, cred.userId, tonalWorkoutId)
            if (detailed.duration_seconds > 0) {
              const fixedMinutes = Math.round(detailed.duration_seconds / 60)
              await prisma.workoutSession.updateMany({
                where: { tonalWorkoutId },
                data: { minutes: fixedMinutes },
              })
              updated++
            }
          } catch {
            // ignore; will retry on next sync
          }
        }
        skipped++
        continue
      }

      newOnThisPage = true

      const preview = activity.workoutPreview
      const hasDuration =
        (preview?.totalDuration ?? preview?.durationSeconds ?? activity.duration_seconds ?? activity.duration) != null
      let detailedDurationSec: number | undefined
      if (!hasDuration) {
        try {
          const t = pickBearerToken(cred)
          const detailed = await fetchTonalWorkoutActivity(t, cred.userId, tonalWorkoutId)
          detailedDurationSec = detailed.duration_seconds
        } catch {
          // ignore; we'll record what we have
        }
      }

      const mapped = mapTonalActivity(activity, detailedDurationSec)

      // Ghost-activity guard: the Tonal API occasionally returns rows
      // that have a non-zero duration but zero total weight lifted.
      // Those mirror whatever other workout was happening that day
      // (often an outdoor ride) and are not real strength workouts.
      // Recording them as Tonal sessions inflates total minutes — see
      // dedupe pattern P2 in src/lib/workout-dedupe.ts. Skip.
      if (!mapped.weightLifted || mapped.weightLifted === 0) {
        skipped++
        continue
      }

      const startOfDay = new Date(mapped.date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(mapped.date)
      endOfDay.setHours(23, 59, 59, 999)

      const manualMatch = await prisma.workoutSession.findFirst({
        where: {
          source: 'Tonal',
          tonalWorkoutId: null,
          date: { gte: startOfDay, lte: endOfDay },
        },
      })

      if (manualMatch) {
        await prisma.workoutSession.update({
          where: { id: manualMatch.id },
          data: {
            minutes: mapped.minutes || manualMatch.minutes,
            weightLifted: mapped.weightLifted,
            notes: mapped.notes,
            tonalWorkoutId: mapped.tonalWorkoutId,
          },
        })
        updated++
        continue
      }

      await prisma.workoutSession.create({
        data: {
          source: mapped.source,
          activity: mapped.activity,
          date: mapped.date,
          minutes: mapped.minutes,
          weightLifted: mapped.weightLifted,
          notes: mapped.notes,
          tonalWorkoutId: mapped.tonalWorkoutId,
        },
      })

      synced++
    }

    if (!newOnThisPage && !caughtUp) {
      caughtUp = true
      break
    }

    if (batchCount >= maxBatches) hasMore = false
    else if (activities.length < batchSize) hasMore = false
    else offset += batchSize
  }

  return { synced, updated, skipped, total }
}
