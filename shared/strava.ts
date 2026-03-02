const STRAVA_BASE = 'https://www.strava.com/api/v3';

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  type: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  start_date: string; // ISO 8601
  start_date_local: string;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  gear_id?: string;
  gear?: { id: string; name: string };
  average_speed?: number; // m/s
  max_speed?: number;
  trainer?: boolean;
}

export async function refreshTokenIfNeeded(
  tokens: StravaTokens,
  clientId: string,
  clientSecret: string,
): Promise<StravaTokens> {
  if (Date.now() / 1000 < tokens.expires_at - 60) return tokens;
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json();
}

export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<{ athlete: { id: number }; access_token: string; refresh_token: string; expires_at: number }> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Code exchange failed: ${res.status}`);
  return res.json();
}

export async function fetchActivities(
  accessToken: string,
  after?: number,
  page = 1,
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({ per_page: '100', page: String(page) });
  if (after) params.set('after', String(after));
  const res = await fetch(`${STRAVA_BASE}/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Fetch activities failed: ${res.status}`);
  return res.json();
}

export async function fetchActivityDetail(
  accessToken: string,
  id: number,
): Promise<StravaActivity> {
  const res = await fetch(`${STRAVA_BASE}/activities/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Fetch activity detail failed: ${res.status}`);
  return res.json();
}
