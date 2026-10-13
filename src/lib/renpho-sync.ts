/**
 * Renpho sync — orchestration mirroring src/lib/tonal-sync.ts. Logs in
 * (using cached token when fresh enough), fetches the full measurement
 * history, collapses same-day readings to the lowest weight, and
 * upserts one BodyMeasurement row per day.
 */
import prisma from '@/lib/prisma'
import { withSyncWrite } from '@/lib/sync-write'
import {
  loginToRenpho,
  fetchAllRenphoMeasurements,
  mapRenphoMeasurement,
  pickDailyReadings,
} from '@/lib/renpho'
import type { RenphoCredential } from '@prisma/client'
import { encryptSecret, decryptSecret } from '@/lib/crypto'

export interface RenphoSyncResult {
  synced: number
  updated: number
  skipped: number
  total: number
  scalesFound: number
  latestMeasurementDate: string | null
}

export class RenphoSyncError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// Renpho's login response carries no documented token lifetime. Re-login
// proactively after this window rather than waiting for a request to fail.
const TOKEN_MAX_AGE_MS = 12 * 60 * 60 * 1000 // 12 hours

/** Log in and store/refresh the cached credential. Requires RENPHO_EMAIL/RENPHO_PASSWORD env vars. */
export async function authenticateAndStoreRenphoCredential(): Promise<RenphoCredential> {
  const email = process.env.RENPHO_EMAIL?.trim()
  const password = process.env.RENPHO_PASSWORD?.trim()
  if (!email || !password) {
    throw new RenphoSyncError('RENPHO_EMAIL and RENPHO_PASSWORD env vars are required', 400)
  }

  const { token, userId } = await loginToRenpho(email, password)

  return prisma.renphoCredential.upsert({
    where: { userId },
    update: { token: encryptSecret(token), obtainedAt: new Date() },
    create: { userId, token: encryptSecret(token), obtainedAt: new Date() },
  })
}

async function getCredentialOrFail(): Promise<RenphoCredential> {
  const cred = await prisma.renphoCredential.findFirst()
  if (!cred) {
    throw new RenphoSyncError('No Renpho credentials found. POST /api/renpho/auth first.', 401)
  }
  return cred
}

/** Re-authenticate if the cached token is stale; otherwise return as-is. */
export async function ensureFreshRenphoToken(cred: RenphoCredential): Promise<RenphoCredential> {
  const age = Date.now() - cred.obtainedAt.getTime()
  if (age < TOKEN_MAX_AGE_MS) return cred
  return authenticateAndStoreRenphoCredential()
}

/**
 * Run a Renpho sync: fetch full measurement history, collapse to one
 * lowest-weight reading per day, upsert into BodyMeasurement by date.
 */
export async function runRenphoSync(): Promise<RenphoSyncResult> {
  let cred = await getCredentialOrFail()
  cred = await ensureFreshRenphoToken(cred)

  let synced = 0
  let updated = 0
  let skipped = 0

  async function withReauthRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // Network failures and pagination failures are not expired credentials.
      if (!/HTTP (401|403)|code=(401|403)\b|token.*(expired|invalid)|(expired|invalid).*token/i.test(message)) throw err
      cred = await authenticateAndStoreRenphoCredential()
      try {
        return await fn()
      } catch (retryErr) {
        const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr)
        throw new RenphoSyncError(`Renpho sync failed after re-auth: ${retryMessage} (initial: ${message})`, 401)
      }
    }
  }

  const { measurements: rawMeasurements, scalesFound } = await withReauthRetry(() =>
    fetchAllRenphoMeasurements(decryptSecret(cred.token), cred.userId),
  )
  const total = rawMeasurements.length

  const mapped = rawMeasurements
    .map(mapRenphoMeasurement)
    .filter((m): m is NonNullable<typeof m> => m != null)
  const dailyReadings = pickDailyReadings(mapped)

  for (const reading of dailyReadings) {
    const action = await withSyncWrite(async tx => {
      const existing = await tx.bodyMeasurement.findUnique({ where: { date: reading.date } })

      const data = {
        weightLbs: reading.weightLbs,
        bmi: reading.bmi,
        bodyFatPct: reading.bodyFatPct,
        waterPct: reading.waterPct,
        musclePct: reading.musclePct,
        boneMassPct: reading.boneMassPct,
        bmr: reading.bmr,
        visceralFatLevel: reading.visceralFatLevel,
        subcutaneousFatPct: reading.subcutaneousFatPct,
        proteinPct: reading.proteinPct,
        bodyAgeYears: reading.bodyAgeYears,
        leanBodyMassLbs: reading.leanBodyMassLbs,
        fatFreeWeightLbs: reading.fatFreeWeightLbs,
        heartRateBpm: reading.heartRateBpm,
        renphoRecordId: reading.renphoRecordId,
      }

      if (!existing) {
        await tx.bodyMeasurement.create({ data: { date: reading.date, source: 'Renpho', ...data } })
        return 'synced'
      } else if ((Object.keys(data) as Array<keyof typeof data>).some(
        key => data[key] !== undefined && data[key] !== existing[key],
      )) {
        // Renpho can revise values without changing the record ID. Compare
        // supplied values too; missing optional fields leave stored data intact.
        await tx.bodyMeasurement.update({ where: { id: existing.id }, data })
        return 'updated'
      } else {
        return 'skipped'
      }
    })
    if (action === 'synced') synced++
    else if (action === 'updated') updated++
    else skipped++
  }

  const latestMeasurementDate = dailyReadings.length > 0
    ? new Date(Math.max(...dailyReadings.map(reading => reading.date.getTime()))).toISOString()
    : null
  return { synced, updated, skipped, total, scalesFound, latestMeasurementDate }
}
