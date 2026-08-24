// Renpho API client (reverse-engineered, no official docs)
// Auth via a proprietary AES-128-ECB encrypted JSON envelope over HTTPS —
// every request body is `{ encryptData: base64(AES-128-ECB(JSON)) }` and
// every response's `data` field is decrypted the same way.
// Reference: danvaneijck/renpho-api (Python), itself based on
// forkerer/RenphoGarminSync-CLI's reverse-engineering of the Renpho app.

import { createCipheriv, createDecipheriv } from 'crypto'

const API_BASE_URL = 'https://cloud.renpho.com'
// Renpho's own hardcoded AES-128 key, baked into their mobile app — not a
// secret we manage, just a fixed transport-obfuscation key.
const ENCRYPTION_KEY = 'ed*wijdi$h6fe3ew'
const APP_VERSION = '6.6.0'
const PLATFORM = 'android'
const SYSTEM_VERSION = '11'

const ENDPOINTS = {
  login: 'renpho-aggregation/user/login',
  deviceInfo: 'renpho-aggregation/device/count',
  measurements: 'RenphoHealth/scale/queryAllMeasureDataList',
  bodyCompositionMeasurements: 'RenphoHealth/scale/queryBodyCompositionMeasureData',
} as const

const BODY_WEIGHT_SCALES = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '0A',
  '0B', '0C', '0D', '0E', '0F', '10', '11', '12', '13', '14',
]

const SUCCESS_CODES = new Set(['0', '101', '200', '20000'])

// --- AES-128-ECB + PKCS7 envelope, matching the Renpho app's transport format ---

function aesEncrypt(plaintext: string): string {
  const cipher = createCipheriv('aes-128-ecb', Buffer.from(ENCRYPTION_KEY, 'utf8'), null)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return encrypted.toString('base64')
}

function aesDecrypt(encryptedB64: string): string {
  const decipher = createDecipheriv('aes-128-ecb', Buffer.from(ENCRYPTION_KEY, 'utf8'), null)
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedB64, 'base64')), decipher.final()])
  return decrypted.toString('utf8')
}

function encryptRequest(obj: unknown): { encryptData: string } {
  return { encryptData: aesEncrypt(JSON.stringify(obj)) }
}

/** Encrypt an empty byte string (not `{}`) — some endpoints (device info) expect this on the first attempt. */
function encryptEmptyBytes(): { encryptData: string } {
  return { encryptData: aesEncrypt('') }
}

function decryptResponse<T = unknown>(encryptedData: string): T {
  return JSON.parse(aesDecrypt(encryptedData))
}

export class RenphoAPIError extends Error {
  code: unknown
  constructor(context: string, code: unknown, msg: string) {
    super(`${context} failed: code=${code}, msg=${msg}`)
    this.code = code
  }
}

function checkResponse(result: { code?: unknown; msg?: string }, context: string) {
  const msg = (result.msg ?? '').toString()
  if (msg.toLowerCase() === 'success' || SUCCESS_CODES.has(String(result.code))) return
  throw new RenphoAPIError(context, result.code, msg)
}

export interface RenphoLoginResult {
  token: string
  userId: string
}

/** Authenticate with Renpho via email/password. Returns a session token + userId. */
export async function loginToRenpho(email: string, password: string): Promise<RenphoLoginResult> {
  const payload = {
    questionnaire: {},
    login: {
      password,
      areaCode: 'US',
      appRevision: APP_VERSION,
      cellphoneType: 'fitness-tracker',
      systemType: SYSTEM_VERSION,
      email,
      platform: PLATFORM,
    },
    bindingList: { deviceTypes: BODY_WEIGHT_SCALES },
  }

  const res = await fetch(`${API_BASE_URL}/${ENDPOINTS.login}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(encryptRequest(payload)),
  })
  if (!res.ok) throw new Error(`Renpho login HTTP ${res.status}: ${await res.text()}`)

  const result = await res.json()
  checkResponse(result, 'Login')
  const data = decryptResponse<{ login?: { token?: string; id?: string | number } }>(result.data)
  const token = data.login?.token
  const userId = data.login?.id
  if (!token || userId == null) {
    throw new RenphoAPIError('Login', null, 'No token/id in login response')
  }
  return { token, userId: String(userId) }
}

function authHeaders(token: string, userId: string): Record<string, string> {
  return {
    token,
    userId,
    appVersion: APP_VERSION,
    platform: PLATFORM,
  }
}

async function renphoPostRaw<T = unknown>(
  endpoint: string,
  encryptedBody: { encryptData: string },
  token: string,
  userId: string,
  context: string,
): Promise<{ ok: true; data: T | null } | { ok: false; status: number; text: string }> {
  const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token, userId) },
    body: JSON.stringify(encryptedBody),
  })
  if (!res.ok) return { ok: false, status: res.status, text: await res.text() }

  const result = await res.json()
  checkResponse(result, context)
  if (!result.data) return { ok: true, data: null }
  return { ok: true, data: decryptResponse<T>(result.data) }
}

async function renphoPost<T = unknown>(
  endpoint: string,
  body: unknown,
  token: string,
  userId: string,
  context: string,
): Promise<T | null> {
  const result = await renphoPostRaw<T>(endpoint, encryptRequest(body), token, userId, context)
  if (!result.ok) throw new Error(`Renpho ${context} HTTP ${result.status}: ${result.text}`)
  return result.data
}

interface RenphoScaleInfo {
  tableName: string
  count: number
  userIds?: (string | number)[]
}

/**
 * Get device info, including per-scale measurement table names and record
 * counts. Mirrors the reference client: the real Renpho app's first attempt
 * encrypts an *empty byte string* (not `{}`) for this specific endpoint;
 * only on an HTTP-level failure does it fall back to encrypted `{}`. Sending
 * `{}` as the primary (and only) attempt — the original bug here — got a
 * 200 back but with no usable scale data, which silently produced zero
 * measurements on every sync with no error surfaced.
 */
export async function getRenphoDeviceInfo(token: string, userId: string): Promise<{ scale: RenphoScaleInfo[] }> {
  type DeviceInfoData = { scale?: RenphoScaleInfo[] }

  let result = await renphoPostRaw<DeviceInfoData>(
    ENDPOINTS.deviceInfo,
    encryptEmptyBytes(),
    token,
    userId,
    'GetDeviceInfo (empty-bytes)',
  )
  if (!result.ok) {
    result = await renphoPostRaw<DeviceInfoData>(
      ENDPOINTS.deviceInfo,
      encryptRequest({}),
      token,
      userId,
      'GetDeviceInfo (empty-object fallback)',
    )
  }
  if (!result.ok) {
    throw new Error(`Renpho GetDeviceInfo HTTP ${result.status}: ${result.text}`)
  }

  const scale = result.data?.scale ?? []
  console.log(`[renpho] device info: ${scale.length} scale(s) found`)
  return { scale }
}

/** Raw measurement record shape as returned by Renpho (fields vary by scale model). */
export interface RenphoMeasurement {
  id?: string | number
  timeStamp?: number // epoch seconds
  weight?: number // kg
  bmi?: number
  bodyfat?: number // %
  water?: number // %
  muscle?: number // %
  bone?: number // %
  bmr?: number // kcal/day
  visfat?: number // level
  subfat?: number // %
  protein?: number // %
  bodyage?: number // years
  sinew?: number // kg, lean body mass
  fatFreeWeight?: number // kg
  heartRate?: number // bpm
  [key: string]: unknown
}

function extractRecords(pageData: unknown): RenphoMeasurement[] | null {
  if (Array.isArray(pageData)) return pageData.length > 0 ? pageData : null
  if (pageData && typeof pageData === 'object') {
    const obj = pageData as Record<string, unknown>
    for (const key of ['list', 'data', 'records', 'measurements']) {
      const value = obj[key]
      if (Array.isArray(value)) return value.length > 0 ? (value as RenphoMeasurement[]) : null
    }
    if ('weight' in obj) return [obj as RenphoMeasurement]
  }
  return null
}

async function fetchMeasurementPages(
  endpoint: string,
  tableName: string,
  userId: string,
  token: string,
  totalCount: number | null,
  pageSize = 50,
): Promise<RenphoMeasurement[]> {
  const all: RenphoMeasurement[] = []
  let page = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (totalCount != null && all.length >= totalCount) break
    const pageData = await renphoPost(
      endpoint,
      { pageNum: page, pageSize, userIds: [String(userId)], tableName },
      token,
      userId,
      `Measurements page ${page}`,
    )
    const records = extractRecords(pageData)
    if (!records) break
    all.push(...records)
    if (records.length < pageSize) break
    page++
  }
  return all
}

/**
 * High-level helper: log in (if needed), discover scale tables, and fetch
 * every measurement across them. Mirrors RenphoClient.get_all_measurements().
 */
export async function fetchAllRenphoMeasurements(token: string, userId: string): Promise<{ measurements: RenphoMeasurement[]; scalesFound: number }> {
  const { scale } = await getRenphoDeviceInfo(token, userId)
  if (scale.length === 0) {
    console.warn('[renpho] device info returned zero scales - nothing to sync. Check credentials/API changes.')
  }

  const seen = new Set<string>()
  const all: RenphoMeasurement[] = []

  for (const s of scale) {
    if (!s.tableName) continue
    const uid = s.userIds && s.userIds.length > 0 && !s.userIds.map(String).includes(userId)
      ? String(s.userIds[0])
      : userId

    // Body-composition endpoint first (impedance scales); the server-side
    // count is unreliable for these, so always attempt it. Fall back to the
    // legacy endpoint (weight-only scales) when it comes back empty.
    let records = await fetchMeasurementPages(
      ENDPOINTS.bodyCompositionMeasurements,
      s.tableName,
      uid,
      token,
      null,
    )
    if (records.length === 0 && s.count > 0) {
      records = await fetchMeasurementPages(ENDPOINTS.measurements, s.tableName, uid, token, s.count)
    }
    console.log(`[renpho] table=${s.tableName} reportedCount=${s.count} fetched=${records.length}`)

    for (const m of records) {
      const key = `${s.tableName}:${m.id ?? ''}`
      if (m.id != null && seen.has(key)) continue
      if (m.id != null) seen.add(key)
      all.push(m)
    }
  }

  all.sort((a, b) => (b.timeStamp ?? 0) - (a.timeStamp ?? 0))
  return { measurements: all, scalesFound: scale.length }
}

const KG_TO_LBS = 2.20462

/** Mapped shape used for storage — Renpho's kg fields converted to lbs to match the app's unit convention. */
export interface MappedBodyMeasurement {
  date: Date // local calendar date, midnight
  weightLbs: number
  bmi?: number
  bodyFatPct?: number
  waterPct?: number
  musclePct?: number
  boneMassPct?: number
  bmr?: number
  visceralFatLevel?: number
  subcutaneousFatPct?: number
  proteinPct?: number
  bodyAgeYears?: number
  leanBodyMassLbs?: number
  fatFreeWeightLbs?: number
  heartRateBpm?: number
  renphoRecordId?: string
}

export function mapRenphoMeasurement(m: RenphoMeasurement): MappedBodyMeasurement | null {
  if (m.weight == null) return null
  const ts = m.timeStamp ? new Date(m.timeStamp * 1000) : new Date()
  const date = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate())

  return {
    date,
    weightLbs: m.weight * KG_TO_LBS,
    bmi: m.bmi,
    bodyFatPct: m.bodyfat,
    waterPct: m.water,
    musclePct: m.muscle,
    boneMassPct: m.bone,
    bmr: m.bmr,
    visceralFatLevel: m.visfat,
    subcutaneousFatPct: m.subfat,
    proteinPct: m.protein,
    bodyAgeYears: m.bodyage,
    leanBodyMassLbs: m.sinew != null ? m.sinew * KG_TO_LBS : undefined,
    fatFreeWeightLbs: m.fatFreeWeight != null ? m.fatFreeWeight * KG_TO_LBS : undefined,
    heartRateBpm: m.heartRate,
    renphoRecordId: m.id != null ? String(m.id) : undefined,
  }
}

/**
 * Group mapped measurements by calendar date and keep the lowest-weight
 * reading per day (per user preference — same-day readings favor the
 * lowest number, e.g. a morning weigh-in vs. a post-meal one).
 */
export function pickDailyReadings(measurements: MappedBodyMeasurement[]): MappedBodyMeasurement[] {
  const byDay = new Map<string, MappedBodyMeasurement>()
  for (const m of measurements) {
    const key = m.date.toISOString().slice(0, 10)
    const existing = byDay.get(key)
    if (!existing || m.weightLbs < existing.weightLbs) {
      byDay.set(key, m)
    }
  }
  return Array.from(byDay.values())
}
