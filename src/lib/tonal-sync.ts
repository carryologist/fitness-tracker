/**
 * Tonal sync — pure orchestration extracted from
 * `src/app/api/tonal/sync/route.ts` so that the MCP tool can call it
 * directly without a self-fetch (F-04 fix).
 *
 * The route handler is now a thin auth wrapper around `runTonalSync()`.
 */
import prisma from '@/lib/prisma'
import { withSyncWrite, validateSyncLimit } from '@/lib/sync-write'
import { matchingWindow, uniqueWorkoutMatch } from '@/lib/workout-match'
import {
  refreshTonalToken,
  fetchTonalActivitySummaries,
  fetchTonalWorkoutActivity,
  mapTonalActivity,
  getUserIdFromToken,
  computeExpiresAt,
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
  // Store the id_token's real expiry, not the (longer-lived) access_token
  // expires_in. See computeExpiresAt() in src/lib/tonal.ts.
  const expiresAt = computeExpiresAt(authResponse)

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
 * 0-minute rows with detailed durations, links unambiguous manually-entered rows by
 * activity, start time and duration, creates new rows for the rest.
 */
export async function runTonalSync(limit = 200): Promise<SyncResult> {
  validateSyncLimit(limit)
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
  let batchCount = 0
  let reauthAttempted = false

  /**
   * Force a token refresh and retry once on a 401 from Tonal. Guards
   * against expiresAt bookkeeping drifting from the token's real
   * server-side validity (see computeExpiresAt() in src/lib/tonal.ts for
   * the id_token vs. access_token lifetime mismatch this was written for).
   * Surfaces a clear, actionable TonalSyncError instead of letting a raw
   * fetch error bubble up as an opaque 500.
   */
  async function withReauthRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!message.includes('(401)') || reauthAttempted) {
        throw new TonalSyncError(`Tonal sync failed: ${message}`, message.includes('(401)') ? 401 : 502)
      }
      reauthAttempted = true
      cred = await ensureFreshToken({ ...cred, expiresAt: 0 })
      try {
        return await fn()
      } catch (retryErr) {
        const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr)
        throw new TonalSyncError(`Tonal sync failed after re-auth: ${retryMessage}`, retryMessage.includes('(401)') ? 401 : 502)
      }
    }
  }

  while (hasMore) {
    const fetchedActivities = await withReauthRetry(() =>
      fetchTonalActivitySummaries(pickBearerToken(cred), cred.userId, Math.min(batchSize, limit - total), offset),
    )

    if (!fetchedActivities || fetchedActivities.length === 0) {
      hasMore = false
      break
    }

    const activities = fetchedActivities.slice(0, Math.min(batchSize, limit - total))
    total += activities.length
    batchCount++

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
            const detailed = await withReauthRetry(() => fetchTonalWorkoutActivity(pickBearerToken(cred), cred.userId, tonalWorkoutId))
            if (detailed.duration_seconds > 0) {
              const fixedMinutes = Math.round(detailed.duration_seconds / 60)
              const result = await withSyncWrite(tx => tx.workoutSession.updateMany({
                where: { tonalWorkoutId, deletedAt: null, minutes: 0 },
                data: { minutes: fixedMinutes },
              }))
              updated += result.count
            }
          } catch {
            // ignore; will retry on next sync
          }
        }
        skipped++
        continue
      }

      const preview = activity.workoutPreview
      const hasDuration =
        (preview?.totalDuration ?? preview?.durationSeconds ?? activity.duration_seconds ?? activity.duration) != null
      let detailedDurationSec: number | undefined
      if (!hasDuration) {
        try {
          const detailed = await withReauthRetry(() => fetchTonalWorkoutActivity(pickBearerToken(cred), cred.userId, tonalWorkoutId))
          detailedDurationSec = detailed.duration_seconds
        } catch {
          // ignore; we'll record what we have
        }
      }

      const mapped = mapTonalActivity(activity, detailedDurationSec)
      if (!Number.isFinite(mapped.date.getTime()) || !Number.isFinite(mapped.minutes)) {
        skipped++
        continue
      }

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

      const action = await withSyncWrite(async tx => {
        // Recheck inside the lock: another sync may have written since prefetch.
        if (await tx.workoutSession.findUnique({ where: { tonalWorkoutId } })) return 'skipped'
        const candidates = await tx.workoutSession.findMany({
          where: { activity: mapped.activity, deletedAt: null, date: matchingWindow(mapped.date) },
        })
        const pelotonEcho = uniqueWorkoutMatch(candidates.filter(row =>
          row.source === 'Peloton' && !row.tonalWorkoutId && !(row.weightLifted ?? 0) &&
          /traditional strength training/i.test(row.notes ?? '')), mapped, true)
        const manualMatch = uniqueWorkoutMatch(candidates.filter(row =>
          row.source === 'Tonal' && !row.tonalWorkoutId), mapped)
        const match = pelotonEcho ?? manualMatch
        if (match) {
          const result = await tx.workoutSession.updateMany({
            where: { id: match.id, deletedAt: null, tonalWorkoutId: null },
            data: { source: 'Tonal', minutes: mapped.minutes || match.minutes,
              weightLifted: mapped.weightLifted, notes: mapped.notes, tonalWorkoutId },
          })
          if (result.count) return 'updated'
        }
        await tx.workoutSession.create({ data: mapped })
        return 'synced'
      })
      if (action === 'updated') updated++
      else if (action === 'synced') synced++
      else skipped++
    }

    if (total >= limit || batchCount >= maxBatches) hasMore = false
    else if (activities.length < batchSize) hasMore = false
    else offset += batchSize
  }

  return { synced, updated, skipped, total }
}
