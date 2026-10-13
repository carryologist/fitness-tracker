/** Bound both the upstream request and reading its response body. */
export function integrationFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(15_000) })
}
