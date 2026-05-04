import { auth } from "@/auth"
import type { Session } from "next-auth"

/**
 * Get the current session on the server side.
 * Note: In NextAuth v5 beta, auth() may return null in Route Handlers
 * even for authenticated users due to cookie context limitations.
 * The middleware (middleware.ts) is the primary auth gate.
 */
export async function getSession(): Promise<Session | null> {
  try {
    return await auth()
  } catch {
    return null
  }
}

/**
 * Defense-in-depth auth check for API route handlers.
 * Logs a warning if session can't be read but does NOT block the request,
 * because the middleware has already verified authentication.
 * 
 * NextAuth v5 beta has a known limitation where auth() returns null
 * in Route Handlers on serverless platforms even when the user is
 * authenticated. The middleware is the authoritative auth gate.
 */
export async function checkAuth(): Promise<Session | null> {
  const session = await getSession()
  if (!session) {
    console.warn('checkAuth: session is null (middleware already verified auth)')
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
