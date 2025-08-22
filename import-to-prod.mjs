import fs from 'fs/promises';

const PROD_BASE = process.env.PROD_BASE || 'https://fitness-tracker-one-sigma.vercel.app';
const ENDPOINT = `${PROD_BASE}/api/workouts`;
const COMMIT = process.argv.includes('--commit');
const CSV_PATH = process.argv[2];

if (!CSV_PATH) {
  console.error('Usage: node import-to-prod.mjs <path-to-csv> [--commit]');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseLine(line) {
  const cols = line.split(',').map((s) => s.trim());
  const [DateStr = '', Source = '', Activity = '', Mins = '', Miles = '', Weight = ''] = cols;
  return { DateStr, Source, Activity, Mins, Miles, Weight };
}

function normalizeDate(mmddyy) {
  const m = mmddyy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, mm, dd, yy] = m;
  let year = yy.length === 2 ? parseInt(yy, 10) : parseInt(yy.slice(-2), 10);
  if (year === 28) year = 25; // fix typo
  const fullYear = 2000 + year;
  const m2 = mm.padStart(2, '0');
  const d2 = dd.padStart(2, '0');
  return new Date(`${fullYear}-${m2}-${d2}T00:00:00.000Z`).toISOString();
}

function cleanRecord(r) {
  const date = normalizeDate(r.DateStr);
  const minutes = Number.parseInt(r.Mins, 10);
  const miles = r.Miles ? Number.parseFloat(r.Miles) : null;
  let weightLifted = r.Weight ? Number.parseFloat(r.Weight) : null;
  let source = r.Source?.trim();
  let activity = r.Activity?.trim();

  if (!date || Number.isNaN(minutes) || minutes <= 0) return null;

  if (source === 'Tonal' && activity === 'Cycling') activity = 'Weight Lifting';
  if (source === 'Cannondale' && /weight/i.test(activity)) activity = 'Cycling';
  if (source === 'Peloton' && weightLifted != null) activity = 'Cycling';

  if (source !== 'Tonal') weightLifted = null;

  return { date, source, activity, minutes, miles, weightLifted, notes: null };
}

function hash(w) {
  return `${w.date}|${w.source}|${w.activity}|${w.minutes}|${w.miles ?? ''}|${w.weightLifted ?? ''}`;
}

const raw = await fs.readFile(CSV_PATH, 'utf8');
const lines = raw.trim().split(/\r?\n/);
lines.shift(); // header

const cleaned = [];
const seen = new Set();
for (let i = 0; i < lines.length; i++) {
  const rec = cleanRecord(parseLine(lines[i]));
  if (!rec) continue;
  const h = hash(rec);
  if (seen.has(h)) continue;
  seen.add(h);
  cleaned.push(rec);
}

console.log(`Prepared ${cleaned.length} records after cleaning/dedup (${lines.length} input rows).`);
if (!COMMIT) {
  console.log('Dry-run only. Pass --commit to import to production.');
  console.log('Sample:', cleaned[0]);
  process.exit(0);
}

let ok = 0, fail = 0;
for (const w of cleaned) {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(w),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    ok++;
  } catch (e) {
    fail++;
    console.error('Failed:', w, e.message);
  }
  await sleep(200); // ~5 req/s
}
console.log(`Import complete. Success: ${ok}, Failed: ${fail}`);

