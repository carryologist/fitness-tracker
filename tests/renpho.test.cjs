const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { createCipheriv, createDecipheriv } = require('node:crypto')
const vm = require('node:vm')
const ts = require('typescript')

// Compile the real client/orchestrator without Next.js or live credentials.
function loadTs(path, overrides = {}, globals = {}) {
  const source = readFileSync(resolve(__dirname, '..', path), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  const exports = {}
  vm.runInNewContext(outputText, {
    exports, require: name => overrides[name] ?? (name === '@/lib/integration-fetch' ? loadTs('src/lib/integration-fetch.ts', {}, globals) : require(name)),
    Buffer, Date, Error, AbortSignal, process, console, ...globals,
  }, { filename: path })
  return exports
}

const key = Buffer.from('ed*wijdi$h6fe3ew')
function response(data) {
  const cipher = createCipheriv('aes-128-ecb', key, null)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()])
  return new Response(JSON.stringify({ code: 200, data: encrypted.toString('base64') }))
}
function requestBody(options) {
  const decipher = createDecipheriv('aes-128-ecb', key, null)
  const encrypted = Buffer.from(JSON.parse(options.body).encryptData, 'base64')
  const text = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString()
  return text ? JSON.parse(text) : null
}

test('fetch includes new legacy readings even when composition history is nonempty and count is zero', async () => {
  const client = loadTs('src/lib/renpho.ts', {}, { fetch: async (url, options) => {
    if (url.endsWith('/device/count')) return response({ scale: [{ tableName: 'scale', count: 0 }] })
    assert.equal(requestBody(options).userIds[0], '2132938788905981073')
    return response(url.endsWith('queryBodyCompositionMeasureData')
      ? [{ id: 'old', timeStamp: 1700000000, weight: 90 }]
      : [{ id: 'new', timeStamp: 1800000000, weight: 85 }, { id: 'old', timeStamp: 1700000000, weight: 90 }])
  } })
  const { measurements } = await client.fetchAllRenphoMeasurements('token', '2132938788905981073')
  assert.deepEqual(Array.from(measurements, m => m.id), ['new', 'old'])
})

test('legacy pagination does not stop at a stale device count', async () => {
  const client = loadTs('src/lib/renpho.ts', {}, { fetch: async (url, options) => {
    if (url.endsWith('/device/count')) return response({ scale: [{ tableName: 'scale', count: 1 }] })
    if (url.endsWith('queryBodyCompositionMeasureData')) return response([])
    const page = requestBody(options).pageNum
    return response(page === 1
      ? Array.from({ length: 50 }, (_, i) => ({ id: String(i), timeStamp: 1700000000 + i, weight: 90 }))
      : [{ id: 'new', timeStamp: 1800000000, weight: 85 }])
  } })
  const { measurements } = await client.fetchAllRenphoMeasurements('token', 'user')
  assert.equal(measurements.length, 51)
  assert.equal(measurements[0].id, 'new')
})

function syncClient(existing, reading) {
  const writes = []
  const client = loadTs('src/lib/renpho-sync.ts', {
    '@/lib/prisma': { default: {
      renphoCredential: { findFirst: async () => ({ token: 'token', userId: 'user', obtainedAt: new Date() }) },
      bodyMeasurement: {
        findUnique: async () => existing,
        update: async args => writes.push(args),
        create: async args => writes.push(args),
      },
    } },
    '@/lib/sync-write': { withSyncWrite: fn => fn({ bodyMeasurement: {
      findUnique: async () => existing, update: async args => writes.push(args), create: async args => writes.push(args),
    } }) },
    '@/lib/crypto': { decryptSecret: value => value },
    '@/lib/renpho': {
      fetchAllRenphoMeasurements: async () => ({ measurements: [reading], scalesFound: 1 }),
      mapRenphoMeasurement: value => value,
      pickDailyReadings: values => values,
    },
  })
  return { client, writes }
}

test('same record ID with changed weight/composition updates stored data', async () => {
  const reading = { date: new Date('2026-10-12T00:00:00Z'), renphoRecordId: 'same', weightLbs: 180, bodyFatPct: 20 }
  const { client, writes } = syncClient({ ...reading, id: 'db', weightLbs: 190, bodyFatPct: 25 }, reading)
  const result = await client.runRenphoSync()
  assert.equal(result.updated, 1)
  assert.equal(writes[0].data.weightLbs, 180)
  assert.equal(result.latestMeasurementDate, '2026-10-12T00:00:00.000Z')
})

test('missing record IDs do not hide changes', async () => {
  const reading = { date: new Date('2026-10-12T00:00:00Z'), weightLbs: 180 }
  const { client } = syncClient({ ...reading, id: 'db', renphoRecordId: null, weightLbs: 190 }, reading)
  assert.equal((await client.runRenphoSync()).updated, 1)
})

test('unchanged reading is skipped, including absent optional fields stored as null', async () => {
  const reading = { date: new Date('2026-10-12T00:00:00Z'), weightLbs: 180, renphoRecordId: 'same' }
  const { client, writes } = syncClient({ ...reading, id: 'db', bmi: null }, reading)
  assert.equal((await client.runRenphoSync()).skipped, 1)
  assert.equal(writes.length, 0)
})

test('a failed endpoint cannot be reported as a successful partial sync', async () => {
  const client = loadTs('src/lib/renpho.ts', {}, { fetch: async url => {
    if (url.endsWith('/device/count')) return response({ scale: [{ tableName: 'scale', count: 1 }] })
    if (url.endsWith('queryBodyCompositionMeasureData')) return response([{ id: 'old', weight: 90 }])
    return new Response('Unavailable', { status: 503 })
  } })
  await assert.rejects(client.fetchAllRenphoMeasurements('token', 'user'), /HTTP 503/)
})

test('daily selection retains the lowest-weight reading across endpoints', () => {
  const client = loadTs('src/lib/renpho.ts')
  const records = [
    { id: 'high', weight: 90, timeStamp: 1791806400 },
    { id: 'low', weight: 85, timeStamp: 1791802800 },
  ].map(client.mapRenphoMeasurement)
  const daily = client.pickDailyReadings(records)
  assert.equal(daily.length, 1)
  assert.equal(daily[0].renphoRecordId, 'low')
})

test('repeated full pages fail instead of looping forever or reporting a partial success', async () => {
  let pages = 0
  const client = loadTs('src/lib/renpho.ts', {}, { fetch: async url => {
    if (url.endsWith('/device/count')) return response({ scale: [{ tableName: 'scale', count: 0 }] })
    pages++
    return response(Array.from({ length: 50 }, (_, i) => ({ id: String(i), weight: 90 })))
  } })
  await assert.rejects(client.fetchAllRenphoMeasurements('token', 'user'), /repeated a page/)
  assert.equal(pages, 2)
})

test('Renpho calendar buckets are independent of runtime timezone and missing timestamps are not assigned today', () => {
  const previous = process.env.TZ
  const client = loadTs('src/lib/renpho.ts')
  try {
    for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
      process.env.TZ = zone
      const mapped = client.mapRenphoMeasurement({ weight: 90, timeStamp: Date.parse('2026-10-13T02:00:00Z') / 1000 })
      assert.equal(mapped.date.toISOString(), '2026-10-13T00:00:00.000Z')
    }
    assert.equal(client.mapRenphoMeasurement({ weight: 90 }), null)
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous }
})
