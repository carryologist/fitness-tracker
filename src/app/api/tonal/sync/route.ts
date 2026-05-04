import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkAuth } from '@/lib/auth'
import {
  refreshTonalToken,
  fetchTonalActivitySummaries,
  mapTonalActivity,
  getUserIdFromToken,
} from '@/lib/tonal'
import type { TonalCredential } from '@prisma/client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCredentialOrFail(): Promise<TonalCredential> {
  const cred = await prisma.tonalCredential.findFirst()
  if (!cred) {
    throw new ResponseError('No Tonal credentials found. POST /api/tonal/auth first.', 401)
  }
  return cred
}

class ResponseError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Refresh tokens if expired. Returns an up-to-date credential. */
async function ensureFreshToken(cred: TonalCredential): Promise<TonalCredential> {
  const now = Math.floor(Date.now() / 1000)
  if (cred.expiresAt && cred.expiresAt > now) {
    return cred // still valid
  }

  if (!cred.refreshToken) {
    throw new ResponseError('Tonal token expired and no refresh token available. Re-auth required.', 401)
  }

  console.log('🔄 Refreshing Tonal token...')
  const authResponse = await refreshTonalToken(cred.refreshToken)
  const userId = await getUserIdFromToken(authResponse.id_token)
  const expiresAt = Math.floor(Date.now() / 1000) + authResponse.expires_in

  const updated = await prisma.tonalCredential.update({
    where: { id: cred.id },
    data: {
      idToken: authResponse.id_token,
      accessToken: authResponse.access_token ?? null,
      refreshToken: authResponse.refresh_token ?? cred.refreshToken,
      expiresAt,
      userId,
    },
  })

  console.log('✅ Tonal token refreshed')
  return updated
}

/**
 * Pick the bearer token from the stored credential.
 * The Tonal API only accepts the id_token. The access_token from Auth0
 * (without audience) is opaque and gets rejected with 401.
 */
function pickBearerToken(cred: TonalCredential): string {
  return cred.idToken
}

// ---------------------------------------------------------------------------
// GET  — connection status (auto-refreshes if needed)
// ---------------------------------------------------------------------------

export async function GET() {
  await checkAuth()

  try {
    const cred = await prisma.tonalCredential.findFirst()
    if (!cred) {
      return NextResponse.json({ connected: false })
    }

    // Attempt a refresh so the caller knows the token is actually usable
    try {
      await ensureFreshToken(cred)
      return NextResponse.json({ connected: true, userId: cred.userId })
    } catch {
      return NextResponse.json({ connected: false, reason: 'token_expired' })
    }
  } catch (error) {
    console.error('💥 Tonal status check error:', error)
    return NextResponse.json({ connected: false }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — sync workouts from Tonal
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  await checkAuth()

  try {
    let cred = await getCredentialOrFail()
    cred = await ensureFreshToken(cred)

    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '200')
    const batchSize = 50
    const maxBatches = Math.ceil(limit / batchSize)

    console.log('🏋️ Starting Tonal workout sync...')

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
      const response = await fetchTonalActivitySummaries(token, cred.userId, batchSize, offset)
      const activities = response.data

      if (!activities || activities.length === 0) {
        hasMore = false
        break
      }

      total += activities.length
      batchCount++

      let newOnThisPage = false

      // Batch-fetch already-synced tonalWorkoutIds for this page
      const pageActivityIds = activities.map((a: { id: string }) => a.id).filter(Boolean)
      const alreadySynced = await prisma.workoutSession.findMany({
        where: { tonalWorkoutId: { in: pageActivityIds } },
        select: { tonalWorkoutId: true },
      })
      const syncedIdSet = new Set(alreadySynced.map((r: { tonalWorkoutId: string | null }) => r.tonalWorkoutId))

      for (const activity of activities) {
        const tonalWorkoutId = activity.id

        // Check if already synced (batch lookup)
        if (syncedIdSet.has(tonalWorkoutId)) {
          skipped++
          continue
        }

        // New workout
        newOnThisPage = true

        const mapped = mapTonalActivity(activity)

        // Check for a manually-entered row matching date + source that
        // is missing tonalWorkoutId (backfill weight & link it)
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

      // If no new workouts on this page, everything older is synced too
      if (!newOnThisPage && !caughtUp) {
        caughtUp = true
        break
      }

      // Offset-based pagination: advance by batch size, stop if we got
      // fewer items than requested or hit the batch cap
      if (batchCount >= maxBatches) {
        hasMore = false
      } else if (activities.length < batchSize) {
        hasMore = false
      } else {
        offset += batchSize
      }
    }

    console.log(`✅ Tonal sync complete: ${synced} synced, ${updated} updated, ${skipped} skipped, ${total} total`)

    return NextResponse.json({ synced, updated, skipped, total })
  } catch (error) {
    console.error('💥 Tonal sync error:', error)
    if (error instanceof ResponseError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Detailed error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE — disconnect Tonal
// ---------------------------------------------------------------------------

export async function DELETE() {
  await checkAuth()

  try {
    const cred = await prisma.tonalCredential.findFirst()
    if (cred) {
      await prisma.tonalCredential.delete({ where: { id: cred.id } })
      console.log('🗑️ Tonal credentials deleted')
    }

    return NextResponse.json({ disconnected: true })
  } catch (error) {
    console.error('💥 Tonal disconnect error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Detailed error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
