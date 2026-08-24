import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { authenticateAndStoreRenphoCredential, RenphoSyncError } from '@/lib/renpho-sync'

export async function POST(request: Request) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    console.log('🔐 Authenticating with Renpho...')
    const cred = await authenticateAndStoreRenphoCredential()
    return NextResponse.json({ connected: true, userId: cred.userId })
  } catch (error) {
    if (error instanceof RenphoSyncError) {
      console.error('Renpho auth error (RenphoSyncError):', error.message)
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error('Renpho auth error:', message, error instanceof Error ? error.stack : undefined)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
