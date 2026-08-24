import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { loginToRenpho, debugDeviceInfoAttempts, fetchAllRenphoMeasurements } from '@/lib/renpho'

/**
 * Live diagnostic trace for the Renpho integration. Does NOT touch stored
 * credentials or the database — logs in fresh with the env-configured
 * account and reports exactly what each step returned, so a broken sync
 * can be diagnosed from the response body alone instead of digging through
 * Vercel function logs.
 *
 * Never returns the password or the raw session token.
 */
export async function GET(request: Request) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const email = process.env.RENPHO_EMAIL?.trim()
  const password = process.env.RENPHO_PASSWORD?.trim()

  const report: Record<string, unknown> = {
    envVarsPresent: { RENPHO_EMAIL: !!email, RENPHO_PASSWORD: !!password },
  }

  if (!email || !password) {
    report.result = 'FAILED: RENPHO_EMAIL and/or RENPHO_PASSWORD are not set in this environment.'
    return NextResponse.json(report, { status: 200 })
  }

  let token: string
  let userId: string
  try {
    const login = await loginToRenpho(email, password)
    token = login.token
    userId = login.userId
    report.login = { ok: true, userId, tokenLength: token.length }
  } catch (error) {
    report.login = { ok: false, error: error instanceof Error ? error.message : String(error) }
    report.result = 'FAILED at login. See report.login.error above.'
    return NextResponse.json(report, { status: 200 })
  }

  try {
    report.deviceInfoAttempts = await debugDeviceInfoAttempts(token, userId)
  } catch (error) {
    report.deviceInfoAttempts = { error: error instanceof Error ? error.message : String(error) }
  }

  try {
    const { measurements, scalesFound } = await fetchAllRenphoMeasurements(token, userId)
    report.fetchAllMeasurements = {
      ok: true,
      scalesFound,
      totalMeasurements: measurements.length,
      newestSample: measurements[0] ?? null,
      oldestSample: measurements[measurements.length - 1] ?? null,
    }
    report.result = measurements.length > 0
      ? `OK: fetched ${measurements.length} raw measurements across ${scalesFound} scale(s).`
      : `FAILED: login succeeded but 0 measurements were fetched (scalesFound=${scalesFound}). See deviceInfoAttempts above for why.`
  } catch (error) {
    report.fetchAllMeasurements = { ok: false, error: error instanceof Error ? error.message : String(error) }
    report.result = 'FAILED while fetching measurements. See report.fetchAllMeasurements.error above.'
  }

  return NextResponse.json(report, { status: 200 })
}
