import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { exchangeCode } from '../../../../../shared/strava';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/?strava=error', request.url));
  }

  const clientId = process.env.STRAVA_CLIENT_ID!;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET!;

  try {
    const data = await exchangeCode(code, clientId, clientSecret);

    // Upsert credentials
    await prisma.stravaCredential.upsert({
      where: { athleteId: data.athlete.id },
      update: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
        scope: 'activity:read_all',
      },
      create: {
        athleteId: data.athlete.id,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
        scope: 'activity:read_all',
      },
    });

    return NextResponse.redirect(new URL('/?strava=connected', request.url));
  } catch (err) {
    console.error('Strava callback error:', err);
    return NextResponse.redirect(new URL('/?strava=error', request.url));
  }
}
