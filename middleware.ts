import { auth } from "./auth"
import { NextResponse } from "next/server"

/**
 * Constant-time string compare for the personal access token to avoid
 * timing side-channels. Duplicated from `src/lib/api-auth.ts` because
 * middleware runs on the edge runtime and cannot import server-only modules.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

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

  // Public paths that don't require authentication.
  // `/api/mcp` is the MCP server endpoint; it does its own bearer-token
  // check against MCP_API_TOKEN so agents (Claude Desktop, Codex,
  // OpenClaw, etc.) can connect without a NextAuth session cookie.
  const isPublicPath =
    nextUrl.pathname.startsWith('/api/auth') ||
    nextUrl.pathname.startsWith('/api/mcp') ||
    nextUrl.pathname === '/login'

  if (isPublicPath) {
    return NextResponse.next()
  }

  // API requests may authenticate with a personal access token
  // (`Authorization: Bearer $MCP_API_TOKEN`) instead of a session cookie.
  // This lets agents and scripts hit the same REST routes the browser uses.
  if (nextUrl.pathname.startsWith('/api/') && hasValidApiToken(req)) {
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    // Don't redirect API callers to an HTML login page; return 401.
    if (nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
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
