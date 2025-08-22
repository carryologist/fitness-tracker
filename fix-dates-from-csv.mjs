import fs from 'fs/promises'

const PROD_BASE = process.env.PROD_BASE || 'https://fitness-tracker-one-sigma.vercel.app'
const ENDPOINT = `${PROD_BASE}/api/workouts`
const CSV_PATH = process.argv[2] || 'attachments/workouts.csv'
const COMMIT = process.argv.includes('--commit')

function parseLine(line) {
  const cols = line.split(',').map((s) => s.trim())
  const [DateStr = '', Source = '', Activity = '', Mins = '', Miles = '', Weight = ''] = cols
  return { DateStr, Source, Activity, Mins, Miles, Weight }
}

function normalizeDateFromCsv(mmddyy) {
  const m = mmddyy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!m) return null
  let [, mm, dd, yy] = m
  let year = yy.length === 2 ? parseInt(yy, 10) : parseInt(yy.slice(-2), 10)
  if (year === 28) year = 25
  const fullYear = 2000 + year
  return new Date(fullYear, parseInt(mm,10)-1, parseInt(dd,10)) // local date
}

function cleanRecord(r) {
  const date = normalizeDateFromCsv(r.DateStr)
  const minutes = Number.parseInt(r.Mins, 10)
  const miles = r.Miles ? Number.parseFloat(r.Miles) : null
  let weightLifted = r.Weight ? Number.parseFloat(r.Weight) : null
  let source = r.Source?.trim()
  let activity = r.Activity?.trim()
  if (!date || Number.isNaN(minutes) || minutes <= 0) return null
  if (source === 'Tonal' && activity === 'Cycling') activity = 'Weight Lifting'
  if (source === 'Cannondale' && /weight/i.test(activity)) activity = 'Cycling'
  if (source === 'Peloton' && weightLifted != null) activity = 'Cycling'
  if (source !== 'Tonal') weightLifted = null
  return { date, source, activity, minutes, miles, weightLifted }
}

function toIsoAtNoonUTC(d) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)).toISOString()
}

function keyForMatch(x) {
  const miles = x.miles == null ? '' : Math.round(x.miles * 100) / 100
  const weight = x.weightLifted == null ? '' : Math.round(x.weightLifted)
  return `${x.source}|${x.activity}|${x.minutes}|${miles}|${weight}`
}

async function main() {
  const raw = await fs.readFile(CSV_PATH, 'utf8')
  const lines = raw.trim().split(/\r?\n/)
  lines.shift()
  const csvCleaned = []
  for (const line of lines) {
    const c = cleanRecord(parseLine(line))
    if (c) csvCleaned.push(c)
  }

  const res = await fetch(ENDPOINT)
  if (!res.ok) throw new Error(`Failed to fetch workouts: ${res.status}`)
  const data = await res.json()
  const db = data.workouts.map(w => ({
    id: w.id,
    date: new Date(w.date),
    source: w.source,
    activity: w.activity,
    minutes: w.minutes,
    miles: w.miles == null ? null : Number(w.miles),
    weightLifted: w.weightLifted == null ? null : Number(w.weightLifted),
  }))

  // Build map of CSV rows by non-date key
  const index = new Map()
  for (const c of csvCleaned) {
    const k = keyForMatch(c)
    const arr = index.get(k) || []
    arr.push(c)
    index.set(k, arr)
  }

  // For each DB workout that has a matching CSV signature, set date to CSV date (closest if multiple)
  const fixes = []
  for (const w of db) {
    const k = keyForMatch(w)
    const arr = index.get(k)
    if (!arr || arr.length === 0) continue
    let best = arr[0]
    let bestDiff = Math.abs((w.date - arr[0].date) / 86400000)
    for (let i = 1; i < arr.length; i++) {
      const diff = Math.abs((w.date - arr[i].date) / 86400000)
      if (diff < bestDiff) { bestDiff = diff; best = arr[i] }
    }
    fixes.push({ db: w, expected: best })
  }

  console.log(`Will set ${fixes.length} workouts' dates to CSV noon UTC for consistency.`)
  if (!COMMIT) {
    console.log('Dry-run. Examples:')
    console.log(fixes.slice(0, 5).map(f => ({ id: f.db.id, from: f.db.date.toISOString(), to: toIsoAtNoonUTC(f.expected.date), key: keyForMatch(f.expected) })))
    console.log('Run with --commit to apply.')
    return
  }

  let ok = 0, fail = 0
  for (const f of fixes) {
    const body = {
      id: f.db.id,
      date: toIsoAtNoonUTC(f.expected.date),
      source: f.db.source,
      activity: f.db.activity,
      minutes: f.db.minutes,
      miles: f.db.miles,
      weightLifted: f.db.weightLifted,
      notes: null,
    }
    try {
      const r = await fetch(ENDPOINT, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      ok++
    } catch (e) {
      fail++
      console.error('Failed', f.db.id, e.message)
    }
    await new Promise(r => setTimeout(r, 150))
  }
  console.log(`Applied. Success: ${ok}, Failed: ${fail}`)
}

main().catch(e => { console.error(e); process.exit(1) })
