import { auth } from "@/auth"
import type { Session } from "next-auth"

/**
 * Get the current session on the server side.
 * Use this in Server Components and API routes.
 * 
 * @example
 * ```ts
 * import { getSession } from "@/lib/auth"
 * 
 * export async function GET() {
 *   const session = await getSession()
 *   if (!session) {
 *     return new Response("Unauthorized", { status: 401 })
 *   }
 *   // ...
 * }
 * ```
 */
export async function getSession(): Promise<Session | null> {
  return await auth()
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
