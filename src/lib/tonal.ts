// Tonal API client (reverse-engineered, no official docs)
// Auth via Auth0 password grant.
// The API may accept either the access_token or id_token as Bearer depending
// on server-side changes.  We try access_token first, then fall back to
// id_token.  Extra mobile-app headers are included to match the official client.

const TONAL_AUTH_URL = 'https://tonal.auth0.com/oauth/token'
const TONAL_API_BASE = 'https://api.tonal.com/v6'
const TONAL_CLIENT_ID = 'ERCyexW-xoVG_Yy3RDe-eV4xsOnRHP6L'

/** Headers that the Tonal iOS app sends alongside every API request. */
const TONAL_APP_HEADERS: Record<string, string> = {
  'User-Agent': 'Tonal/5.0 (iOS)',
  Accept: 'application/json',
  'x-tonal-app-version': '5.0.0',
}

export interface TonalAuthResponse {
  access_token: string
  id_token: string    // THIS is what we use as Bearer
  token_type: string
  expires_in: number  // seconds
  refresh_token?: string
}

export interface TonalWorkoutActivity {
  id: string
  workout_id: string
  name: string
  started_at: string       // ISO datetime
  completed_at: string
  duration_seconds: number
  total_volume_lbs: number // Total weight lifted in lbs
  total_reps: number
  total_sets: number
  movements: TonalMovement[]
}

export interface TonalMovement {
  name: string
  sets: TonalSet[]
}

export interface TonalSet {
  weight_lbs: number
  reps: number
  set_number: number
}

export interface TonalActivitySummary {
  id: string
  workout_activity_id: string
  date: string             // ISO date
  total_volume_lbs: number
  total_duration_seconds: number
  total_reps: number
  total_sets: number
  workout_name: string
}

export interface TonalActivitySummariesResponse {
  data: TonalActivitySummary[]
  pagination?: {
    total: number
    page: number
    per_page: number
  }
}

export async function authenticateTonal(email: string, password: string): Promise<TonalAuthResponse> {
  // Try multiple Auth0 configurations — the audience param is the usual culprit
  // for "400: invalid audience specified for password grant exchange".
  const attempts = [
    {
      grant_type: 'password',
      client_id: TONAL_CLIENT_ID,
      username: email,
      password: password,
      scope: 'openid profile email offline_access',
    },
    {
      grant_type: 'password',
      client_id: TONAL_CLIENT_ID,
      username: email,
      password: password,
      scope: 'openid profile email offline_access',
      audience: 'https://api.tonal.com',
    },
    {
      grant_type: 'password',
      client_id: TONAL_CLIENT_ID,
      username: email,
      password: password,
      scope: 'openid profile email offline_access',
      audience: 'https://tonal.auth0.com/api/v2/',
    },
  ]

  let lastError = ''

  for (const body of attempts) {
    const res = await fetch(TONAL_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      return res.json()
    }

    lastError = await res.text()
    console.log(`Tonal auth attempt failed (${res.status}): ${lastError}`)
  }

  throw new Error(`Tonal auth failed after all attempts: ${lastError}`)
}

export async function refreshTonalToken(refreshToken: string): Promise<TonalAuthResponse> {
  // No audience param — matches the auth fix above
  const res = await fetch(TONAL_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: TONAL_CLIENT_ID,
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Tonal token refresh failed (${res.status}): ${body}`)
  }

  return res.json()
}

// Get user ID from the id_token JWT (decode payload without verification)
export function getUserIdFromToken(idToken: string): string {
  const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString())
  return payload.sub  // Auth0 user ID
}

export async function fetchTonalActivitySummaries(
  token: string,
  userId: string,
  page: number = 1,
  perPage: number = 50
): Promise<TonalActivitySummariesResponse> {
  const res = await fetch(
    `${TONAL_API_BASE}/users/${userId}/activity-summaries?page=${page}&per_page=${perPage}`,
    {
      headers: {
        ...TONAL_APP_HEADERS,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!res.ok) {
    throw new Error(`Tonal activity summaries fetch failed (${res.status})`)
  }

  return res.json()
}

export async function fetchTonalWorkoutActivity(
  token: string,
  userId: string,
  activityId: string
): Promise<TonalWorkoutActivity> {
  const res = await fetch(
    `${TONAL_API_BASE}/users/${userId}/workout-activities/${activityId}`,
    {
      headers: {
        ...TONAL_APP_HEADERS,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!res.ok) {
    throw new Error(`Tonal workout activity fetch failed (${res.status})`)
  }

  return res.json()
}

// Map a Tonal activity summary to our WorkoutSession format
export function mapTonalActivity(summary: TonalActivitySummary) {
  const minutes = Math.round(summary.total_duration_seconds / 60)

  return {
    source: 'Tonal',
    activity: 'Weight Lifting',
    date: new Date(summary.date),
    minutes,
    weightLifted: Math.round(summary.total_volume_lbs),
    notes: [
      summary.workout_name,
      `${summary.total_sets} sets, ${summary.total_reps} reps`,
    ].join(' — '),
    tonalWorkoutId: summary.id,
  }
}
