# Fitness Tracker

Personal fitness tracking application with workout logging, goal setting, progress visualization, and Peloton + Tonal integration.

## Features

- 📊 **Workout Tracking** - Log workouts with minutes, miles, and weight lifted
- 🎯 **Goal Setting** - Set and track annual fitness goals
- 📈 **Progress Charts** - Visualize your progress over time
- 🚴 **Peloton Integration** - Automatically sync indoor and outdoor rides from Peloton
- 🏋️ **Tonal Integration** - Automatically sync weight lifting sessions with volume data from Tonal
- 🎨 **Dark Mode** - Beautiful dark/light theme support
- 🔒 **Secure Authentication** - Google OAuth login
- 🤖 **MCP Server** - Talk to your fitness data from Claude Desktop, Codex, OpenClaw, and any other MCP-aware AI agent

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Vercel Postgres)
- **Authentication**: NextAuth.js v5 with Google OAuth
- **Charts**: Recharts
- **Forms**: react-hook-form with Zod validation

## Getting Started

### Prerequisites

- Node.js 20.9+ and npm
- PostgreSQL database (or Vercel Postgres)
- Google OAuth credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd fitness-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Fill in the required values in `.env.local`:
   ```env
   # Database
   POSTGRES_PRISMA_URL="postgresql://..."
   POSTGRES_URL_NON_POOLING="postgresql://..."
   
   # NextAuth.js
   NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Google OAuth (see setup instructions below)
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   
   # Optional: Restrict to single user
   ALLOWED_EMAIL="your-email@example.com"

   # Personal access token for the MCP server and Bearer-token API access.
   # Generate with: openssl rand -hex 32  (must be >= 16 chars)
   MCP_API_TOKEN="<32+ random hex chars>"
   ```

4. **Set up Google OAuth** (see detailed instructions below)

5. **Set up the database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Authentication Setup

### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API** (or Google Identity)
4. Navigate to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth 2.0 Client ID**
6. Configure consent screen:
   - User Type: External
   - Add your email as test user
   - Scopes: `email`, `profile`, `openid`
7. Create OAuth Client ID:
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)
8. Copy **Client ID** and **Client Secret** to `.env.local`

### Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Add the output to `NEXTAUTH_SECRET` in `.env.local`

### Single-User Mode (Optional)

To restrict access to only your Google account, set:
```env
ALLOWED_EMAIL="your-email@example.com"
```

## Agent Access (MCP Server)

The app exposes a [Model Context Protocol](https://modelcontextprotocol.io) server at `/api/mcp/mcp` so AI agents (Claude Desktop, Codex, OpenClaw, Cursor, etc.) can read your workout data, log new workouts, and trigger Peloton / Tonal syncs.

### Setup

1. Generate a token and add it to your env:
   ```bash
   openssl rand -hex 32
   ```
   ```env
   MCP_API_TOKEN="<paste the hex string here>"
   ```
   Set the same value in Vercel project settings for production. The token must be at least 16 characters.

2. Point an MCP client at the endpoint. Example client config (Claude Desktop `claude_desktop_config.json`, Codex `~/.codex/config.toml`, OpenClaw, etc.):
   ```json
   {
     "mcpServers": {
       "fitness-tracker": {
         "type": "http",
         "url": "https://<your-app>.vercel.app/api/mcp/mcp",
         "headers": { "Authorization": "Bearer <MCP_API_TOKEN>" }
       }
     }
   }
   ```

### Tools exposed

All tools return raw rows (no precomputed aggregates) so the agent can do its own analysis.

- `list_workouts` — filter by year / source / activity / since / limit
- `get_workout` — fetch one row by ID
- `create_workout`, `update_workout`, `delete_workout` — full CRUD on manual entries
- `list_goals` — annual targets + derived weekly / quarterly values
- `peloton_status`, `sync_peloton` — check connection, pull new workouts
- `tonal_status`, `sync_tonal` — same for Tonal

### REST API with the same token

`MCP_API_TOKEN` also works as a personal access token for the existing REST routes. Send `Authorization: Bearer $MCP_API_TOKEN` instead of a session cookie:

```bash
curl -H "Authorization: Bearer $MCP_API_TOKEN" \
     https://<your-app>.vercel.app/api/workouts?year=2025
```

## Peloton & Tonal Integration (Optional)

Both integrations use email/password authentication (no OAuth redirect flow).

Add to `.env.local`:
```env
# Peloton (session-cookie auth)
PELOTON_EMAIL="your-peloton-email"
PELOTON_PASSWORD="your-peloton-password"

# Tonal (Auth0 password grant)
TONAL_EMAIL="your-tonal-email"
TONAL_PASSWORD="your-tonal-password"
```

Connect each service from the dashboard.

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint

npx prisma studio    # Open Prisma Studio (database GUI)
npx prisma migrate dev --name <name>  # Create migration
```

## Database Schema

- **WorkoutSession** - Individual workout records
- **Goal** - Annual fitness goals
- **PelotonCredential** - Session credentials for Peloton integration
- **TonalCredential** - Auth credentials for Tonal integration

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # NextAuth.js handlers
│   │   ├── workouts/     # Workout CRUD
│   │   ├── goals/        # Goal CRUD
│   │   ├── peloton/      # Peloton integration
│   │   ├── tonal/        # Tonal integration
│   │   └── mcp/          # MCP server for AI agents
│   ├── login/            # Sign-in page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Dashboard page
├── components/           # React components
├── lib/                  # Utilities and helpers
├── types/                # TypeScript types
└── utils/                # Helper functions
prisma/
└── schema.prisma         # Database schema
auth.ts                   # NextAuth.js configuration
middleware.ts             # Route protection
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

Make sure to:
- Update `NEXTAUTH_URL` to your production URL
- Add production callback URL to Google OAuth settings
- Set `NEXTAUTH_SECRET` (different from local)

## Security

### Auth model

- Two equivalent paths to authenticate any `/api/*` request:
  - A NextAuth Google session cookie (set by `/login`), OR
  - `Authorization: Bearer $MCP_API_TOKEN` (for MCP clients and scripts)
- Middleware is the first gate; route handlers re-verify with
  `requireAuth(request)` and return 401 when both paths fail
  (defence-in-depth — F-01 in the security report).
- `/login` and `/api/auth/*` are the only un-authed paths.

### `MCP_API_TOKEN` is a global admin credential

This app is single-tenant by design — `ALLOWED_EMAIL` gates the one
human user, and the data model has no per-user partitioning. That means
`MCP_API_TOKEN` unlocks **everything**: read, write, delete, sync,
disconnect credentials. Treat it like the database password:

- Generate with `openssl rand -hex 32` (≥16 chars enforced; 32+ recommended).
- Store only in Vercel project env vars; never commit, never share in DMs.
- Rotate by:
  1. Generate a new value, set `MCP_API_TOKEN` on Vercel (preview + prod).
  2. Update Claude Desktop / Codex / Cursor configs with the new value.
  3. Redeploy. Old token stops working on the next cold start.
- An audit row is written for every bearer-authed mutation; review
  the `audit_log` table after suspected exposure.

### At-rest protections

- Sessions use JWT for serverless compatibility; session cookies are
  `HttpOnly`, `SameSite=Lax`, `Secure` in production, with the
  `__Secure-` prefix in production.
- Optional single-user restriction via `ALLOWED_EMAIL`. When unset,
  all sign-ins are denied (fail-closed).
- Peloton and Tonal credentials (session IDs, OAuth tokens) are
  encrypted column-side with AES-256-GCM via `CREDENTIAL_ENC_KEY`
  (set to 64 hex chars — `openssl rand -hex 32`). Legacy plaintext
  rows remain readable; they re-encrypt on the next token refresh.
- REST and MCP workout deletion set `deletedAt`, preserving the record and
  external workout IDs so later syncs do not recreate deleted workouts.
- Free-weight summaries remain recoverable after refresh until successfully
  saved or explicitly discarded. Retries use a stable `Idempotency-Key` UUID
  on `/api/workouts` to avoid duplicate entries after a lost response.
- Renpho tokens use the same encryption. Production credential writes
  fail if `CREDENTIAL_ENC_KEY` is missing or malformed. Development may
  omit the key; a configured invalid key always fails. Keep your existing
  key when upgrading—generating a replacement will not decrypt old rows.

To encrypt existing plaintext credentials, install dependencies with
`npm ci`, then populate `.env.local` with the database URLs and the
**existing** `CREDENTIAL_ENC_KEY`. If no key has ever been configured and
all rows are plaintext, generate one and configure that same key in both
`.env.local` and the production environment. Keep this file out of version control.
Review counts before applying:

```bash
npm run credentials:encrypt
npm run credentials:encrypt -- --apply
npm run credentials:encrypt
```

The default is a dry run. Apply encrypts legacy Peloton, Tonal, and Renpho
credential columns, leaves nulls and encrypted values intact, and checks
existing ciphertext with the configured key before any writes. Output
contains counts only. Rows changed by a concurrent credential refresh are
skipped; rerun if needed. The last dry run should report zero pending rows.

The MCP server now uses SDK v2 with stateless HTTP and compatibility for
2025-era Streamable HTTP clients. Its endpoint and bearer token stay the
same; the legacy HTTP+SSE transport remains unsupported.

### Transport + browser hardening

- HSTS (`max-age=63072000; includeSubDomains; preload`) in production.
- Baseline Content-Security-Policy in `next.config.ts`.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` disabling camera/mic/geo.
- CORS on `/api/mcp` is allow-listed to `APP_BASE_URL`, `VERCEL_URL`,
  and (in dev only) `localhost`. Any other origin gets no
  `Access-Control-*` headers, so browser cross-origin calls fail.

### Rate limiting + audit

- In-memory token-bucket rate limit on `/api/mcp` (120/min general,
  ~10/min for sync-shaped calls). Process-local — upgrade to Vercel
  KV / Upstash for distributed limits if traffic grows.
- `audit_log` table records every bearer-authed mutation, sync run,
  and credential disconnect with actor, action, IP, and JSON details.

### Reporting

If you find a security issue, open a private advisory on GitHub
rather than a public issue.

## License

MIT

## Contributing

This is a personal project, but feel free to fork and adapt for your own use!


### Integration sync safeguards

Peloton and Tonal inspect the requested number of recent workouts (1–2000,
default 200), including later pages when the first page is already synced.
All upstream integration requests time out after 15 seconds. Renpho aborts
repeated pages or histories exceeding 1000 pages per endpoint/table instead
of reporting incomplete data as a successful sync.

Workout sync writes use short PostgreSQL transactions with a shared transaction-scoped
advisory lock. Renpho batches use a separate measurement lock. External ID checks happen again inside the lock, so overlapping
sync calls cannot create the same imported workout twice. Renpho daily writes
and multi-row strength-workout merges use the same transaction helper. Network requests
remain outside these transactions; previously committed items remain saved if
a later item fails, and retries skip them.

Automatic linking requires a unique candidate with the same activity and start
times within 10 minutes. Manual matches also require durations within three
minutes or 10 percent. Peloton/Tonal echoes require the generic Traditional
Strength Training title and at least 50 percent overlap of the shorter session.
Date-only manual entries (including historical midnight and UTC-noon values),
ambiguous matches, and already-linked sessions are kept separate. This can
leave apparent duplicates for manual review, while preserving distinct sessions.


### Calendar days, goal periods, and outdoor credit

Timestamped workouts use America/Los_Angeles calendar days throughout the
UI, REST year filters, MCP year filters, and goal progress. Date-only manual
and screenshot entries use UTC noon to preserve the entered calendar date.
Quarter and year ranges include the full final day and exclude the next
period's midnight. Selecting a past year shows Q4; selecting a future year
shows Q1, with expected progress clamped to zero before the period and full
progress after it. The year selector includes historical data/goals and the
next year; empty-year charts still display the selected year.

Renpho measurement dates retain their existing UTC calendar-day buckets.
They are displayed as day labels, not converted to local timestamps. Sync
mapping now explicitly uses UTC rather than the runtime timezone. This fixes
the previous-day display without rekeying historical measurements; it does
not regroup measurements by Los Angeles weigh-in time.

The configured Cannondale outdoor bonus is used consistently for credited
miles and minutes in every chart view, monthly/annual summaries, workout
history display and sorting, and minute-based goal progress/pacing. Original
miles and minutes remain stored unchanged and are used for editing, API/MCP
responses, and bonus tooltips. Highest Credited Miles is a credited-distance
record, not a physical-distance record. Missing cycling mileage continues to
use the configured default speed before the outdoor bonus is applied.

Goal targets now always derive from minutes per session × sessions per week,
with 52 weeks per year and 13 weeks per quarter, including 2026. The goal form
preview and server use the same calculation. Partial goal updates merge with
stored base fields under a row lock, validate finite numeric/integer bounds,
and recalculate targets. Existing goals are not rewritten until edited.


### Sync performance and API safeguards

Renpho still fetches both complete histories, with at most two upstream
requests in flight (one per endpoint). Composition records retain precedence
when IDs overlap. Unchanged history uses one bulk database comparison and
no transactions or writes. Changed days are rechecked under a dedicated
measurement lock, inserted with createMany, and updated in batches of up to
100 using bound JSON parameters. Omitted optional metrics are retained.
The workout lock remains separate so a Renpho import does not block strength
merges. A failed batch rolls back; earlier completed batches remain saved.
The response/log includes auth, fetch, database, and total durations in
milliseconds; the health banner displays completion time. Actual production
speed still depends on Renpho and database latency.

Connection-status GETs read cached credentials without refreshing them. Tonal
reports disconnected when an expired credential has no refresh token.
Renpho prefers the most recently obtained stored credential. Bearer requests
skip session work. Peloton strength imports skip unnecessary distance-summary
requests; Tonal skips detail requests for zero-volume ghosts/deleted records
and uses indexed page lookups. Screenshot batches reuse one OCR worker and
terminate it afterward. Worker/core assets are served locally from pinned
installed dependencies; only English trained data downloads from the specific
jsDelivr package path. CSP permits same-origin workers and WebAssembly compilation,
without enabling general JavaScript unsafe-eval or third-party worker scripts.

All authenticated REST mutations share a 60/minute bucket; integration login
has 5/minute and sync/diagnostic calls 10/minute. MCP read traffic has its own
120/minute bucket, and only mutating/sync tools consume their respective
budgets, before writing. These are bounded process-local safeguards, not a
distributed quota across Vercel instances. Success audits cover workouts,
goals, free-weight settings, imports, integration auth/disconnects, and syncs;
failed integration auth attempts are recorded without credential payloads.

### Explicit database migrations

Builds now generate the Prisma client and local OCR assets, then build Next.js.
They do not connect to or change a database. CI runs unit tests, lint, and this
build without production database credentials. It also runs `npm run test:postgres`
against an isolated PostgreSQL service to verify Prisma's sync locks. To run
those checks locally, set `TEST_POSTGRES_URL` to a disposable test database;
the suite uses advisory locks and does not need application tables.
New databases use `npm run db:migrate`;
future schema changes use `npm run db:migrate:dev -- --name <name>` in development.
Run reviewed migrations explicitly against the intended environment before
releasing code that depends on them.

The initial migration records the existing schema; this PR needs no schema
change on an existing deployment. Existing databases created by db push must
be baselined once before using migrate deploy. With credentials configured for
the intended environment, first verify there is no schema drift:

```bash
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
```

Only after that exits 0, record the baseline without running its CREATE TABLEs:

```bash
npx prisma migrate resolve --applied 20261013000000_baseline
npm run db:migrate
```

If the diff exits 2, review and reconcile the drift first. Do not execute the
baseline SQL directly against a populated database. No production baseline
or migration is run automatically by this PR.
