import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getToken } from 'next-auth/jwt'

/**
 * TEMPORARY DEBUG ENDPOINT — DELETE AFTER USE.
 *
 * Bearer-gated so it's not anonymous. Reports what the server sees for
 * cookies / auth() / getToken() so we can diagnose why authenticated
 * browser requests are returning 401 after the v5-beta hardening.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Require the MCP bearer token so this is not anonymously readable.
  const authz = request.headers.get('authorization') ?? ''
  const expected = process.env.MCP_API_TOKEN ?? ''
  if (!authz.startsWith('Bearer ') || authz.slice(7) !== expected || expected.length < 16) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const cookieHeader = request.headers.get('cookie') ?? ''
  const cookieNames = cookieHeader
    .split(';')
    .map((c) => c.trim().split('=')[0])
    .filter(Boolean)

  let authResult: unknown = null
  let authError: string | null = null
  try {
    authResult = await auth()
  } catch (e) {
    authError = e instanceof Error ? e.message : 'unknown'
  }

  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? ''

  const candidates = [
    '__Secure-authjs.session-token',
    'authjs.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.session-token',
  ]

  const getTokenResults: Record<string, unknown> = {}
  for (const cookieName of candidates) {
    try {
      const t = await getToken({
        req: request,
        secret,
        cookieName,
        secureCookie: cookieName.startsWith('__Secure-'),
        salt: cookieName,
      })
      getTokenResults[cookieName] = t
        ? { ok: true, sub: (t as { sub?: string }).sub, email: (t as { email?: string }).email }
        : { ok: false, reason: 'null (cookie missing or decode failed)' }
    } catch (e) {
      getTokenResults[cookieName] = { ok: false, error: e instanceof Error ? e.message : 'unknown' }
    }
  }

  return NextResponse.json({
    cookieHeaderPresent: !!cookieHeader,
    cookieNames,
    env: {
      NEXTAUTH_SECRET_set: !!process.env.NEXTAUTH_SECRET,
      AUTH_SECRET_set: !!process.env.AUTH_SECRET,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    auth: {
      result: authResult ? { hasUser: !!(authResult as { user?: unknown }).user } : null,
      error: authError,
    },
    getToken: getTokenResults,
  })
}
