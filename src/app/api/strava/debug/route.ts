import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { refreshTokenIfNeeded, fetchActivityDetail } from '@/lib/strava';

const prisma = new PrismaClient();

/**
 * Debug endpoint — shows Strava configuration and connection state.
 * Visit: /api/strava/debug
 *
 * Remove or protect this route before going fully public.
 */
export async function GET(request: NextRequest) {
  // If ?activity=ID is passed, return full detail for that activity
  if (request.nextUrl.searchParams.get('activity')) {
    try {
      const detail = await getActivityDetail(request);
      return NextResponse.json(detail);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const envRedirectUri = process.env.STRAVA_REDIRECT_URI;
  const derivedRedirectUri = `${request.nextUrl.origin}/api/strava/callback`;
  const effectiveRedirectUri = envRedirectUri || derivedRedirectUri;

  // What the auth route would send to Strava
  const authorizeUrl = new URL('https://www.strava.com/oauth/authorize');
  if (clientId) authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('redirect_uri', effectiveRedirectUri);
  authorizeUrl.searchParams.set('scope', 'activity:read_all');
  authorizeUrl.searchParams.set('approval_prompt', 'auto');

  // Check DB for stored credentials
  let credential = null;
  let dbError = null;
  try {
    credential = await prisma.stravaCredential.findFirst();
  } catch (e: any) {
    dbError = e.message;
  }

  // If we have a credential, try a token refresh to test it
  let tokenTest = null;
  if (credential && clientId && clientSecret) {
    try {
      const res = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: credential.refreshToken,
        }),
      });
      const body = await res.text();
      tokenTest = {
        status: res.status,
        ok: res.ok,
        body: (() => { try { return JSON.parse(body); } catch { return body; } })(),
      };
    } catch (e: any) {
      tokenTest = { error: e.message };
    }
  }

  return NextResponse.json({
    env: {
      STRAVA_CLIENT_ID: clientId ? `${clientId.slice(0, 4)}...` : '(not set)',
      STRAVA_CLIENT_SECRET: clientSecret ? '***set***' : '(not set)',
      STRAVA_REDIRECT_URI: envRedirectUri || '(not set — will auto-derive)',
    },
    derived: {
      requestOrigin: request.nextUrl.origin,
      derivedRedirectUri,
      effectiveRedirectUri,
    },
    authorizeUrl: authorizeUrl.toString(),
    storedCredential: credential ? {
      athleteId: credential.athleteId,
      expiresAt: credential.expiresAt,
      expiresAtHuman: new Date(credential.expiresAt * 1000).toISOString(),
      isExpired: Date.now() / 1000 > credential.expiresAt,
      hasAccessToken: !!credential.accessToken,
      hasRefreshToken: !!credential.refreshToken,
    } : null,
    dbError,
    tokenRefreshTest: tokenTest,
    instructions: {
      stravaSettingsUrl: 'https://www.strava.com/settings/api',
      requiredCallbackDomain: request.nextUrl.host,
      note: 'The "Authorization Callback Domain" in Strava settings must match the host above (no https://, no path).',
    },
  }, { status: 200 });
}

/**
 * Fetch full detail for a single Strava activity.
 * Usage: /api/strava/debug?activity=17653119466
 * Returns ALL fields Strava provides (useful for seeing what Tonal/Peloton push).
 */
async function getActivityDetail(request: NextRequest) {
  const activityId = request.nextUrl.searchParams.get('activity');
  if (!activityId) return null;

  const credential = await prisma.stravaCredential.findFirst();
  if (!credential) return { error: 'Not connected to Strava' };

  const clientId = process.env.STRAVA_CLIENT_ID!.trim();
  const clientSecret = process.env.STRAVA_CLIENT_SECRET!.trim();

  const tokens = await refreshTokenIfNeeded(
    { access_token: credential.accessToken, refresh_token: credential.refreshToken, expires_at: credential.expiresAt },
    clientId, clientSecret,
  );

  const headers = { Authorization: `Bearer ${tokens.access_token}` };

  // Fetch activity detail, laps, and streams in parallel
  const [detailRes, lapsRes, streamsRes] = await Promise.all([
    fetch(`https://www.strava.com/api/v3/activities/${activityId}`, { headers }),
    fetch(`https://www.strava.com/api/v3/activities/${activityId}/laps`, { headers }),
    fetch(`https://www.strava.com/api/v3/activities/${activityId}/streams?keys=watts,heartrate,cadence,distance,altitude&key_by_type=true`, { headers }),
  ]);

  const detail = detailRes.ok ? await detailRes.json() : { error: detailRes.status };
  const laps = lapsRes.ok ? await lapsRes.json() : { error: lapsRes.status };
  const streams = streamsRes.ok ? await streamsRes.json() : { error: streamsRes.status };

  return { detail, laps, streams };
}
