import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkAuth } from '@/lib/auth'
import {
  refreshTonalToken,
  fetchTonalActivitySummaries,
  fetchTonalWorkoutActivity,
  getUserIdFromToken,
} from '@/lib/tonal'
import type { TonalCredential } from '@prisma/client'

export const dynamic = 'force-dynamic'

async function ensureFreshToken(cred: TonalCredential): Promise<TonalCredential> {
  const now = Math.floor(Date.now() / 1000)
  if (cred.expiresAt && cred.expiresAt > now) return cred
  if (!cred.refreshToken) throw new Error('Token expired, no refresh token')

  const authResponse = await refreshTonalToken(cred.refreshToken)
  const userId = await getUserIdFromToken(authResponse.id_token)
  const expiresAt = Math.floor(Date.now() / 1000) + authResponse.expires_in

  return prisma.tonalCredential.update({
    where: { id: cred.id },
    data: {
      idToken: authResponse.id_token,
      accessToken: authResponse.access_token ?? null,
      refreshToken: authResponse.refresh_token ?? cred.refreshToken,
      expiresAt,
      userId,
    },
  })
}

export async function GET() {
  await checkAuth()

  try {
    const cred = await prisma.tonalCredential.findFirst()
    if (!cred) return NextResponse.json({ error: 'No Tonal credentials' }, { status: 401 })

    const freshCred = await ensureFreshToken(cred)
    const token = freshCred.idToken

    // Fetch first 5 activities (raw summary)
    const summaries = await fetchTonalActivitySummaries(token, freshCred.userId, 5, 0)

    // For each, also fetch the detailed endpoint
    const detailed = []
    for (const s of summaries.slice(0, 3)) {
      const activityId = s.activityId ?? s.id
      if (!activityId) continue
      try {
        const d = await fetchTonalWorkoutActivity(token, freshCred.userId, activityId)
        detailed.push({ activityId, detail: d })
      } catch (e) {
        detailed.push({ activityId, error: e instanceof Error ? e.message : String(e) })
      }
    }

    return NextResponse.json({
      summaries,
      detailed,
      rawSummaryKeys: summaries[0] ? Object.keys(summaries[0]) : [],
      rawPreviewKeys: summaries[0]?.workoutPreview ? Object.keys(summaries[0].workoutPreview) : [],
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
