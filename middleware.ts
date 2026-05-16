import { auth } from "./auth"
import { NextResponse } from "next/server"

/**
 * Constant-time string compare for the personal access token to avoid
 * timing side-channels.
 *
 * F-11: Intentional duplicate of `src/lib/api-auth.ts#timingSafeEqual`.
 * Middleware runs on the Edge runtime and cannot import the Node-only
 * `crypto.timingSafeEqual`, and edge bundles complain about pulling in
 * server modules. If you change either copy, change BOTH.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

// F-12 (intentional): only the Authorization header is honoured.
// Do NOT widen this to query-string / cookie / alternate header without
// re-doing the threat model — token-in-URL leaks to logs and Referer.
function hasValidApiToken(req: { headers: Headers }): boolean {
  const header =
    req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (!header) return false
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  if (!match) return false
  const token = match[1].trim()
  const expected = process.env.MCP_API_TOKEN
  if (!expected || expected.length < 16) return false
  return timingSafeEqual(token, expected)
}

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session

  // DEBUG: surface what middleware saw via response headers so we can
  // diagnose why /  is returning 200 to unauthenticated callers.
  const dbgHeaders = (extra?: Record<string, string>) => {
    const h = new Headers()
    h.set('x-mw-ran', '1')
    h.set('x-mw-path', nextUrl.pathname)
    h.set('x-mw-logged-in', isLoggedIn ? '1' : '0')
    h.set('x-mw-has-session-cookie',
      (req.headers.get('cookie') ?? '').includes('authjs.session-token') ? '1' : '0')
    if (extra) for (const [k, v] of Object.entries(extra)) h.set(k, v)
    return h
  }

  const isPublicPath =
    nextUrl.pathname.startsWith('/api/auth') ||
    nextUrl.pathname.startsWith('/api/mcp') ||
    nextUrl.pathname === '/login'

  if (isPublicPath) {
    const res = NextResponse.next()
    dbgHeaders({ 'x-mw-decision': 'public' }).forEach((v, k) => res.headers.set(k, v))
    return res
  }

  if (nextUrl.pathname.startsWith('/api/') && hasValidApiToken(req)) {
    const res = NextResponse.next()
    dbgHeaders({ 'x-mw-decision': 'bearer' }).forEach((v, k) => res.headers.set(k, v))
    return res
  }

  if (!isLoggedIn) {
    if (nextUrl.pathname.startsWith('/api/')) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      dbgHeaders({ 'x-mw-decision': 'api-401' }).forEach((v, k) => res.headers.set(k, v))
      return res
    }
    const loginUrl = new URL('/login', nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname)
    const res = NextResponse.redirect(loginUrl)
    dbgHeaders({ 'x-mw-decision': 'redirect-login' }).forEach((v, k) => res.headers.set(k, v))
    return res
  }

  const res = NextResponse.next()
  dbgHeaders({ 'x-mw-decision': 'allow' }).forEach((v, k) => res.headers.set(k, v))
  return res
})

export const config = {
  matcher: [
    /*
     * F-03 hardening: anchored exclusions instead of a trailing-extension
     * catch-all. We only skip _next internals and the favicon. Static
     * assets under /public are served by Next.js's own asset handler
     * before middleware runs, so they don't need their own exclusion.
     */
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
}
