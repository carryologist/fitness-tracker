import { NextResponse } from 'next/server';
import { refreshPelotonCredential } from '@/lib/peloton';

export async function POST() {
  try {
    const { userId } = await refreshPelotonCredential();
    return NextResponse.json({ connected: true, userId });
  } catch (error) {
    console.error('Peloton auth error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
