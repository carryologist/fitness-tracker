// Peloton API client (community-reverse-engineered, no official docs)
// Covers: Peloton indoor rides, outdoor rides tracked via Peloton app (Cannondale)

import prisma from '@/lib/prisma'

const PELOTON_API_BASE = 'https://api.onepeloton.com'

interface PelotonAuthResponse {
  session_id: string
  user_id: string
  access_token?: string   // present when OAuth flow succeeds
  refresh_token?: string  // present when OAuth flow succeeds
  expires_in?: number     // seconds until access_token expires
}

interface PelotonWorkout {
  id: string
  fitness_discipline: string  // "cycling", "strength", "running", "outdoor", etc.
  name: string
  title: string
  start_time: number   // Unix timestamp
  end_time: number
  status: string       // "COMPLETE"
  metrics_type: string
  ride?: {
    title: string
    description: string
    duration: number  // seconds
    instructor?: {
      name: string
    }
  }
  overall_summary?: {
    distance?: number       // miles
    calories?: number
    total_output?: number   // kJ
    avg_cadence?: number
    avg_resistance?: number
    avg_speed?: number
    avg_heart_rate?: number
    max_heart_rate?: number
  }
  is_outdoor: boolean
}

interface PelotonWorkoutsResponse {
  data: PelotonWorkout[]
  total: number
  page: number
  limit: number
  count: number
  page_count: number
  sort_by: string
}

/**
 * Build auth headers that work for both OAuth Bearer tokens and legacy
 * session cookies.  If the sessionId contains dots it is likely a JWT /
 * OAuth access-token, so we send it as a Bearer token; otherwise we fall
 * back to the old `peloton_session_id` cookie.
 */
function pelotonHeaders(sessionId: string): Record<string, string> {
  if (sessionId.includes('.')) {
    return {
      Authorization: `Bearer ${sessionId}`,
      'Content-Type': 'application/json',
    }
  }
  return {
    Cookie: `peloton_session_id=${sessionId}`,
    'Content-Type': 'application/json',
  }
}

export async function authenticatePeloton(
  email: string,
  password: string,
): Promise<PelotonAuthResponse> {
  // ── 1. Try OAuth2 token endpoint first ────────────────────────────
  try {
    const oauthRes = await fetch('https://auth.onepeloton.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'password',
        client_id: 'mgsmWCD0A8Qn6uz6mmqI6qeBNHH9IPwS',
        username: email,
        password: password,
        scope: 'openid profile email offline_access',
      }),
    })

    if (oauthRes.ok) {
      const oauthData = await oauthRes.json()

      // Use the access token to resolve the Peloton user-id
      const meRes = await fetch(`${PELOTON_API_BASE}/api/me`, {
        headers: {
          Authorization: `Bearer ${oauthData.access_token}`,
        },
      })

      if (meRes.ok) {
        const me = await meRes.json()
        return {
          session_id: oauthData.access_token,  // treat access token as session
          user_id: me.id,
          access_token: oauthData.access_token,
          refresh_token: oauthData.refresh_token,
          expires_in: oauthData.expires_in,
        }
      }
    }
  } catch (err) {
    // OAuth endpoint unreachable / errored – fall through to legacy flow
    console.warn('Peloton OAuth attempt failed, trying legacy auth:', err)
  }

  // ── 2. Fallback: legacy session auth with mobile user-agent ───────
  const res = await fetch(`${PELOTON_API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'peloton-iOS/36.0.0',
      'Peloton-Platform': 'iOS',
    },
    body: JSON.stringify({
      username_or_email: email,
      password: password,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Peloton auth failed (${res.status}): ${body}`)
  }

  return res.json()
}

export async function fetchPelotonWorkouts(
  sessionId: string,
  userId: string,
  page: number = 0,
  limit: number = 50,
): Promise<PelotonWorkoutsResponse> {
  const res = await fetch(
    `${PELOTON_API_BASE}/api/user/${userId}/workouts?joins=ride,ride.instructor&limit=${limit}&page=${page}&sort_by=-created`,
    { headers: pelotonHeaders(sessionId) },
  )

  if (!res.ok) {
    throw new Error(`Peloton workouts fetch failed (${res.status})`)
  }

  return res.json()
}

export async function fetchPelotonWorkoutSummary(
  sessionId: string,
  workoutId: string,
): Promise<PelotonWorkout['overall_summary']> {
  // The old /summary endpoint now returns 404.
  // Use /performance_graph instead and extract metrics from the summaries array.
  const res = await fetch(
    `${PELOTON_API_BASE}/api/workout/${workoutId}/performance_graph?every_n=900`,
    { headers: pelotonHeaders(sessionId) },
  )

  if (!res.ok) {
    throw new Error(`Peloton performance_graph fetch failed (${res.status})`)
  }

  const pg = await res.json()
  const summaries: Array<{ slug: string; value: number }> = pg.summaries ?? []

  const val = (slug: string) => summaries.find(s => s.slug === slug)?.value

  return {
    distance: val('distance'),
    calories: val('calories'),
    total_output: val('total_output'),
    avg_cadence: val('avg_cadence'),
    avg_resistance: val('avg_resistance'),
    avg_speed: val('avg_speed'),
    avg_heart_rate: val('avg_heart_rate'),
    max_heart_rate: val('max_heart_rate'),
  }
}

// Map Peloton fitness_discipline to our source/activity taxonomy
export function mapPelotonWorkout(workout: PelotonWorkout) {
  const isOutdoor = workout.is_outdoor || workout.fitness_discipline === 'outdoor'

  let source: string
  let activity: string

  if (isOutdoor) {
    // Outdoor rides tracked via Peloton app (user's Cannondale)
    source = 'Cannondale'
    activity = 'Cycling'
  } else if (workout.fitness_discipline === 'cycling') {
    source = 'Peloton'
    activity = 'Cycling'
  } else if (workout.fitness_discipline === 'running') {
    source = 'Peloton'
    activity = 'Running'
  } else if (workout.fitness_discipline === 'strength') {
    source = 'Peloton'
    activity = 'Weight Lifting'
  } else {
    source = 'Peloton'
    activity = workout.fitness_discipline || 'Other'
  }

  const durationSeconds = workout.ride?.duration || (workout.end_time - workout.start_time)
  const minutes = Math.round(durationSeconds / 60)
  const miles = workout.overall_summary?.distance || undefined
  const instructorName = workout.ride?.instructor?.name
  const title = workout.ride?.title || workout.name

  return {
    source,
    activity,
    date: new Date(workout.start_time * 1000),
    minutes,
    miles: miles ? Math.round(miles * 100) / 100 : undefined,
    notes: [title, instructorName ? `w/ ${instructorName}` : null]
      .filter(Boolean)
      .join(' — ') || undefined,
    pelotonWorkoutId: workout.id,
  }
}

/**
 * Re-authenticate with Peloton via OAuth2 and persist the new credential.
 * Used by auth route and by sync route on 401 / token expiry.
 */
export async function refreshPelotonCredential(): Promise<{ sessionId: string; userId: string }> {
  const email = process.env.PELOTON_EMAIL?.trim()
  const password = process.env.PELOTON_PASSWORD?.trim()

  if (!email || !password) {
    throw new Error('PELOTON_EMAIL and PELOTON_PASSWORD must be set in environment')
  }

  const auth = await authenticatePeloton(email, password)

  const expiresAt = auth.expires_in
    ? Math.floor(Date.now() / 1000) + auth.expires_in
    : null

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
  })

  return { sessionId: auth.session_id, userId: auth.user_id }
}
