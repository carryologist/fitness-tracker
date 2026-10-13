const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
function load(path, mocks = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  const exports = {}
  vm.runInNewContext(outputText, { exports, require: name => mocks[name] ?? require(name),
    Date, Error, console, AbortSignal, ...globals }, { filename: path })
  return exports
}
const matching = load('src/lib/workout-match.ts')
const workout = (id, source = 'Tonal', time = '08:05', extra = {}) => ({ id, source,
  activity: 'Weight Lifting', date: new Date(`2026-10-12T${time}:00Z`), minutes: 40,
  weightLifted: source === 'Tonal' ? 5000 : null, notes: 'Traditional Strength Training',
  tonalWorkoutId: source === 'Tonal' ? id : null, pelotonWorkoutId: source === 'Peloton' ? id : null,
  deletedAt: null, ...extra })

test('matching rejects separate same-day sessions, date-only entries, different activities and ambiguous candidates', () => {
  const a = workout('a')
  assert.equal(matching.sameWorkout(a, workout('b', 'Peloton', '08:07'), true), true)
  for (const b of [workout('b', 'Peloton', '17:05'), workout('b', 'Tonal', '12:00'),
    workout('b', 'Tonal', '08:07', { activity: 'Cycling' }), workout('b', 'Tonal', '08:07', { minutes: 10 })]) {
    assert.equal(matching.sameWorkout(a, b), false)
  }
  assert.equal(matching.uniqueWorkoutMatch([a, workout('b')], workout('incoming')), undefined)
})

// A transactional fake enforces the same lock boundary and restores writes on
// failure. The tests run the real orchestrators and the real transaction helper.
function database(initial = []) {
  let rows = structuredClone(initial)
  let tail = Promise.resolve()
  let failAdoption = false
  const matches = (row, where = {}) => Object.entries(where).every(([key, val]) => {
    if (key === 'date') return row.date >= val.gte && row.date <= val.lte
    if (val && typeof val === 'object' && val.in) return val.in.includes(row[key])
    return row[key] === val
  })
  const session = {
    findMany: async ({ where } = {}) => rows.filter(row => matches(row, where)),
    findUnique: async ({ where }) => rows.find(row => matches(row, where)) ?? null,
    updateMany: async ({ where, data }) => {
      if (failAdoption && where.id === 'tonal') throw new Error('adoption failed')
      const found = rows.filter(row => matches(row, where))
      found.forEach(row => Object.assign(row, data))
      return { count: found.length }
    },
    create: async ({ data }) => {
      if (rows.some(row => (data.pelotonWorkoutId && row.pelotonWorkoutId === data.pelotonWorkoutId) ||
        (data.tonalWorkoutId && row.tonalWorkoutId === data.tonalWorkoutId))) throw new Error('duplicate external ID')
      const row = { id: `new-${rows.length}`, deletedAt: null, ...data }
      rows.push(row)
      return row
    },
  }
  const credential = { id: 'credential', userId: 'user', idToken: 'old', refreshToken: 'refresh', expiresAt: Math.floor(Date.now() / 1000) + 3600 }
  const db = { workoutSession: session,
    tonalCredential: { findFirst: async () => credential, update: async ({ data }) => Object.assign(credential, data) },
    pelotonCredential: { findFirst: async () => ({ sessionId: 'session', userId: 'user' }) },
    $transaction: async fn => {
      const before = tail
      let release
      tail = new Promise(resolve => { release = resolve })
      await before
      const snapshot = structuredClone(rows)
      try { return await fn({ workoutSession: session, $executeRaw: async () => 1 }) }
      catch (err) { rows = snapshot; throw err }
      finally { release() }
    },
  }
  const boundary = load('src/lib/sync-write.ts', { '@/lib/prisma': { default: db } })
  const mocks = { '@/lib/prisma': { default: db }, '@/lib/sync-write': boundary,
    '@/lib/workout-match': matching, '@/lib/crypto': { decryptSecret: x => x, encryptSecret: x => x } }
  return { mocks, db, rows: () => rows, failAdoption: () => { failAdoption = true } }
}
function tonalClient(fixture, api = {}) {
  return load('src/lib/tonal-sync.ts', { ...fixture.mocks, '@/lib/tonal': {
    fetchTonalActivitySummaries: async () => [], refreshTonalToken: async () => ({ id_token: 'new' }),
    computeExpiresAt: () => Math.floor(Date.now() / 1000) + 3600, getUserIdFromToken: async () => 'user',
    mapTonalActivity: x => x, ...api,
  } })
}
test('Tonal 401 retry uses the refreshed token; non-auth upstream failures do not trigger refresh', async () => {
  const tokens = []
  const client = tonalClient(database(), { fetchTonalActivitySummaries: async token => {
    tokens.push(token)
    if (token === 'old') throw new Error('API failed (401)')
    return []
  } })
  await client.runTonalSync()
  assert.deepEqual(tokens, ['old', 'new'])
  let refreshes = 0
  const failing = tonalClient(database(), { fetchTonalActivitySummaries: async () => { throw new Error('API failed (500)') },
    refreshTonalToken: async () => { refreshes++; return {} } })
  await assert.rejects(failing.runTonalSync(), err => err.status === 502)
  assert.equal(refreshes, 0)
})

test('concurrent imports of the same workout write once; a second same-day strength workout stays separate', async () => {
  const fixture = database([workout('tonal')])
  const incoming = workout('peloton', 'Peloton', '17:05')
  const client = load('src/lib/peloton-sync.ts', { ...fixture.mocks, '@/lib/peloton': {
    fetchPelotonWorkouts: async () => ({ data: [{ ...incoming, status: 'COMPLETE', overall_summary: {} }], page_count: 1 }),
    mapPelotonWorkout: () => incoming,
  } })
  const results = await Promise.all([client.runPelotonSync(), client.runPelotonSync()])
  assert.equal(results.reduce((sum, r) => sum + r.synced, 0), 1)
  assert.equal(fixture.rows().length, 2)
  assert.equal(fixture.rows()[0].pelotonWorkoutId, null)
})

test('a second Peloton strength session cannot disappear into an already-linked Tonal row', async () => {
  const fixture = database([workout('tonal', 'Tonal', '08:05', { pelotonWorkoutId: 'first' })])
  const incoming = workout('second', 'Peloton', '08:07')
  const client = load('src/lib/peloton-sync.ts', { ...fixture.mocks, '@/lib/peloton': {
    fetchPelotonWorkouts: async () => ({ data: [{ ...incoming, status: 'COMPLETE', overall_summary: {} }], page_count: 1 }),
    mapPelotonWorkout: () => incoming,
  } })
  assert.equal((await client.runPelotonSync()).synced, 1)
  assert.equal(fixture.rows().length, 2)
})

test('failed adoption rolls back retirement; stale or conflicting merge candidates are ignored', async () => {
  const fixture = database([workout('tonal'), workout('peloton', 'Peloton', '08:07')])
  const client = load('src/lib/workout-dedupe.ts', fixture.mocks)
  const candidates = await client.findWeightLiftingMergeCandidates()
  assert.equal(candidates.length, 1)
  fixture.failAdoption()
  await assert.rejects(client.mergeWeightLiftingCandidates(candidates), /adoption failed/)
  assert.equal(fixture.rows()[1].deletedAt, null)
  assert.equal(fixture.rows()[1].pelotonWorkoutId, 'peloton')
  fixture.rows()[0].pelotonWorkoutId = 'other'
  assert.equal(await client.mergeWeightLiftingCandidates(candidates), 0)
})

test('sync limits reject invalid/unbounded inputs before fetching', async () => {
  const client = tonalClient(database())
  for (const limit of [0, -1, NaN, Infinity, 1.5, 2001]) await assert.rejects(client.runTonalSync(limit), /Sync limit/)
})

test('upstream requests carry a 15-second abort signal', async () => {
  let options
  const signal = {}
  const client = load('src/lib/integration-fetch.ts', {}, {
    AbortSignal: { timeout: ms => { assert.equal(ms, 15000); return signal } },
    fetch: async (_url, init) => { options = init; return new Response('{}') },
  })
  await client.integrationFetch('https://example.test', { method: 'POST' })
  assert.equal(options.signal, signal)
  assert.equal(options.method, 'POST')
})

test('Tonal detail retries also pick up the refreshed token', async () => {
  const fixture = database()
  const tokens = []
  const activity = workout('incoming', 'Tonal', '08:05', { activityId: 'incoming', total_volume: 5000 })
  const client = tonalClient(fixture, {
    fetchTonalActivitySummaries: async () => [activity],
    fetchTonalWorkoutActivity: async token => {
      tokens.push(token)
      if (token === 'old') throw new Error('detail failed (401)')
      return { duration_seconds: 2400 }
    },
  })
  assert.equal((await client.runTonalSync()).synced, 1)
  assert.deepEqual(tokens, ['old', 'new'])
})

test('matching echo workouts merges in either sync order and retains both external IDs', async () => {
  for (const first of ['Tonal', 'Peloton']) {
    const fixture = database([workout(first === 'Tonal' ? 'tonal' : 'peloton', first)])
    let result
    if (first === 'Tonal') {
      const incoming = workout('peloton', 'Peloton', '08:07')
      const client = load('src/lib/peloton-sync.ts', { ...fixture.mocks, '@/lib/peloton': {
        fetchPelotonWorkouts: async () => ({ data: [{ ...incoming, status: 'COMPLETE', overall_summary: {} }], page_count: 1 }),
        mapPelotonWorkout: () => incoming,
      } })
      result = await client.runPelotonSync()
    } else {
      const client = tonalClient(fixture, { fetchTonalActivitySummaries: async () => [
        workout('tonal', 'Tonal', '08:07', { activityId: 'tonal', duration: 2400, total_volume: 5000 }),
      ] })
      result = await client.runTonalSync()
    }
    assert.equal(result.updated, 1)
    assert.equal(fixture.rows().length, 1)
    assert.equal(fixture.rows()[0].source, 'Tonal')
    assert.equal(fixture.rows()[0].tonalWorkoutId, 'tonal')
    assert.equal(fixture.rows()[0].pelotonWorkoutId, 'peloton')
  }
})

test('known first pages do not hide missing workouts on later pages, and the requested limit is exact', async () => {
  const fixture = database([workout('known', 'Peloton')])
  const incoming = workout('new', 'Peloton', '17:05')
  const pages = []
  const client = load('src/lib/peloton-sync.ts', { ...fixture.mocks, '@/lib/peloton': {
    fetchPelotonWorkouts: async (_token, _user, page) => {
      pages.push(page)
      const base = page === 0 ? workout('known', 'Peloton') : incoming
      return { data: Array.from({ length: 50 }, () => ({ ...base, status: 'COMPLETE', overall_summary: {} })), page_count: 9 }
    },
    mapPelotonWorkout: x => x,
  } })
  const result = await client.runPelotonSync(51)
  assert.deepEqual(pages, [0, 1])
  assert.equal(result.total, 51)
  assert.equal(result.synced, 1)
})

test('simultaneous Peloton and Tonal imports produce one canonical session', async () => {
  const fixture = database()
  const incoming = workout('peloton', 'Peloton', '08:05')
  const peloton = load('src/lib/peloton-sync.ts', { ...fixture.mocks, '@/lib/peloton': {
    fetchPelotonWorkouts: async () => ({ data: [{ ...incoming, status: 'COMPLETE', overall_summary: {} }], page_count: 1 }),
    mapPelotonWorkout: () => incoming,
  } })
  const tonal = tonalClient(fixture, { fetchTonalActivitySummaries: async () => [
    workout('tonal', 'Tonal', '08:07', { activityId: 'tonal', duration: 2400, total_volume: 5000 }),
  ] })
  await Promise.all([peloton.runPelotonSync(), tonal.runTonalSync()])
  assert.equal(fixture.rows().length, 1)
  assert.equal(fixture.rows()[0].source, 'Tonal')
  assert.equal(fixture.rows()[0].pelotonWorkoutId, 'peloton')
  assert.equal(fixture.rows()[0].tonalWorkoutId, 'tonal')
})
