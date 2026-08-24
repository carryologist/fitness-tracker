import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { runRenphoSync, ensureFreshRenphoToken, RenphoSyncError } from '@/lib/renpho-sync'
import { logAudit } from '@/lib/audit-log'

// GET — connection status (auto-refreshes token if stale)
export async function GET(request: Request) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const cred = await prisma.renphoCredential.findFirst()
    if (!cred) return NextResponse.json({ connected: false })

    try {
      await ensureFreshRenphoToken(cred)
      return NextResponse.json({ connected: true, userId: cred.userId })
    } catch {
      return NextResponse.json({ connected: false, reason: 'token_expired' })
    }
  } catch (error) {
    console.error('Renpho status check error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ connected: false }, { status: 500 })
  }
}

// POST — sync body measurements from Renpho
export async function POST(req: Request) {
  const authResult = await requireAuth(req)
  if (authResult instanceof NextResponse) return authResult

  try {
    const result = await runRenphoSync()
    await logAudit(req, authResult, 'renpho.sync', { result })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof RenphoSyncError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Renpho sync error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — disconnect Renpho
export async function DELETE(request: Request) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const cred = await prisma.renphoCredential.findFirst()
    if (cred) await prisma.renphoCredential.delete({ where: { id: cred.id } })
    await logAudit(request, authResult, 'renpho.disconnect', {})
    return NextResponse.json({ disconnected: true })
  } catch (error) {
    console.error('Renpho disconnect error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
