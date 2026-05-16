import { NextResponse } from 'next/server'

/**
 * TEMPORARY DEBUG ENDPOINT — DELETE AFTER USE.
 * Reports which env vars are SET (boolean only — never the value)
 * so we can confirm whether Vercel is exposing GOOGLE_CLIENT_ID etc.
 * to the running function.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Bearer-gated so it's not anonymous.
  const authz = request.headers.get('authorization') ?? ''
  const expected = process.env.MCP_API_TOKEN ?? ''
  if (!authz.startsWith('Bearer ') || authz.slice(7) !== expected || expected.length < 16) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const names = [
    'NEXTAUTH_SECRET',
    'AUTH_SECRET',
    'NEXTAUTH_URL',
    'AUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'AUTH_GOOGLE_ID',
    'AUTH_GOOGLE_SECRET',
    'ALLOWED_EMAIL',
    'MCP_API_TOKEN',
    'CREDENTIAL_ENC_KEY',
    'APP_BASE_URL',
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL_NON_POOLING',
    'PELOTON_EMAIL',
    'TONAL_EMAIL',
    'NODE_ENV',
    'VERCEL_ENV',
    'VERCEL_URL',
  ]

  const out: Record<string, string> = {}
  for (const n of names) {
    const v = process.env[n]
    if (v === undefined) out[n] = 'UNSET'
    else if (v === '') out[n] = 'EMPTY_STRING'
    else out[n] = `SET (len=${v.length})`
  }

  // Surface a couple non-secret values so we can compare with what's
  // configured in the Google Cloud Console:
  // GOOGLE_CLIENT_ID's format ends in .apps.googleusercontent.com —
  // if it doesn't, that's the bug.
  const gcid = process.env.GOOGLE_CLIENT_ID ?? ''
  const gcidHint = gcid
    ? {
        endsWithApps: gcid.endsWith('.apps.googleusercontent.com'),
        prefix: gcid.slice(0, 8),
        suffix: gcid.slice(-20),
      }
    : null

  return NextResponse.json({ env: out, gcidHint })
}
