import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: 'Strava not configured' },
      { status: 500 },
    );
  }

  // Derive redirect URI from the current request so it always matches the actual domain
  const redirectUri = process.env.STRAVA_REDIRECT_URI
    || `${request.nextUrl.origin}/api/strava/callback`;

  const url = new URL('https://www.strava.com/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'activity:read_all');
  url.searchParams.set('approval_prompt', 'auto');

  return NextResponse.redirect(url.toString());
}
