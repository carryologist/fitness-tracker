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
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('💥 Renpho auth error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
