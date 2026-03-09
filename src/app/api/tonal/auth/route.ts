import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authenticateTonal, getUserIdFromToken } from '@/lib/tonal'

export async function POST() {
  try {
    const email = process.env.TONAL_EMAIL?.trim()
    const password = process.env.TONAL_PASSWORD?.trim()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'TONAL_EMAIL and TONAL_PASSWORD env vars are required' },
        { status: 400 }
      )
    }

    console.log('🔐 Authenticating with Tonal...')
    const authResponse = await authenticateTonal(email, password)
    const userId = getUserIdFromToken(authResponse.id_token)

    const expiresAt = Math.floor(Date.now() / 1000) + authResponse.expires_in

    await prisma.tonalCredential.upsert({
      where: { userId },
      update: {
        idToken: authResponse.id_token,
        refreshToken: authResponse.refresh_token ?? null,
        expiresAt,
      },
      create: {
        userId,
        idToken: authResponse.id_token,
        refreshToken: authResponse.refresh_token ?? null,
        expiresAt,
      },
    })

    console.log(`✅ Tonal connected for user ${userId}`)

    return NextResponse.json({ connected: true, userId })
  } catch (error) {
    console.error('💥 Tonal auth error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
