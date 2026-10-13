const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { create, act } = require('react-test-renderer')
function load(path, mocks = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } })
  const exports = {}
  vm.runInNewContext(outputText, { exports, require: name => mocks[name] ?? (name.startsWith('../utils/') ? load('src/utils/' + name.slice(9) + '.ts') :
    (name.startsWith('@/lib/workout-date') || name.startsWith('@/lib/calendar') || name.startsWith('@/lib/goal-input') || name.startsWith('@/utils/')
      ? load('src/' + name.slice(2) + '.ts') : require(name))),
    Date, Error, Request, Response, URL, console, process, ...globals }, { filename: path })
  return exports
}
const calendar = load('src/lib/calendar.ts')
const periods = load('src/utils/goalPeriods.ts')
const totals = load('src/utils/workoutTotals.ts')
const multipliers = load('src/utils/workoutMultipliers.ts')
const calculations = load('src/utils/goalCalculations.ts')
const session = (date, extra = {}) => ({ id: date, date: new Date(date), source: 'Cannondale', activity: 'Cycling', minutes: 40, miles: 10, ...extra })

test('workout day and server year boundaries use LA, including winter/summer and DST', () => {
  assert.equal(calendar.workoutDay(new Date('2027-01-01T07:59:59Z')), '2026-12-31')
  assert.equal(calendar.workoutDay(new Date('2027-01-01T08:00:00Z')), '2027-01-01')
  assert.equal(calendar.yearRange(2026).gte.toISOString(), '2026-01-01T08:00:00.000Z')
  assert.equal(calendar.yearRange(2026).lt.toISOString(), '2027-01-01T08:00:00.000Z')
  assert.equal(calendar.trackerMidnight('2026-07-01').toISOString(), '2026-07-01T07:00:00.000Z')
  assert.equal(calendar.trackerMidnight('2026-03-08').toISOString(), '2026-03-08T08:00:00.000Z')
  assert.equal(calendar.trackerMidnight('2026-03-09').toISOString(), '2026-03-09T07:00:00.000Z')
})

test('calendar-only measurement labels do not shift to the previous day across browser timezones', () => {
  const previous = process.env.TZ
  try {
    for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
      process.env.TZ = zone
      const display = calendar.measurementCalendarDate(new Date('2026-09-21T00:00:00Z'))
      assert.equal(display.getFullYear(), 2026)
      assert.equal(display.getMonth(), 8)
      assert.equal(display.getDate(), 21)
      assert.equal(calendar.workoutCalendarDate(new Date('2027-01-01T07:59:59Z')).getFullYear(), 2026)
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous }
})

test('quarter/year final day is included, next midnight excluded, and leap/DST day pacing stays finite', () => {
  const rows = [session('2026-04-01T06:59:59Z'), session('2026-04-01T07:00:00Z'), session('2025-12-31T23:00:00Z')]
  const q1 = periods.periodMetrics(rows, 2026, 1, new Date('2026-04-01T06:59:59Z'))
  assert.equal(q1.sessions, 1)
  assert.equal(q1.fraction, 1)
  assert.equal(q1.daysRemaining, 1)
  assert.equal(periods.periodMetrics([], 2024, 1, new Date('2024-03-01T08:00:00Z')).fraction, 61 / 91)
  assert.equal(periods.periodMetrics([], 2026, 1, new Date('2026-03-09T07:00:00Z')).fraction, 68 / 90)
  assert.equal(periods.selectedQuarter(2025, new Date('2026-10-13T16:00:00Z')), 4)
  assert.equal(periods.selectedQuarter(2027, new Date('2026-10-13T16:00:00Z')), 1)
  assert.equal(periods.periodMetrics([], 2027, 1, new Date('2026-10-13T16:00:00Z')).fraction, 0)
})

test('outdoor credits derive from original values once and preserve estimates and explicit zero', () => {
  const original = session('2026-10-12T12:00:00Z')
  const enhanced = multipliers.applyWorkoutMultipliers([original], 1.5)[0]
  assert.equal(totals.creditedMiles(enhanced), 15)
  assert.equal(totals.creditedMinutes(enhanced), 60)
  assert.equal(original.miles, 10)
  assert.equal(original.minutes, 40)
  assert.equal(multipliers.applyWorkoutMultipliers([enhanced], 1.5)[0].adjustedMiles, 15)
  assert.equal(totals.creditedMiles({ ...original, adjustedMiles: 0 }), 0)
  const estimated = multipliers.applyDefaultMileage([{ ...original, miles: undefined }], 18)
  assert.equal(multipliers.applyWorkoutMultipliers(estimated, 1.5)[0].adjustedMiles, 18)
})

test('goal calculation uses selected goal year and the same formula for every year', () => {
  for (const year of [2025, 2026, 2027]) {
    const goal = calculations.createGoal('Fitness', year, 1000000, 30, 4)
    assert.equal(goal.weeklyMinutesTarget, 120)
    assert.equal(goal.annualMinutesTarget, 6240)
    assert.equal(goal.quarterlyMinutesTarget, 1560)
  }
  const goal = calculations.createGoal('Fitness', 2025, 1000000, 30, 4)
  const enhanced = multipliers.applyWorkoutMultipliers([session('2025-12-31T20:00:00Z')])
  const result = calculations.calculateGoalProgress(goal, enhanced, new Date('2026-10-13T16:00:00Z'))
  assert.equal(result.currentYear, 2025)
  assert.equal(result.currentQuarter, 4)
  assert.equal(result.actualMinutes.yearToDate, 60)
  assert.equal(result.expectedMinutes.yearToDate, 6240)
  assert.equal(result.daysRemainingInQuarter, 0)
})

const chartNames = ['LineChart','Line','XAxis','YAxis','CartesianGrid','Tooltip','Legend','ResponsiveContainer']
const chartMocks = Object.fromEntries(chartNames.map(name => [name, props => React.createElement('div', props, props.children)]))
test('all chart views consume adjusted miles/minutes and an empty selected year is respected', async () => {
  const { ProgressChart } = load('src/components/ProgressChart.tsx', { recharts: chartMocks })
  const rows = multipliers.applyWorkoutMultipliers([session('2025-12-31T20:00:00Z')], 1.5)
  for (const viewMode of ['annual','monthly','custom']) {
    let renderer
    await act(async () => { renderer = create(React.createElement(ProgressChart, { sessions: rows,
      year: 2025, viewMode, selectedMonth: new Date(2025, 11, 1), selectedMonths: [new Date(2025, 11, 1)] })) })
    const data = renderer.root.findByType(chartMocks.LineChart).props.data
    assert.equal(data.reduce((sum, d) => sum + d.miles, 0), 15)
    assert.equal(data.reduce((sum, d) => sum + d.minutes, 0), 60)
    renderer.unmount()
  }
  let renderer
  await act(async () => { renderer = create(React.createElement(ProgressChart, { sessions: [], year: 2030 })) })
  const data = renderer.root.findByType(chartMocks.LineChart).props.data
  assert.equal(data.length, 12)
  assert.ok(data.every(d => d.label.includes('2030')))
  renderer.unmount()
})

function goalRoutes() {
  const rows = new Map()
  let tail = Promise.resolve()
  const goal = {
    create: async ({ data }) => { const row = { id: 'goal', ...data }; rows.set(row.id, row); return row },
    findUnique: async ({ where }) => rows.get(where.id) ?? null,
    update: async ({ where, data }) => { const row = { ...rows.get(where.id), ...data }; rows.set(where.id, row); return row },
  }
  const db = { goal, $transaction: async fn => {
    const wait = tail; let release; tail = new Promise(resolve => { release = resolve }); await wait
    try { return await fn({ goal, $executeRaw: async () => 1 }) } finally { release() }
  } }
  const route = load('src/app/api/goals/route.ts', { '@/lib/prisma': { default: db }, '@/lib/auth': { requireAuth: async () => null } })
  const call = (method, body) => route[method](new Request('http://localhost/api/goals', { method,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
  return { call, rows }
}
test('goal API partial and concurrent edits preserve omitted fields and recalculate valid targets', async () => {
  const { call } = goalRoutes()
  const created = await call('POST', { name: 'Fitness', year: 2026, annualWeightTarget: 1000000, minutesPerSession: 30, weeklySessionsTarget: 4 })
  assert.equal(created.status, 201)
  const renamed = await call('PUT', { id: 'goal', name: 'Renamed' })
  assert.equal(renamed.status, 200)
  assert.equal((await renamed.json()).goal.annualMinutesTarget, 6240)
  await Promise.all([call('PUT', { id: 'goal', minutesPerSession: 45 }), call('PUT', { id: 'goal', weeklySessionsTarget: 5 })])
  const final = await (await call('PUT', { id: 'goal', name: 'Final' })).json()
  assert.equal(final.goal.minutesPerSession, 45)
  assert.equal(final.goal.weeklySessionsTarget, 5)
  assert.equal(final.goal.weeklyMinutesTarget, 225)
  assert.equal((await call('PUT', { id: 'missing', name: 'Changed' })).status, 404)
  for (const patch of [{ year: 2026.5 }, { minutesPerSession: null }, { name: ' ' }, { weeklySessionsTarget: -1 }]) {
    assert.equal((await call('PUT', { id: 'goal', ...patch })).status, 400)
  }
})

test('goal modal resets between goals and reopening and previews the same targets it submits', async () => {
  const { GoalModal } = load('src/components/GoalModal.tsx', { '../utils/goalCalculations': calculations })
  const first = { id: 'one', ...calculations.createGoal('First', 2025, 1000000, 30, 4) }
  const second = { id: 'two', ...calculations.createGoal('Second', 2026, 800000, 60, 3) }
  const submitted = []
  const props = { isOpen: true, onClose: () => {}, onSubmit: goal => submitted.push(goal), existingGoal: first }
  let renderer
  await act(async () => { renderer = create(React.createElement(GoalModal, props)) })
  await act(async () => { renderer.root.findByProps({ id: 'goal-name' }).props.onChange({ target: { value: 'Unsaved' } }) })
  await act(async () => { renderer.update(React.createElement(GoalModal, { ...props, existingGoal: second })) })
  assert.equal(renderer.root.findByProps({ id: 'goal-name' }).props.value, 'Second')
  await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
  assert.equal(submitted[0].weeklyMinutesTarget, 180)
  assert.equal(submitted[0].quarterlyMinutesTarget, 2340)
  await act(async () => { renderer.update(React.createElement(GoalModal, { ...props, isOpen: false })) })
  await act(async () => { renderer.update(React.createElement(GoalModal, { ...props, existingGoal: undefined, defaultYear: 2027 })) })
  assert.equal(renderer.root.findByProps({ id: 'goal-year' }).props.value, 2027)
  assert.equal(renderer.root.findByProps({ id: 'goal-name' }).props.value, '')
  renderer.unmount()
})

function text(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (!node) return ''
  return (node.children ?? []).map(text).join(' ')
}
test('monthly and overall summaries agree on outdoor credits; history sorts the displayed values', async () => {
  const rows = multipliers.applyWorkoutMultipliers([
    session('2026-10-12T15:00:00Z'), session('2026-10-13T15:00:00Z', { source: 'Peloton', miles: 13, minutes: 50 }),
  ])
  const goals = { quarterly: { sessions: 13, minutes: 1000, weight: 1000 }, annual: { sessions: 52, minutes: 4000, weight: 4000 } }
  const { MonthlySummary } = load('src/components/MonthlySummary.tsx')
  let monthly, summary, table
  await act(async () => { monthly = create(React.createElement(MonthlySummary, { sessions: rows })) })
  const october = monthly.root.findByType('tbody').findAllByType('tr')[9]
  const cells = october.findAllByType('td')
  assert.equal(text(cells[2]), '110')
  assert.equal(Number(text(cells[3])), 28)
  const { WorkoutSummary } = load('src/components/WorkoutSummary.tsx')
  await act(async () => { summary = create(React.createElement(WorkoutSummary, { sessions: rows, goals, year: 2026 })) })
  assert.ok(text(summary.toJSON()).includes('110'))
  assert.ok(text(summary.toJSON()).includes('28'))
  assert.match(text(summary.toJSON()), /15\.0\s+mi/)
  const { WorkoutTable } = load('src/components/WorkoutTable.tsx')
  await act(async () => { table = create(React.createElement(WorkoutTable, { sessions: rows })) })
  await act(async () => { table.root.findByProps({ 'aria-label': 'Sort by miles' }).props.onClick() })
  const history = table.root.findByType('tbody').findAllByType('tr')
  assert.equal(text(history[0].findAllByType('td')[1]), 'Peloton')
  assert.equal(text(history[1].findAllByType('td')[1]), 'Cannondale')
  monthly.unmount(); summary.unmount(); table.unmount()
})

test('goal tracker selects a historical year and never renders NaN with zero targets', async () => {
  const { GoalTracker } = load('src/components/GoalTracker.tsx')
  const zero = { sessions: 0, minutes: 0, weight: 0 }
  let renderer
  await act(async () => { renderer = create(React.createElement(GoalTracker, { sessions: [], year: 2025, goals: { quarterly: zero, annual: zero } })) })
  assert.ok(text(renderer.toJSON()).includes('Q4 Goal Progress'))
  const annual = renderer.root.findAllByType('button').find(button => text(button).includes('Annual'))
  await act(async () => { annual.props.onClick() })
  assert.ok(text(renderer.toJSON()).includes('2025 Goal Progress'))
  assert.equal(/NaN|Infinity/.test(text(renderer.toJSON())), false)
  renderer.unmount()
})

test('REST workout year filter uses the same inclusive/exclusive boundaries as the dashboard', async () => {
  let where
  const route = load('src/app/api/workouts/route.ts', {
    '@/lib/prisma': { default: { workoutSession: { findMany: async args => { where = args.where; return [] } } } },
    '@/lib/auth': { requireAuth: async () => null }, '@/lib/audit-log': { logAudit: async () => {} },
  })
  assert.equal((await route.GET(new Request('http://localhost/api/workouts?year=2026'))).status, 200)
  assert.equal(where.date.gte.toISOString(), '2026-01-01T08:00:00.000Z')
  assert.equal(where.date.lt.toISOString(), '2027-01-01T08:00:00.000Z')
  assert.equal((await route.GET(new Request('http://localhost/api/workouts?year=2026foo'))).status, 400)
})

test('measurement range API validates calendar days and includes the requested final day', async () => {
  let where
  const route = load('src/app/api/body-measurements/route.ts', {
    '@/lib/prisma': { default: { bodyMeasurement: { findMany: async args => { where = args.where; return [] } } } },
    '@/lib/auth': { requireAuth: async () => null },
  })
  assert.equal((await route.GET(new Request('http://localhost/api/body-measurements?from=2026-09-01&to=2026-09-21'))).status, 200)
  assert.equal(where.date.lte.toISOString(), '2026-09-21T00:00:00.000Z')
  for (const query of ['from=2026-02-30','from=nope','from=2026-09-22&to=2026-09-21']) {
    assert.equal((await route.GET(new Request('http://localhost/api/body-measurements?' + query))).status, 400)
  }
})

test('OCR calendar dates are stable and reject rollover dates', () => {
  const { parseTonalOCR } = load('src/utils/tonalOCR.ts')
  assert.equal(parseTonalOCR('Tonal Workout\n9/21/26').date.toISOString(), '2026-09-21T12:00:00.000Z')
  assert.equal(parseTonalOCR('Tonal Workout\n2/30/26').date, null)
})

test('clearing a numeric goal input does not render NaN and cannot save invalid targets', async () => {
  const { GoalModal } = load('src/components/GoalModal.tsx', { '../utils/goalCalculations': calculations })
  let saves = 0, renderer
  await act(async () => { renderer = create(React.createElement(GoalModal, { isOpen: true, onClose: () => {},
    existingGoal: { id: 'goal', ...calculations.createGoal('Fitness', 2026, 1000000, 30, 4) }, onSubmit: () => saves++ })) })
  await act(async () => { renderer.root.findByProps({ id: 'goal-minutes-per-session' }).props.onChange({ target: { value: '' } }) })
  assert.equal(renderer.root.findByProps({ id: 'goal-minutes-per-session' }).props.value, '')
  assert.equal(text(renderer.toJSON()).includes('NaN'), false)
  await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
  assert.equal(saves, 0)
  assert.ok(renderer.root.findByProps({ role: 'alert' }))
  renderer.unmount()
})
