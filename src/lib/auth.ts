import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { isValidApiToken, extractBearerToken } from "@/lib/api-auth"

/**
 * Get the current session on the server side.
 * In NextAuth v5 beta, auth() may return null in Route Handlers
 * even for authenticated users due to cookie context limitations
 * (see F-08 in security report). We tolerate that by also accepting
 * a valid `Authorization: Bearer $MCP_API_TOKEN` header.
 */
export async function getSession(): Promise<Session | null> {
  try {
    return await auth()
  } catch {
    return null
  }
}

/**
 * Authoritative auth check for API route handlers (F-01 hardening).
 *
 * Accepts EITHER:
 *   - a valid NextAuth session, OR
 *   - a valid `Authorization: Bearer $MCP_API_TOKEN` header on the request
 *
 * Returns a `NextResponse` (401) when both are absent — handlers MUST
 * early-return on a NextResponse result. On success returns the session
 * (which may be null when the caller authenticated via bearer token).
 *
 * Usage:
 *   const authResult = await requireAuth(request)
 *   if (authResult instanceof NextResponse) return authResult
 *   // ...handler logic...
 */
export async function requireAuth(
  request?: Request,
): Promise<Session | NextResponse | null> {
  const session = await getSession()
  if (session) return session

  // No session — accept the bearer token path so MCP / agent callers
  // and the existing REST surface share the same auth model.
  if (request) {
    const token = extractBearerToken(request)
    if (isValidApiToken(token)) {
      // Bearer-authenticated. Return null session to signal "authed but
      // not a user-session"; handlers that need user identity should
      // check for null explicitly.
      return null
    }
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

/**
 * Legacy non-blocking helper kept for back-compat with any caller that
 * has not yet been migrated to `requireAuth`. Logs a warning when the
 * session is missing but does NOT block. New code MUST use requireAuth.
 *
 * @deprecated Use `requireAuth(request)` and early-return on NextResponse.
 */
export async function checkAuth(): Promise<Session | null> {
  const session = await getSession()
  if (!session) {
    console.warn("checkAuth: session is null (use requireAuth for new code)")
  }
  return session
}

/**
 * Get the current user from the session.
 * Returns null if not authenticated.
 *
 * @example
 * ```ts
 * import { getCurrentUser } from "@/lib/auth"
 *
 * const user = await getCurrentUser()
 * if (!user) {
 *   redirect("/login")
 * }
 * ```
 */
export async function getCurrentUser() {
  const session = await getSession()
  return session?.user ?? null
}
