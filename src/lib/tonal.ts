// Tonal API client (reverse-engineered, no official docs)
// Auth via Auth0 password grant — no audience param needed.
// Bearer token MUST be the `id_token`, NOT the `access_token`.
// The Auth0 `sub` claim is NOT the Tonal user ID — we fetch it from /v6/users/userinfo.
// Reference: danmarai/tonal-api, curlrequests/toneget, JeffOtano/roni

const TONAL_AUTH_URL = 'https://tonal.auth0.com/oauth/token'
const TONAL_API_BASE = 'https://api.tonal.com/v6'
const TONAL_CLIENT_ID = 'ERCyexW-xoVG_Yy3RDe-eV4xsOnRHP6L'

export interface TonalAuthResponse {
  access_token: string
  id_token: string    // THIS is what we use as Bearer for all API calls
  token_type: string
  expires_in: number  // seconds
  refresh_token?: string
}

/** Raw activity item from GET /v6/users/:id/activities */
export interface TonalActivityItem {
  // Current API field names
  activityId?: string
  activityTime?: string
  activityType?: string
  workoutPreview?: {
    activityId?: string
    workoutId?: string
    workoutTitle?: string
    programName?: string
    coachName?: string
    level?: string
    targetArea?: string
    totalVolume?: number
    totalReps?: number
    totalSets?: number
    durationSeconds?: number
    [key: string]: unknown
  }
  // Legacy field names (kept for backward compat)
  id?: string
  name?: string
  workout_name?: string
  started_at?: string
  completed_at?: string
  duration?: number
  duration_seconds?: number
  total_volume?: number
  total_volume_lbs?: number
  total_reps?: number
  total_sets?: number
  workout_id?: string
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

/**
 * Authenticate with Tonal via Auth0 password grant.
 * No `audience` param — that causes 400 errors.
 * Returns tokens; use `id_token` as Bearer for all API calls.
 */
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
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Tonal auth failed (${res.status}): ${body}`)
  }

  return res.json()
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

/**
 * Fetch the Tonal user ID from the API.
 * The Auth0 `sub` claim is NOT the same as the Tonal API user ID.
 * Uses `id_token` as Bearer.
 */
export async function fetchTonalUserId(token: string): Promise<string> {
  const res = await fetch(`${TONAL_API_BASE}/users/userinfo`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Tonal userinfo fetch failed (${res.status}): ${body}`)
  }

  const data = await res.json()
  const userId = data.id ?? data.user_id
  if (!userId) {
    throw new Error(`Tonal userinfo response missing id field: ${JSON.stringify(data)}`)
  }
  return String(userId)
}

// --- Fallback (deprecated): parse Auth0 sub from JWT ---
// export function getUserIdFromToken(idToken: string): string {
//   const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString())
//   return payload.sub  // Auth0 user ID — NOT the Tonal API user ID
// }

/**
 * Get user ID. Calls the userinfo endpoint (correct approach).
 * Kept as `getUserIdFromToken` for backward compat with existing call sites,
 * but now async and hits the API instead of parsing the JWT.
 */
export async function getUserIdFromToken(idToken: string): Promise<string> {
  return fetchTonalUserId(idToken)
}

/**
 * Fetch activities from Tonal.
 * Endpoint: GET /v6/users/:userId/activities?limit=N
 * Bearer token MUST be the id_token.
 */
export async function fetchTonalActivitySummaries(
  token: string,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<TonalActivityItem[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (offset > 0) params.set('offset', String(offset))
  const res = await fetch(
    `${TONAL_API_BASE}/users/${userId}/activities?${params}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Tonal activities fetch failed (${res.status}): ${body}`)
  }

  const json = await res.json()
  // API returns a raw array, not { data: [...] }
  return Array.isArray(json) ? json : (json.data ?? [])
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
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Tonal workout activity fetch failed (${res.status}): ${body}`)
  }

  return res.json()
}

/**
 * Map a Tonal activity item to our WorkoutSession format.
 * Handles both snake_case naming variants from the API:
 *   - name / workout_name
 *   - duration / duration_seconds
 *   - total_volume / total_volume_lbs
 *   - started_at for date
 */
export function mapTonalActivity(activity: TonalActivityItem) {
  const preview = activity.workoutPreview
  const workoutName = preview?.workoutTitle ?? activity.name ?? activity.workout_name ?? 'Tonal Workout'
  const durationSec = preview?.durationSeconds ?? activity.duration_seconds ?? activity.duration ?? 0
  const minutes = Math.round(durationSec / 60)
  const totalVolume = preview?.totalVolume ?? activity.total_volume_lbs ?? activity.total_volume ?? 0
  const totalReps = preview?.totalReps ?? activity.total_reps ?? 0
  const totalSets = preview?.totalSets ?? activity.total_sets ?? 0
  const dateStr = activity.activityTime ?? activity.started_at ?? activity.completed_at
  const activityId = activity.activityId ?? activity.id

  const noteParts: string[] = [workoutName]
  if (preview?.coachName) noteParts.push(`Coach: ${preview.coachName}`)
  if (preview?.programName) noteParts.push(preview.programName)
  if (totalSets || totalReps) {
    noteParts.push(`${totalSets} sets, ${totalReps} reps`)
  }

  return {
    source: 'Tonal',
    activity: 'Weight Lifting',
    date: dateStr ? new Date(dateStr) : new Date(),
    minutes,
    weightLifted: Math.round(totalVolume),
    notes: noteParts.join(' — '),
    tonalWorkoutId: activityId,
  }
}
