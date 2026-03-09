// Tonal API client (reverse-engineered, no official docs)
// Auth via Auth0 password grant; use id_token (not access_token) as Bearer

const TONAL_AUTH_URL = 'https://tonal.auth0.com/oauth/token'
const TONAL_API_BASE = 'https://api.tonal.com/v6'
const TONAL_CLIENT_ID = 'ERCyexW-xoVG_Yy3RDe-eV4xsOnRHP6L'

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
  const res = await fetch(TONAL_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'password',
      client_id: TONAL_CLIENT_ID,
      username: email,
      password: password,
      scope: 'openid profile email offline_access',
      audience: 'https://tonal.com',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Tonal auth failed (${res.status}): ${body}`)
  }

  return res.json()
}

export async function refreshTonalToken(refreshToken: string): Promise<TonalAuthResponse> {
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
    throw new Error(`Tonal token refresh failed (${res.status})`)
  }

  return res.json()
}

// Get user ID from the id_token JWT (decode payload without verification)
export function getUserIdFromToken(idToken: string): string {
  const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString())
  return payload.sub  // Auth0 user ID
}

export async function fetchTonalActivitySummaries(
  idToken: string,
  userId: string,
  page: number = 1,
  perPage: number = 50
): Promise<TonalActivitySummariesResponse> {
  const res = await fetch(
    `${TONAL_API_BASE}/users/${userId}/activity-summaries?page=${page}&per_page=${perPage}`,
    {
      headers: {
        Authorization: `Bearer ${idToken}`,
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
  idToken: string,
  userId: string,
  activityId: string
): Promise<TonalWorkoutActivity> {
  const res = await fetch(
    `${TONAL_API_BASE}/users/${userId}/workout-activities/${activityId}`,
    {
      headers: {
        Authorization: `Bearer ${idToken}`,
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
