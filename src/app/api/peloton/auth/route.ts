import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticatePeloton } from '@/lib/peloton';

const prisma = new PrismaClient();

export async function POST() {
  try {
    const email = process.env.PELOTON_EMAIL?.trim();
    const password = process.env.PELOTON_PASSWORD?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'PELOTON_EMAIL and PELOTON_PASSWORD must be set in environment' },
        { status: 500 },
      );
    }

    const auth = await authenticatePeloton(email, password);

    // Compute expiresAt if the OAuth flow returned an expiry window
    const expiresAt = auth.expires_in
      ? Math.floor(Date.now() / 1000) + auth.expires_in
      : null;

    // Upsert by Peloton userId (single-user app, but handles re-auth cleanly)
    await prisma.pelotonCredential.upsert({
      where: { userId: auth.user_id },
      update: {
        sessionId: auth.session_id,
        accessToken: auth.access_token ?? null,
        refreshToken: auth.refresh_token ?? null,
        expiresAt,
      },
      create: {
        userId: auth.user_id,
        sessionId: auth.session_id,
        accessToken: auth.access_token ?? null,
        refreshToken: auth.refresh_token ?? null,
        expiresAt,
      },
    });

    return NextResponse.json({ connected: true, userId: auth.user_id });
  } catch (error) {
    console.error('Peloton auth error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
