import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { isValidApiToken } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Build the absolute base URL so MCP tools that wrap existing REST routes
 * (Peloton/Tonal sync) can self-call without duplicating orchestration.
 * Vercel sets `VERCEL_URL` to the deployment hostname (no scheme).
 */
function selfBaseUrl(req: Request): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  const url = new URL(req.url)
  return `${url.protocol}//${url.host}`
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
        year: z
          .number()
          .int()
          .min(2020)
          .max(2100)
          .optional()
          .describe('Calendar year filter (e.g. 2025).'),
        source: z
          .string()
          .optional()
          .describe('Workout source, e.g. "Peloton", "Tonal", "Cannondale", "Gym".'),
        activity: z
          .string()
          .optional()
          .describe('Activity name, e.g. "Cycling", "Weight Lifting", "Running".'),
        since: z
          .string()
          .datetime({ offset: true })
          .optional()
          .describe('ISO-8601 timestamp — only return workouts on or after this date.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .default(100)
          .describe('Max rows to return (1-1000). Default 100.'),
      },
      async ({ year, source, activity, since, limit }) => {
        const where: {
          date?: { gte?: Date; lt?: Date }
          source?: string
          activity?: string
        } = {}

        if (year !== undefined) {
          where.date = {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
          }
        }
        if (since) {
          where.date = { ...(where.date ?? {}), gte: new Date(since) }
        }
        if (source) where.source = source
        if (activity) where.activity = activity

        const rows = await prisma.workoutSession.findMany({
          where,
          orderBy: { date: 'desc' },
          take: limit,
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: rows.length,
                  filters: { year, source, activity, since, limit },
                  workouts: rows,
                },
                null,
                2,
              ),
            },
          ],
        }
      },
    )

    server.tool(
      'get_workout',
      'Fetch a single workout session by its database ID.',
      { id: z.string().min(1).describe('Workout session ID (cuid).') },
      async ({ id }) => {
        const row = await prisma.workoutSession.findUnique({ where: { id } })
        if (!row) {
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
        source: z
          .string()
          .min(1)
          .describe('e.g. "Peloton", "Tonal", "Cannondale", "Gym", "Other".'),
        activity: z
          .string()
          .min(1)
          .describe('e.g. "Cycling", "Running", "Weight Lifting", "Yoga".'),
        minutes: z.number().int().min(0).max(1440),
        miles: z.number().min(0).max(500).optional(),
        weightLifted: z.number().min(0).max(200000).optional(),
        notes: z.string().optional(),
      },
      async ({ date, source, activity, minutes, miles, weightLifted, notes }) => {
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
        return {
          content: [{ type: 'text', text: JSON.stringify({ workout: created }, null, 2) }],
        }
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
        notes: z.string().nullable().optional(),
      },
      async ({ id, date, source, activity, minutes, miles, weightLifted, notes }) => {
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
        return {
          content: [{ type: 'text', text: JSON.stringify({ workout: updated }, null, 2) }],
        }
      },
    )

    server.tool(
      'delete_workout',
      'Delete a workout session by ID. Irreversible.',
      { id: z.string().min(1) },
      async ({ id }) => {
        await prisma.workoutSession.delete({ where: { id } })
        return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, id }) }] }
      },
    )

    server.tool(
      'list_goals',
      'List all configured goals (annual targets + derived weekly/quarterly values).',
      {},
      async () => {
        const goals = await prisma.goal.findMany({ orderBy: { year: 'desc' } })
        return {
          content: [
            { type: 'text', text: JSON.stringify({ count: goals.length, goals }, null, 2) },
          ],
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
          content: [
            {
              type: 'text',
              text: JSON.stringify({ connected: !!cred, userId: cred?.userId ?? null }),
            },
          ],
        }
      },
    )

    server.tool(
      'sync_peloton',
      'Trigger a Peloton sync — pulls new workouts from the Peloton API into the database. ' +
        'Returns counts of synced / updated / skipped / total inspected.',
      {
        limit: z
          .number()
          .int()
          .min(50)
          .max(2000)
          .default(200)
          .describe('Max workouts to inspect from Peloton (50-2000, default 200).'),
      },
      async ({ limit }, extra) => {
        const req = (extra as { request?: Request }).request
        if (!req) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'no_request_context' }) }],
            isError: true,
          }
        }
        const base = selfBaseUrl(req)
        const token = process.env.MCP_API_TOKEN ?? ''
        const res = await fetch(`${base}/api/peloton/sync?limit=${limit}`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
        })
        const body = await res.text()
        return { content: [{ type: 'text', text: body }], isError: !res.ok }
      },
    )

    server.tool(
      'tonal_status',
      'Check whether the app has valid Tonal credentials stored.',
      {},
      async () => {
        const cred = await prisma.tonalCredential.findFirst()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ connected: !!cred, userId: cred?.userId ?? null }),
            },
          ],
        }
      },
    )

    server.tool(
      'sync_tonal',
      'Trigger a Tonal sync — pulls new workouts from the Tonal API into the database. ' +
        'Returns counts of synced / updated / skipped / total inspected.',
      {
        limit: z
          .number()
          .int()
          .min(50)
          .max(2000)
          .default(200)
          .describe('Max workouts to inspect from Tonal (50-2000, default 200).'),
      },
      async ({ limit }, extra) => {
        const req = (extra as { request?: Request }).request
        if (!req) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'no_request_context' }) }],
            isError: true,
          }
        }
        const base = selfBaseUrl(req)
        const token = process.env.MCP_API_TOKEN ?? ''
        const res = await fetch(`${base}/api/tonal/sync?limit=${limit}`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
        })
        const body = await res.text()
        return { content: [{ type: 'text', text: body }], isError: !res.ok }
      },
    )
  },
  {
    serverInfo: { name: 'fitness-tracker', version: '0.1.0' },
  },
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

export { authed as GET, authed as POST, authed as DELETE }
