import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { refreshPelotonCredential } from '@/lib/peloton';

export async function POST(request: Request) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { userId } = await refreshPelotonCredential();
    return NextResponse.json({ connected: true, userId });
  } catch (error) {
    console.error('Peloton auth error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    console.error('Detailed error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
