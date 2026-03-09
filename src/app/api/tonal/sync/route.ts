import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
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
  const userId = getUserIdFromToken(authResponse.id_token)
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
 * Pick the best bearer token from the stored credential.
 * Try access_token first (may be a proper JWT after audience fix),
 * then fall back to id_token.
 */
function pickBearerToken(cred: TonalCredential): string {
  return cred.accessToken ?? cred.idToken
}

// ---------------------------------------------------------------------------
// GET  — connection status (auto-refreshes if needed)
// ---------------------------------------------------------------------------

export async function GET() {
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
  try {
    let cred = await getCredentialOrFail()
    cred = await ensureFreshToken(cred)

    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '200')
    const maxPages = Math.ceil(limit / 50)

    console.log('🏋️ Starting Tonal workout sync...')

    let synced = 0
    let skipped = 0
    let updated = 0
    let total = 0
    let page = 1
    let hasMore = true
    let consecutiveSkips = 0
    let caughtUp = false

    while (hasMore && !caughtUp) {
      const token = pickBearerToken(cred)
      const response = await fetchTonalActivitySummaries(token, cred.userId, page, 50)
      const activities = response.data

      if (!activities || activities.length === 0) {
        hasMore = false
        break
      }

      total += activities.length

      let newOnThisPage = false

      for (const activity of activities) {
        // Check if already synced via tonalWorkoutId uniqueness
        const existing = await prisma.workoutSession.findFirst({
          where: { tonalWorkoutId: activity.id },
          select: { id: true },
        })

        if (existing) {
          skipped++
          consecutiveSkips++

          // After 5 consecutive already-synced workouts, we've caught up
          if (consecutiveSkips >= 5) {
            caughtUp = true
            break
          }
          continue
        }

        // New workout — reset consecutive skip counter
        consecutiveSkips = 0
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

      // Check pagination — stop if we got fewer than a full page or hit page cap
      if (page >= maxPages) {
        hasMore = false
      } else if (response.pagination && response.pagination.page * response.pagination.per_page < response.pagination.total) {
        page++
      } else {
        hasMore = false
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
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE — disconnect Tonal
// ---------------------------------------------------------------------------

export async function DELETE() {
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
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
