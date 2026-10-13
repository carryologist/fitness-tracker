import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { runRenphoSync, RenphoSyncError } from '@/lib/renpho-sync'
import { logAudit } from '@/lib/audit-log'

export const maxDuration = 300

// GET — cached connection status; POST owns token refresh.
export async function GET(request: Request) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const cred = await prisma.renphoCredential.findFirst({ orderBy: { obtainedAt: 'desc' } })
    if (!cred) return NextResponse.json({ connected: false })

    return NextResponse.json({ connected: true, userId: cred.userId })
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
      console.error('Renpho sync error (RenphoSyncError):', error.message)
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error('Renpho sync error:', message, stack)
    // Personal single-user app — safe to surface the real error to the
    // one authenticated user instead of masking it as a generic 500.
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE — disconnect Renpho
export async function DELETE(request: Request) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    // Legacy account-ID precision could leave more than one cached row.
    await prisma.renphoCredential.deleteMany()
    await logAudit(request, authResult, 'renpho.disconnect', {})
    return NextResponse.json({ disconnected: true })
  } catch (error) {
    console.error('Renpho disconnect error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
