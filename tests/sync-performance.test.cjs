const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
function load(path, mocks = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } })
  const exports = {}
  vm.runInNewContext(outputText, { exports, require: name => mocks[name] ?? require(name), Date, Error, process, Request, Response, URL, console, ...globals })
  return exports
}
const reading = i => ({ date: new Date(Date.UTC(2023, 0, i + 1)), weightLbs: 180, renphoRecordId: `record-${i}` })
function fixture(initial = []) {
  let rows = new Map(initial.map(row => [row.date.getTime(), { id: row.renphoRecordId, ...row }]))
  const counts = { reads: 0, transactions: 0, creates: 0, updates: 0 }
  let tail = Promise.resolve(), fail = false
  const measurement = {
    findMany: async ({ where }) => { counts.reads++; return where.date.in.map(date => rows.get(date.getTime())).filter(Boolean) },
    createMany: async ({ data }) => { counts.creates++; data.forEach(row => rows.set(row.date.getTime(), row)); return { count: data.length } },
  }
  const db = { bodyMeasurement: measurement }
  const client = load('src/lib/renpho-persistence.ts', {
    '@/lib/prisma': { default: db },
    '@/lib/sync-write': { withSyncWrite: async (fn, scope) => {
      assert.equal(scope, 'measurements')
      const waiting = tail; let release; tail = new Promise(resolve => { release = resolve }); await waiting
      counts.transactions++; const snapshot = structuredClone([...rows])
      try { return await fn({ bodyMeasurement: measurement, $executeRaw: async sql => {
        if (fail) throw new Error('database failure')
        counts.updates++
        // SQL binds data values; omitted keys are deliberately not cleared.
        const payload = JSON.parse(sql.values.find(value => typeof value === 'string' && value.startsWith('[{')))
        payload.forEach(row => Object.assign(rows.get(new Date(row.date).getTime()), row.data))
      } }) } catch (error) { rows = new Map(snapshot); throw error } finally { release() }
    } },
  })
  return { client, counts, rows: () => rows, fail: () => { fail = true } }
}
test('unchanged 750-day Renpho history costs one database read and zero transactions/writes', async () => {
  const history = Array.from({ length: 750 }, (_, i) => reading(i))
  const { client, counts } = fixture(history)
  const result = await client.persistRenphoReadings(history)
  assert.equal(result.skipped, 750)
  assert.deepEqual(counts, { reads: 1, transactions: 0, creates: 0, updates: 0 })
})
test('new and changed Renpho history is batched, retains missing fields, and counts every day', async () => {
  const history = Array.from({ length: 250 }, (_, i) => reading(i))
  const f = fixture(history.slice(0, 125).map(r => ({ ...r, weightLbs: 190, bodyFatPct: 25 })))
  const result = await f.client.persistRenphoReadings(history)
  assert.equal(result.synced, 125); assert.equal(result.updated, 125); assert.equal(result.skipped, 0)
  assert.equal(f.counts.transactions, 3)
  assert.equal(f.rows().get(history[0].date.getTime()).bodyFatPct, 25)
  assert.equal(f.rows().get(history[0].date.getTime()).weightLbs, 180)
  assert.equal((await f.client.persistRenphoReadings(history)).skipped, 250)
})
test('concurrent Renpho batches recheck rows and a failed update rolls back new rows in the batch', async () => {
  const f = fixture()
  const results = await Promise.all([f.client.persistRenphoReadings([reading(0)]), f.client.persistRenphoReadings([reading(0)])])
  assert.equal(results.reduce((sum, r) => sum + r.synced, 0), 1)
  const failed = fixture([{ ...reading(0), weightLbs: 190 }]); failed.fail()
  await assert.rejects(failed.client.persistRenphoReadings([reading(0), reading(1)]), /database failure/)
  assert.equal(failed.rows().size, 1)
  assert.equal(failed.rows().get(reading(0).date.getTime()).weightLbs, 190)
})
test('REST auth, sync and mutation quotas apply without limiting read-only status requests', () => {
  let now = 100000
  class Clock extends Date { static now() { return now } }
  const limiter = load('src/lib/rate-limit.ts', {}, { Date: Clock })
  const req = (path, method) => new Request('https://fitness.test' + path, { method })
  for (let i = 0; i < 100; i++) assert.equal(limiter.limitRestRequest(req('/api/renpho/sync','GET')), null)
  for (let i = 0; i < 5; i++) assert.equal(limiter.limitRestRequest(req('/api/renpho/auth','POST')), null)
  assert.equal(limiter.limitRestRequest(req('/api/renpho/auth','POST')).status, 429)
  for (let i = 0; i < 10; i++) assert.equal(limiter.limitRestRequest(req('/api/renpho/sync','POST')), null)
  assert.equal(limiter.limitRestRequest(req('/api/renpho/sync','POST')).headers.get('retry-after'), '6')
  for (let i = 0; i < 60; i++) assert.equal(limiter.limitRestRequest(req('/api/goals','PUT')), null)
  assert.equal(limiter.limitRestRequest(req('/api/freeweights/progress','PATCH')).status, 429)
  now += 6000
  assert.equal(limiter.limitRestRequest(req('/api/renpho/sync','POST')), null)
})
test('authenticated bearer calls skip session work but still enforce mutation quotas', async () => {
  let sessions = 0, limits = 0
  const { requireAuth } = load('src/lib/auth.ts', {
    '@/auth': { auth: async () => { sessions++; return null } },
    '@/lib/api-auth': { extractBearerToken: () => 'valid', isValidApiToken: () => true },
    '@/lib/rate-limit': { limitRestRequest: () => { limits++; return new Response('{}', { status: 429 }) } },
  })
  assert.equal((await requireAuth(new Request('https://fitness.test/api/goals', { method: 'POST' }))).status, 429)
  assert.equal(sessions, 0); assert.equal(limits, 1)
})

test('OCR assets are local and CSP permits Wasm without general eval or external workers', async () => {
  const { execFileSync } = require('node:child_process')
  const { resolve, dirname } = require('node:path')
  execFileSync(process.execPath, ['scripts/prepare-ocr.cjs'])
  assert.equal(readFileSync('public/ocr/worker.min.js').equals(readFileSync(require.resolve('tesseract.js/dist/worker.min.js'))), true)
  const core = dirname(require.resolve('tesseract.js-core/package.json'))
  assert.equal(readFileSync('public/ocr/core/tesseract-core-lstm.wasm').equals(readFileSync(resolve(core, 'tesseract-core-lstm.wasm'))), true)
  const { default: config } = load('next.config.ts')
  const headers = await config.headers()
  const policy = headers[0].headers.find(h => h.key === 'Content-Security-Policy').value
  assert.ok(policy.includes("worker-src 'self'"))
  assert.ok(policy.includes("'wasm-unsafe-eval'"))
  assert.equal(policy.includes("'unsafe-eval'"), false)
  assert.equal(policy.includes("worker-src 'self' blob:"), false)
  assert.ok(policy.includes('https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/'))
})

test('Renpho status is read-only and disconnect clears all legacy credential rows', async () => {
  let credentials = [{ id: 'old' }, { id: 'new', userId: 'user' }], upstream = 0
  const audits = []
  const route = load('src/app/api/renpho/sync/route.ts', {
    '@/lib/prisma': { default: { renphoCredential: {
      findFirst: async ({ orderBy }) => { assert.equal(orderBy.obtainedAt, 'desc'); return credentials.at(-1) },
      deleteMany: async () => { credentials = [] },
    } } },
    '@/lib/auth': { requireAuth: async () => null },
    '@/lib/renpho-sync': { runRenphoSync: async () => { upstream++ }, RenphoSyncError: class extends Error {} },
    '@/lib/audit-log': { logAudit: async (_req, _auth, action) => audits.push(action) },
  })
  const request = new Request('https://fitness.test/api/renpho/sync')
  assert.equal((await (await route.GET(request)).json()).connected, true)
  await route.DELETE(request)
  assert.equal((await (await route.GET(request)).json()).connected, false)
  assert.equal(upstream, 0)
  assert.deepEqual(audits, ['renpho.disconnect'])
})

test('Tonal read-only status still requests login for expired credentials that cannot refresh', async () => {
  const credential = { userId: 'user', expiresAt: 0, refreshToken: null }
  const route = load('src/app/api/tonal/sync/route.ts', {
    '@/lib/prisma': { default: { tonalCredential: { findFirst: async () => credential } } },
    '@/lib/auth': { requireAuth: async () => null },
    '@/lib/tonal-sync': { TonalSyncError: class extends Error {} },
    '@/lib/audit-log': { logAudit: async () => {} },
    '@/lib/sync-write': { SyncInputError: class extends Error {} },
  })
  const request = new Request('https://fitness.test/api/tonal/sync')
  assert.equal((await (await route.GET(request)).json()).connected, false)
  credential.refreshToken = 'stored'
  assert.equal((await (await route.GET(request)).json()).connected, true)
})
