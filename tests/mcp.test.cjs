const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function loadTs(path, mocks = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(resolve(__dirname, '..', path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  const exports = {}
  vm.runInNewContext(outputText, {
    exports, require: name => mocks[name] ?? require(name),
    Buffer, Date, process, Request, Response, Headers, URL, console, ...globals,
  })
  return exports
}

function fixture() {
  const token = 'test-token-for-mcp-security'
  const freeWeights = loadTs('src/lib/freeWeights.ts')
  const audits = []
  const row = { id: 'workout', date: new Date('2026-10-12T12:00:00Z'), source: 'Gym', activity: 'Cycling', minutes: 30, deletedAt: null }
  const prisma = {
    workoutSession: {
      findMany: async () => [row], findUnique: async () => row,
      create: async ({ data }) => ({ id: 'created', ...data }),
      update: async ({ data }) => ({ ...row, ...data }),
    },
    goal: { findMany: async () => [] },
    freeWeightProgress: { findMany: async () => [], upsert: async ({ create }) => create },
    pelotonCredential: { findFirst: async () => null },
    tonalCredential: { findFirst: async () => null },
  }
  const result = { synced: 1, updated: 0, skipped: 0, total: 1 }
  const route = loadTs('src/app/api/mcp/[transport]/route.ts', {
    '@/lib/prisma': { default: prisma },
    '@/lib/api-auth': { isValidApiToken: value => value === token },
    '@/lib/peloton-sync': { runPelotonSync: async () => result },
    '@/lib/tonal-sync': { runTonalSync: async () => result },
    '@/lib/freeWeights': freeWeights,
    '@/lib/rate-limit': { limitMcp: () => null, limitSync: () => null },
    '@/lib/audit-log': { logAudit: async (req, _session, action) => audits.push({ action, path: new URL(req.url).pathname }) },
  })
  let id = 0
  async function rpc(method, params, { bearer = token, protocol = '2025-11-25' } = {}) {
    if (protocol === '2026-07-28') {
      params = { ...params, _meta: {
        'io.modelcontextprotocol/protocolVersion': protocol,
        'io.modelcontextprotocol/clientCapabilities': {},
        'io.modelcontextprotocol/clientInfo': { name: 'regression-test', version: '1' },
      } }
    }
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': protocol }
    if (protocol === '2026-07-28') {
      headers['MCP-Method'] = method
      if (params.name) headers['MCP-Name'] = params.name
    }
    if (bearer) headers.Authorization = `Bearer ${bearer}`
    const res = await route.POST(new Request('https://fitness.example/api/mcp/mcp', {
      method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
    }))
    const text = await res.text()
    let body
    if (res.headers.get('content-type')?.includes('text/event-stream')) {
      const line = text.split('\n').find(line => line.startsWith('data: '))
      body = line ? JSON.parse(line.slice(6)) : null
    } else {
      body = text ? JSON.parse(text) : null
    }
    return { res, body }
  }
  return { rpc, audits, freeWeights }
}

test('real MCP handler rejects missing or invalid bearer tokens', async () => {
  const { rpc } = fixture()
  for (const bearer of [null, 'invalid']) {
    assert.equal((await rpc('tools/list', {}, { bearer })).res.status, 401)
  }
})

test('SDK v2 preserves discovery and every existing tool for Streamable HTTP clients', async () => {
  const { rpc, audits, freeWeights } = fixture()
  const init = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'regression-test', version: '1' } })
  assert.equal(init.res.status, 200)
  assert.equal(init.body.result.serverInfo.name, 'fitness-tracker')
  const calls = {
    list_workouts: {}, get_workout: { id: 'workout' },
    create_workout: { date: '2026-10-12', source: 'Gym', activity: 'Cycling', minutes: 30 },
    update_workout: { id: 'workout', minutes: 45 }, delete_workout: { id: 'workout' },
    list_freeweight_progress: {},
    set_freeweight_progress: { exerciseId: freeWeights.FREE_WEIGHT_ROUTINES[0].exercises[0].id, reps: 10, weightPerDumbbell: 10 },
    list_goals: {}, peloton_status: {}, sync_peloton: {}, tonal_status: {}, sync_tonal: {},
  }
  const listed = await rpc('tools/list', {})
  assert.equal(listed.res.status, 200)
  assert.deepEqual(listed.body.result.tools.map(tool => tool.name).sort(), Object.keys(calls).sort())
  for (const [name, args] of Object.entries(calls)) {
    const called = await rpc('tools/call', { name, arguments: args })
    assert.equal(called.res.status, 200, name)
    assert.equal(called.body.error, undefined, name)
    assert.notEqual(called.body.result.isError, true, name)
    assert.ok(called.body.result.content.length, name)
  }
  assert.equal(audits.length, 6)
  assert.ok(audits.every(row => row.path === '/api/mcp/mcp'))
  const invalid = await rpc('tools/call', { name: 'create_workout', arguments: { date: '2026-10-12', source: 'Gym', activity: 'Cycling', minutes: -1 } })
  assert.ok(invalid.body.error || invalid.body.result?.isError)
})

test('current MCP protocol supports authenticated discovery', async () => {
  const { rpc, audits } = fixture()
  const { res, body } = await rpc('server/discover', {}, { protocol: '2026-07-28' })
  assert.equal(res.status, 200, JSON.stringify(body))
  assert.equal(body.error, undefined)
  assert.ok(body.result)
  const called = await rpc('tools/call', {
    name: 'create_workout', arguments: { date: '2026-10-12', source: 'Gym', activity: 'Cycling', minutes: 30 },
  }, { protocol: '2026-07-28' })
  assert.equal(called.res.status, 200, JSON.stringify(called.body))
  assert.equal(called.body.error, undefined)
  assert.notEqual(called.body.result.isError, true)
  assert.equal(audits.length, 1)
})
