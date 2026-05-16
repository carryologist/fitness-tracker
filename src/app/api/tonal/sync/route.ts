import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { runTonalSync, ensureFreshToken, TonalSyncError } from '@/lib/tonal-sync'
import { logAudit } from '@/lib/audit-log'

// GET — connection status (auto-refreshes if needed)
export async function GET(request: Request) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const cred = await prisma.tonalCredential.findFirst()
    if (!cred) return NextResponse.json({ connected: false })

    try {
      await ensureFreshToken(cred)
      return NextResponse.json({ connected: true, userId: cred.userId })
    } catch {
      return NextResponse.json({ connected: false, reason: 'token_expired' })
    }
  } catch (error) {
    console.error('Tonal status check error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ connected: false }, { status: 500 })
  }
}

// POST — sync workouts from Tonal
export async function POST(req: Request) {
  const authResult = await requireAuth(req)
  if (authResult instanceof NextResponse) return authResult

  try {
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '200', 10)
    const result = await runTonalSync(limit)
    await logAudit(req, authResult, 'tonal.sync', { limit, result })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof TonalSyncError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Tonal sync error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — disconnect Tonal
export async function DELETE(request: Request) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const cred = await prisma.tonalCredential.findFirst()
    if (cred) await prisma.tonalCredential.delete({ where: { id: cred.id } })
    await logAudit(request, authResult, 'tonal.disconnect', {})
    return NextResponse.json({ disconnected: true })
  } catch (error) {
    console.error('Tonal disconnect error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
