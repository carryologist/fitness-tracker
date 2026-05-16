import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { isValidApiToken } from '@/lib/api-auth'
import { runPelotonSync } from '@/lib/peloton-sync'
import { runTonalSync } from '@/lib/tonal-sync'
import { limitMcp, limitSync } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Allow-list for CORS (F-09). The MCP endpoint is consumed by native
 * clients (Claude Desktop, Codex, Cursor), so a browser will only show
 * up here in development. We allow the production app origin (so the
 * admin UI can call its own /api/mcp without dropping the bearer token
 * to a third-party origin) plus localhost for dev. ANY other origin
 * gets no CORS headers, which the browser will then treat as a denied
 * cross-origin call.
 */
function allowedOrigin(req: Request): string | null {
  const origin = req.headers.get('origin')
  if (!origin) return null
  const allow = new Set<string>()
  if (process.env.APP_BASE_URL) allow.add(process.env.APP_BASE_URL.replace(/\/$/, ''))
  if (process.env.VERCEL_URL) allow.add(`https://${process.env.VERCEL_URL}`)
  if (process.env.NODE_ENV !== 'production') {
    allow.add('http://localhost:3000')
    allow.add('http://127.0.0.1:3000')
  }
  return allow.has(origin) ? origin : null
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = allowedOrigin(req)
  if (!origin) return {}
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type, mcp-session-id',
    'access-control-max-age': '600',
    vary: 'origin',
  }
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      'list_workouts',
      'List workout sessions as raw rows from the database. ' +
        'Supports optional filters by year, source (e.g. "Peloton", "Tonal"), activity, a ' +
        'since-date (ISO-8601), and limit. Default order is most recent first. ' +
        'Returns raw row shape — no aggregation, no derived fields.',
      {
        year: z.number().int().min(2020).max(2100).optional()
          .describe('Calendar year filter (e.g. 2025).'),
        source: z.string().optional()
          .describe('Workout source, e.g. "Peloton", "Tonal", "Cannondale", "Gym".'),
        activity: z.string().optional()
          .describe('Activity name, e.g. "Cycling", "Weight Lifting", "Running".'),
        since: z.string().datetime({ offset: true }).optional()
          .describe('ISO-8601 timestamp — only return workouts on or after this date.'),
        limit: z.number().int().min(1).max(1000).default(100)
          .describe('Max rows to return (1-1000). Default 100.'),
      },
      async ({ year, source, activity, since, limit }) => {
        const where: {
          date?: { gte?: Date; lt?: Date }
          source?: string
          activity?: string
          deletedAt: null
        } = { deletedAt: null }

        if (year !== undefined) {
          where.date = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) }
        }
        if (since) where.date = { ...(where.date ?? {}), gte: new Date(since) }
        if (source) where.source = source
        if (activity) where.activity = activity

        const rows = await prisma.workoutSession.findMany({
          where,
          orderBy: { date: 'desc' },
          take: limit,
        })

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              count: rows.length,
              filters: { year, source, activity, since, limit },
              workouts: rows,
            }, null, 2),
          }],
        }
      },
    )

    server.tool(
      'get_workout',
      'Fetch a single workout session by its database ID.',
      { id: z.string().min(1).describe('Workout session ID (cuid).') },
      async ({ id }) => {
        const row = await prisma.workoutSession.findUnique({ where: { id } })
        if (!row || row.deletedAt) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'not_found', id }) }],
            isError: true,
          }
        }
        return { content: [{ type: 'text', text: JSON.stringify(row, null, 2) }] }
      },
    )

    server.tool(
      'create_workout',
      'Create a new workout session. Use this for manual entries; for Peloton/Tonal use the sync tools.',
      {
        date: z.string().describe('Workout date. ISO-8601 date or full timestamp.'),
        source: z.string().min(1).describe('e.g. "Peloton", "Tonal", "Cannondale", "Gym", "Other".'),
        activity: z.string().min(1).describe('e.g. "Cycling", "Running", "Weight Lifting", "Yoga".'),
        minutes: z.number().int().min(0).max(1440),
        miles: z.number().min(0).max(500).optional(),
        weightLifted: z.number().min(0).max(200000).optional(),
        notes: z.string().max(2000).optional(),
      },
      async ({ date, source, activity, minutes, miles, weightLifted, notes }, extra) => {
        const workoutDate = date.includes('T') ? new Date(date) : new Date(`${date}T12:00:00`)
        const created = await prisma.workoutSession.create({
          data: {
            date: workoutDate,
            source,
            activity,
            minutes,
            miles: miles ?? null,
            weightLifted: weightLifted ?? null,
            notes: notes ?? null,
          },
        })
        const req = (extra as { request?: Request }).request
        if (req) await logAudit(req, null, 'mcp.create_workout', { id: created.id, source, activity })
        return { content: [{ type: 'text', text: JSON.stringify({ workout: created }, null, 2) }] }
      },
    )

    server.tool(
      'update_workout',
      'Update fields on an existing workout. Only provided fields are changed.',
      {
        id: z.string().min(1),
        date: z.string().optional(),
        source: z.string().optional(),
        activity: z.string().optional(),
        minutes: z.number().int().min(0).max(1440).optional(),
        miles: z.number().min(0).max(500).nullable().optional(),
        weightLifted: z.number().min(0).max(200000).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
      },
      async ({ id, date, source, activity, minutes, miles, weightLifted, notes }, extra) => {
        const data: Record<string, unknown> = {}
        if (date !== undefined) {
          data.date = date.includes('T') ? new Date(date) : new Date(`${date}T12:00:00`)
        }
        if (source !== undefined) data.source = source
        if (activity !== undefined) data.activity = activity
        if (minutes !== undefined) data.minutes = minutes
        if (miles !== undefined) data.miles = miles
        if (weightLifted !== undefined) data.weightLifted = weightLifted
        if (notes !== undefined) data.notes = notes

        const updated = await prisma.workoutSession.update({ where: { id }, data })
        const req = (extra as { request?: Request }).request
        if (req) await logAudit(req, null, 'mcp.update_workout', { id, fields: Object.keys(data) })
        return { content: [{ type: 'text', text: JSON.stringify({ workout: updated }, null, 2) }] }
      },
    )

    server.tool(
      'delete_workout',
      'Soft-delete a workout session by ID. Sets deletedAt; row remains for audit.',
      { id: z.string().min(1) },
      async ({ id }, extra) => {
        // F-06: soft-delete instead of hard-delete so a runaway agent
        // cannot destroy data irreversibly.
        await prisma.workoutSession.update({
          where: { id },
          data: { deletedAt: new Date() },
        })
        const req = (extra as { request?: Request }).request
        if (req) await logAudit(req, null, 'mcp.delete_workout', { id })
        return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, id, soft: true }) }] }
      },
    )

    server.tool(
      'list_goals',
      'List all configured goals (annual targets + derived weekly/quarterly values).',
      {},
      async () => {
        const goals = await prisma.goal.findMany({ orderBy: { year: 'desc' } })
        return {
          content: [{ type: 'text', text: JSON.stringify({ count: goals.length, goals }, null, 2) }],
        }
      },
    )

    server.tool(
      'peloton_status',
      'Check whether the app has valid Peloton credentials stored.',
      {},
      async () => {
        const cred = await prisma.pelotonCredential.findFirst()
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ connected: !!cred, userId: cred?.userId ?? null }),
          }],
        }
      },
    )

    server.tool(
      'sync_peloton',
      'Trigger a Peloton sync — pulls new workouts from the Peloton API into the database. ' +
        'Returns counts of synced / updated / skipped / total inspected.',
      {
        limit: z.number().int().min(50).max(2000).default(200)
          .describe('Max workouts to inspect from Peloton (50-2000, default 200).'),
      },
      async ({ limit }, extra) => {
        const req = (extra as { request?: Request }).request
        try {
          // F-04: call the sync lib directly — no self-fetch, no token
          // in an outbound request that could be redirected.
          const result = await runPelotonSync(limit)
          if (req) await logAudit(req, null, 'mcp.sync_peloton', { limit, result })
          return { content: [{ type: 'text', text: JSON.stringify(result) }] }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'sync_failed'
          return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true }
        }
      },
    )

    server.tool(
      'tonal_status',
      'Check whether the app has valid Tonal credentials stored.',
      {},
      async () => {
        const cred = await prisma.tonalCredential.findFirst()
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ connected: !!cred, userId: cred?.userId ?? null }),
          }],
        }
      },
    )

    server.tool(
      'sync_tonal',
      'Trigger a Tonal sync — pulls new workouts from the Tonal API into the database. ' +
        'Returns counts of synced / updated / skipped / total inspected.',
      {
        limit: z.number().int().min(50).max(2000).default(200)
          .describe('Max workouts to inspect from Tonal (50-2000, default 200).'),
      },
      async ({ limit }, extra) => {
        const req = (extra as { request?: Request }).request
        try {
          const result = await runTonalSync(limit)
          if (req) await logAudit(req, null, 'mcp.sync_tonal', { limit, result })
          return { content: [{ type: 'text', text: JSON.stringify(result) }] }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'sync_failed'
          return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true }
        }
      },
    )
  },
  { serverInfo: { name: 'fitness-tracker', version: '0.2.0' } },
  {
    basePath: '/api/mcp',
    verboseLogs: false,
    maxDuration: 300,
    disableSse: true,
  },
)

const authed = withMcpAuth(
  handler,
  async (_req, bearerToken) => {
    if (!isValidApiToken(bearerToken ?? null)) return undefined
    return {
      token: 'redacted',
      clientId: 'fitness-tracker-pat',
      scopes: ['workouts:read', 'workouts:write', 'sync:run'],
    }
  },
  { required: true },
)

/**
 * Wrap the authed handler with rate limiting (F-06) and CORS headers
 * (F-09). OPTIONS pre-flight is handled explicitly so browser clients
 * from allow-listed origins succeed.
 */
async function withGuards(req: Request): Promise<Response> {
  // Pre-flight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  // Rate-limit MCP requests (separate bucket for sync tools could be added
  // by inspecting the JSON-RPC body, but that requires consuming the
  // stream; the global cap below covers the worst case).
  const limited = limitMcp(req)
  if (limited) {
    const headers = new Headers(limited.headers)
    for (const [k, v] of Object.entries(corsHeaders(req))) headers.set(k, v)
    return new Response(limited.body, { status: 429, headers })
  }

  // Coarse second bucket for sync-like calls. We can't read the body here
  // without breaking the streamable transport, so apply uniformly.
  const limitedSync = limitSync(req)
  if (limitedSync) {
    const headers = new Headers(limitedSync.headers)
    for (const [k, v] of Object.entries(corsHeaders(req))) headers.set(k, v)
    return new Response(limitedSync.body, { status: 429, headers })
  }

  const res = await authed(req)
  // Merge CORS headers onto the MCP handler's response.
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(corsHeaders(req))) headers.set(k, v)
  return new Response(res.body, { status: res.status, headers })
}

export {
  withGuards as GET,
  withGuards as POST,
  withGuards as DELETE,
  withGuards as OPTIONS,
}
